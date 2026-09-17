import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole, requireRole } from "@/lib/session";
import { UNIT_STATUS, ROLES, REVIEWER_ROLES } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const unit = await db.unit.findUnique({
    where: { id },
    include: { grade: true, subject: true },
  });
  if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

  const role = session.payload.role;

  // Teacher: can edit only own DRAFT/REJECTED units' content
  if (role === ROLES.TEACHER) {
    if (unit.createdById !== session.payload.userId) {
      return NextResponse.json({ error: "Not your unit" }, { status: 403 });
    }
    if (unit.status === UNIT_STATUS.SUBMITTED || unit.status === UNIT_STATUS.APPROVED) {
      // Allow editing content but keep status unless explicitly resubmitting
    }
    const data: Record<string, unknown> = {};
    if (body.unitName !== undefined) data.unitName = String(body.unitName).trim();
    if (body.topics !== undefined) data.topics = String(body.topics).trim();
    if (body.learningObjectives !== undefined)
      data.learningObjectives = body.learningObjectives ? String(body.learningObjectives).trim() : null;
    if (body.term !== undefined) data.term = body.term;
    const updated = await db.unit.update({
      where: { id },
      data,
      include: { grade: true, subject: true, createdBy: { select: { name: true } } },
    });
    return NextResponse.json({ unit: updated });
  }

  // HOD / Exam Coordinator / Principal / Superadmin: can set status + feedback
  if (REVIEWER_ROLES.includes(role as typeof REVIEWER_ROLES[number]) || role === ROLES.PRINCIPAL || role === ROLES.SUPERADMIN) {
    const data: Record<string, unknown> = {};
    if (body.status) data.status = body.status;
    if (body.feedback !== undefined) data.feedback = body.feedback ? String(body.feedback).trim() : null;
    const updated = await db.unit.update({
      where: { id },
      data,
      include: { grade: true, subject: true, createdBy: { select: { name: true } } },
    });
    await db.auditLog.create({
      data: {
        actorId: session.payload.userId,
        action: "UNIT_REVIEW",
        detail: `Set unit "${unit.unitName}" (${unit.grade.displayName}/${unit.subject.name}) status=${body.status || unit.status}`,
      },
    });
    // Notify the teacher of review outcome
    if (body.status === UNIT_STATUS.APPROVED || body.status === UNIT_STATUS.REJECTED) {
      await db.notification.create({
        data: {
          senderId: session.payload.userId,
          recipientId: unit.createdById,
          title: body.status === UNIT_STATUS.APPROVED ? "Unit Approved" : "Unit Returned",
          message:
            body.status === UNIT_STATUS.APPROVED
              ? `Your unit "${unit.unitName}" (${unit.grade.displayName} / ${unit.subject.name} / ${unit.term}) has been approved.`
              : `Your unit "${unit.unitName}" (${unit.grade.displayName} / ${unit.subject.name} / ${unit.term}) was returned for revision. Feedback: ${body.feedback || "—"}`,
        },
      });
    }
    return NextResponse.json({ unit: updated });
  }

  return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const unit = await db.unit.findUnique({ where: { id } });
  if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

  const role = session.payload.role;
  if (role === ROLES.TEACHER) {
    if (unit.createdById !== session.payload.userId)
      return NextResponse.json({ error: "Not your unit" }, { status: 403 });
    if (unit.status === UNIT_STATUS.APPROVED)
      return NextResponse.json({ error: "Approved units cannot be deleted" }, { status: 400 });
  } else {
    const check = requireRole(session.payload, ...REVIEWER_ROLES, ROLES.PRINCIPAL, ROLES.SUPERADMIN);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });
  }
  await db.unit.delete({ where: { id } });
  await db.auditLog.create({
    data: { actorId: session.payload.userId, action: "UNIT_DELETE", detail: `Deleted unit "${unit.unitName}"` },
  });
  return NextResponse.json({ ok: true });
}
