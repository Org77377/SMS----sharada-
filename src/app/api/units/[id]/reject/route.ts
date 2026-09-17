import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole, requireRole } from "@/lib/session";
import { UNIT_STATUS, ROLES, REVIEWER_ROLES } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ...REVIEWER_ROLES, ROLES.PRINCIPAL, ROLES.SUPERADMIN);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const feedback = (body.feedback as string | undefined)?.trim();
  const unit = await db.unit.findUnique({
    where: { id },
    include: { grade: true, subject: true },
  });
  if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

  // HODs can only reject units for subjects in their department
  if (session.payload.role === ROLES.HOD && session.user!.departmentId) {
    if (unit.subject.departmentId !== session.user!.departmentId) {
      return NextResponse.json(
        { error: "This unit belongs to a subject outside your department." },
        { status: 403 }
      );
    }
  }

  const updated = await db.unit.update({
    where: { id },
    data: { status: UNIT_STATUS.REJECTED, feedback: feedback || null },
    include: { grade: true, subject: true, createdBy: { select: { name: true } } },
  });
  await db.auditLog.create({
    data: {
      actorId: session.payload.userId,
      action: "UNIT_REJECT",
      detail: `Returned "${unit.unitName}" for revision. Feedback: ${feedback || "—"}`,
    },
  });
  await db.notification.create({
    data: {
      senderId: session.payload.userId,
      recipientId: unit.createdById,
      title: "Unit Returned for Revision",
      message: `Your unit "${unit.unitName}" (${unit.grade.displayName} / ${unit.subject.name} / ${unit.term}) was returned for revision. Feedback: ${feedback || "Please review and resubmit."}`,
    },
  });
  return NextResponse.json({ unit: updated });
}
