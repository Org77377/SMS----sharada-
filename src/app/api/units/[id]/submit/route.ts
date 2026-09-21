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

  // HODs, Exam Coordinators, Principals → auto-approve on submit (no waiting).
  // Teachers → SUBMITTED (awaits review).
  const isAutoApprove = session.payload.role !== ROLES.TEACHER;
  const newStatus = isAutoApprove ? UNIT_STATUS.APPROVED : UNIT_STATUS.SUBMITTED;

  const updated = await db.unit.update({
    where: { id },
    data: { status: newStatus, feedback: null },
    include: { grade: true, subject: true, createdBy: { select: { name: true } } },
  });
  await db.auditLog.create({
    data: {
      actorId: session.payload.userId,
      action: isAutoApprove ? "UNIT_AUTO_APPROVE" : "UNIT_SUBMIT",
      detail: `${isAutoApprove ? "Auto-approved" : "Submitted"} unit "${unit.unitName}"`,
    },
  });

  // Only notify reviewers when a TEACHER submits (HOD/EC/Principal auto-approve)
  if (!isAutoApprove) {
    const subject = await db.subject.findUnique({
      where: { id: unit.subjectId },
      select: { departmentId: true },
    });
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
  } else {
    // Notify the submitter that their unit was auto-approved
    await db.notification.create({
      data: {
        senderId: session.payload.userId,
        recipientId: session.payload.userId,
        title: "Unit auto-approved",
        message: `Your unit "${unit.unitName}" was auto-approved (you are an HOD/Coordinator). It's now visible in the compiled syllabus.`,
      },
    });
  }
  return NextResponse.json({ unit: updated, autoApproved: isAutoApprove });
}
