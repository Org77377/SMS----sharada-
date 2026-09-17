import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole } from "@/lib/session";
import { UNIT_STATUS, ROLES } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Any submission-eligible role can submit their own units
  const submissionRoles = [ROLES.TEACHER, ROLES.HOD, ROLES.EXAM_COORDINATOR, ROLES.PRINCIPAL];
  if (!submissionRoles.includes(session.payload.role as typeof submissionRoles[number]))
    return NextResponse.json({ error: "You cannot submit syllabus" }, { status: 403 });
  const { id } = await params;
  const unit = await db.unit.findUnique({ where: { id } });
  if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });
  if (unit.createdById !== session.payload.userId)
    return NextResponse.json({ error: "Not your unit" }, { status: 403 });
  if (unit.status === UNIT_STATUS.APPROVED)
    return NextResponse.json({ error: "Already approved" }, { status: 400 });

  const updated = await db.unit.update({
    where: { id },
    data: { status: UNIT_STATUS.SUBMITTED, feedback: null },
    include: { grade: true, subject: true, createdBy: { select: { name: true } } },
  });
  await db.auditLog.create({
    data: { actorId: session.payload.userId, action: "UNIT_SUBMIT", detail: `Submitted unit "${unit.unitName}"` },
  });

  // Notify reviewers: the HOD of the subject's department (if any),
  // all Exam Coordinators, and the Principal.
  const subject = await db.subject.findUnique({
    where: { id: unit.subjectId },
    select: { departmentId: true },
  });
  // Build an OR filter: Exam Coordinator + Principal always notified;
  // HOD only if they belong to the subject's department (or any HOD if
  // the subject has no department assigned yet).
  const orConditions: { role: { name: string }; departmentId?: string | null }[] = [
    { role: { name: ROLES.EXAM_COORDINATOR } },
    { role: { name: ROLES.PRINCIPAL } },
  ];
  if (subject?.departmentId) {
    orConditions.push({ role: { name: ROLES.HOD }, departmentId: subject.departmentId });
  } else {
    orConditions.push({ role: { name: ROLES.HOD } });
  }
  const reviewers = await db.user.findMany({
    where: { OR: orConditions, active: true },
  });
  if (reviewers.length > 0) {
    await db.notification.createMany({
      data: reviewers.map((r) => ({
        senderId: session.payload.userId,
        recipientId: r.id,
        title: "New syllabus submission",
        message: `${session.payload.name} submitted "${unit.unitName}" for review.`,
      })),
    });
  }
  return NextResponse.json({ unit: updated });
}
