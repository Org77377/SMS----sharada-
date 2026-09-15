import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole, requireRole } from "@/lib/session";
import { ROLES } from "@/lib/auth";

export async function GET() {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.SUPERADMIN, ROLES.PRINCIPAL, ROLES.COORDINATOR);
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
  const { teacherId, gradeId, subjectId, academicYearId } = body;
  if (!teacherId || !gradeId || !subjectId || !academicYearId) {
    return NextResponse.json({ error: "teacherId, gradeId, subjectId, academicYearId required" }, { status: 400 });
  }
  try {
    const a = await db.teacherAssignment.create({
      data: { teacherId, gradeId, subjectId, academicYearId },
      include: { teacher: { select: { name: true } }, grade: true, subject: true },
    });
    await db.auditLog.create({
      data: { actorId: session.payload.userId, action: "ASSIGN_CREATE", detail: `Assigned ${a.teacher.name} → ${a.grade.displayName}/${a.subject.name}` },
    });
    return NextResponse.json({ assignment: a }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Assignment already exists or invalid: " + (e as Error).message }, { status: 409 });
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
