import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole, requireRole } from "@/lib/session";
import { UNIT_STATUS } from "@/lib/auth";

// GET /api/units?gradeId=&subjectId=&term=&status=&createdById=
export async function GET(req: NextRequest) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { url } = req;
  const { searchParams } = new URL(url);
  const gradeId = searchParams.get("gradeId");
  const subjectId = searchParams.get("subjectId");
  const term = searchParams.get("term");
  const status = searchParams.get("status");
  const createdById = searchParams.get("createdById");

  const role = session.payload.role;
  // Teachers only see their own units
  const where: Record<string, unknown> = {};
  if (role === "Teacher") {
    where.createdById = session.payload.userId;
  } else if (createdById) {
    where.createdById = createdById;
  }
  if (gradeId) where.gradeId = gradeId;
  if (subjectId) where.subjectId = subjectId;
  if (term) where.term = term;
  if (status) where.status = status;

  const units = await db.unit.findMany({
    where,
    include: {
      grade: true,
      subject: true,
      createdBy: { select: { id: true, name: true, username: true } },
    },
    orderBy: [{ grade: { gradeNumber: "asc" } }, { subject: { name: "asc" } }, { term: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ units });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, "Teacher");
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });

  const body = await req.json();
  const { gradeId, subjectId, term, unitName, topics, learningObjectives, status } = body;
  if (!gradeId || !subjectId || !term || !unitName || !topics) {
    return NextResponse.json(
      { error: "Grade, subject, term, unit name and topics are required" },
      { status: 400 }
    );
  }
  // Ensure teacher is assigned to this grade+subject for active academic year
  const ay = await db.academicYear.findFirst({ where: { active: true } });
  if (!ay) return NextResponse.json({ error: "No active academic year" }, { status: 400 });

  const assignment = await db.teacherAssignment.findUnique({
    where: {
      teacherId_gradeId_subjectId_academicYearId: {
        teacherId: session.payload.userId,
        gradeId,
        subjectId,
        academicYearId: ay.id,
      },
    },
  });
  if (!assignment) {
    return NextResponse.json(
      { error: "You are not assigned to this grade/subject" },
      { status: 403 }
    );
  }

  try {
    const unit = await db.unit.create({
      data: {
        gradeId,
        subjectId,
        academicYearId: ay.id,
        term,
        unitName: unitName.trim(),
        topics: topics.trim(),
        learningObjectives: learningObjectives?.trim() || null,
        status: status === UNIT_STATUS.SUBMITTED ? UNIT_STATUS.SUBMITTED : UNIT_STATUS.DRAFT,
        createdById: session.payload.userId,
      },
      include: { grade: true, subject: true, createdBy: { select: { name: true } } },
    });
    await db.auditLog.create({
      data: { actorId: session.payload.userId, action: "UNIT_CREATE", detail: `Created unit "${unit.unitName}" (${unit.grade.displayName} / ${unit.subject.name} / ${term})` },
    });
    return NextResponse.json({ unit }, { status: 201 });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("UNIQUE")) {
      return NextResponse.json(
        { error: "A unit with this name already exists for this grade/subject/term" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to create unit: " + msg }, { status: 500 });
  }
}
