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
  const isReviewer =
    REVIEWER_ROLES.includes(role as typeof REVIEWER_ROLES[number]) ||
    role === ROLES.PRINCIPAL ||
    role === ROLES.SUPERADMIN;

  // Teachers: can edit only their own units.
  // Reviewers (HOD/EC/Principal/Superadmin): can edit ANY unit (content + status).
  if (role === ROLES.TEACHER && unit.createdById !== session.payload.userId) {
    return NextResponse.json({ error: "Not your unit" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  // Content fields — both teachers (own) and reviewers (any) can edit content
  if (body.unitName !== undefined) data.unitName = String(body.unitName).trim();
  if (body.term !== undefined) data.term = body.term;
  if (body.chapters !== undefined) {
    const chaptersArray = Array.isArray(body.chapters) ? body.chapters : [];
    const sanitized = chaptersArray.slice(0, 10).map((c: { chapter?: unknown; topics?: unknown }) => ({
      chapter: String(c.chapter || "").trim(),
      topics: String(c.topics || "").trim(),
    })).filter((c: { chapter: string; topics: string }) => c.chapter || c.topics);
    data.chapters = JSON.stringify(sanitized);
  }
  // Status + feedback — only reviewers can change these directly
  if (isReviewer) {
    if (body.status) data.status = body.status;
    if (body.feedback !== undefined) data.feedback = body.feedback ? String(body.feedback).trim() : null;
  }

  const updated = await db.unit.update({
    where: { id },
    data,
    include: { grade: true, subject: true, createdBy: { select: { name: true } } },
  });
  await db.auditLog.create({
    data: {
      actorId: session.payload.userId,
      action: isReviewer && body.status ? "UNIT_REVIEW" : "UNIT_UPDATE",
      detail: `${isReviewer && body.status ? "Reviewed" : "Edited"} unit "${unit.unitName}" (${unit.grade.displayName}/${unit.subject.name})${body.status ? ` status=${body.status}` : ""}`,
    },
  });
  // Notify the teacher if a reviewer approved/returned their unit
  if (isReviewer && (body.status === UNIT_STATUS.APPROVED || body.status === UNIT_STATUS.REJECTED)) {
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
  const isReviewer =
    REVIEWER_ROLES.includes(role as typeof REVIEWER_ROLES[number]) ||
    role === ROLES.PRINCIPAL ||
    role === ROLES.SUPERADMIN;

  if (role === ROLES.TEACHER) {
    // Teachers can delete only their own non-approved units
    if (unit.createdById !== session.payload.userId)
      return NextResponse.json({ error: "Not your unit" }, { status: 403 });
    if (unit.status === UNIT_STATUS.APPROVED)
      return NextResponse.json({ error: "Approved units cannot be deleted by teachers" }, { status: 400 });
  } else if (!isReviewer) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  // Reviewers (HOD/EC/Principal/Superadmin) can delete ANY unit (including approved)
  await db.unit.delete({ where: { id } });
  await db.auditLog.create({
    data: { actorId: session.payload.userId, action: "UNIT_DELETE", detail: `Deleted unit "${unit.unitName}" (${unit.status})` },
  });
  return NextResponse.json({ ok: true });
}
