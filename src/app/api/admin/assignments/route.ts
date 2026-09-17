import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole, requireRole } from "@/lib/session";
import { ROLES, REVIEWER_ROLES } from "@/lib/auth";

export async function GET() {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.SUPERADMIN, ROLES.PRINCIPAL, ...REVIEWER_ROLES);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });
  const ay = await db.academicYear.findFirst({ where: { active: true } });
  const where = ay ? { academicYearId: ay.id } : {};
  const assignments = await db.teacherAssignment.findMany({
    where,
    include: { teacher: { select: { id: true, name: true, username: true } }, grade: true, subject: true, academicYear: true },
    orderBy: [{ teacher: { name: "asc" } }, { grade: { gradeNumber: "asc" } }],
  });
  return NextResponse.json({ assignments, academicYear: ay });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.SUPERADMIN);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });
  const body = await req.json();
  const { teacherId, subjectId, academicYearId } = body;
  // Accept either a single gradeId (legacy) or a gradeIds array (multi-grade).
  // Normalize to an array.
  let gradeIds: string[] = [];
  if (Array.isArray(body.gradeIds)) {
    gradeIds = body.gradeIds.filter((g: unknown) => typeof g === "string" && g);
  } else if (body.gradeId) {
    gradeIds = [body.gradeId];
  }
  if (!teacherId || gradeIds.length === 0 || !subjectId || !academicYearId) {
    return NextResponse.json(
      { error: "teacherId, gradeIds (or gradeId), subjectId, academicYearId required" },
      { status: 400 }
    );
  }
  try {
    // Create all assignments; skip duplicates (ones that already exist for
    // the same teacher+grade+subject+year) so re-running is idempotent.
    // We loop with create() + catch instead of createMany({skipDuplicates})
    // because skipDuplicates is not supported on all Prisma providers.
    let created = 0;
    for (const gradeId of gradeIds) {
      try {
        await db.teacherAssignment.create({
          data: { teacherId, gradeId, subjectId, academicYearId },
        });
        created++;
      } catch {
        // duplicate (compound unique constraint) — skip silently
      }
    }
    // Load the staff member + grade names for the audit log
    const teacher = await db.user.findUnique({ where: { id: teacherId }, select: { name: true } });
    const gradeRecords = await db.grade.findMany({
      where: { id: { in: gradeIds } },
      select: { displayName: true },
      orderBy: { gradeNumber: "asc" },
    });
    const gradeNames = gradeRecords.map((g) => g.displayName).join(", ");
    await db.auditLog.create({
      data: {
        actorId: session.payload.userId,
        action: "ASSIGN_CREATE",
        detail: `Assigned ${teacher?.name ?? teacherId} → ${gradeNames} / ${created} new assignment(s)`,
      },
    });
    return NextResponse.json(
      { created, requested: gradeIds.length },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json({ error: "Failed to create assignments: " + (e as Error).message }, { status: 409 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.SUPERADMIN);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.teacherAssignment.delete({ where: { id } });
  await db.auditLog.create({
    data: { actorId: session.payload.userId, action: "ASSIGN_DELETE", detail: `Removed assignment ${id}` },
  });
  return NextResponse.json({ ok: true });
}
