import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole, requireRole } from "@/lib/session";
import { ROLES } from "@/lib/auth";

// POST /api/admin/pending-actions/[id]/reject
// Principal rejects a pending action. The proposed change is NOT executed.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.PRINCIPAL, ROLES.SUPERADMIN);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const note = (body.note as string | undefined)?.trim() || null;

  const action = await db.pendingAction.findUnique({ where: { id } });
  if (!action) return NextResponse.json({ error: "Pending action not found" }, { status: 404 });
  if (action.status !== "PENDING") {
    return NextResponse.json({ error: `Action already ${action.status.toLowerCase()}` }, { status: 400 });
  }

  await db.pendingAction.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewerId: session.payload.userId,
      reviewerNote: note,
      reviewedAt: new Date(),
    },
  });
  await db.auditLog.create({
    data: {
      actorId: session.payload.userId,
      action: "PENDING_ACTION_REJECTED",
      detail: `Rejected ${action.actionType} request${action.targetName ? ` for ${action.targetName}` : ""}${note ? ` — ${note}` : ""}`,
    },
  });

  // Notify the Technical Admin
  await db.notification.create({
    data: {
      senderId: session.payload.userId,
      recipientId: action.requesterId,
      title: "Request rejected",
      message: `Your ${action.actionType.replace(/_/g, " ").toLowerCase()} request${action.targetName ? ` for ${action.targetName}` : ""} was rejected by ${session.payload.name}.${note ? ` Note: ${note}` : ""}`,
    },
  });

  return NextResponse.json({ ok: true });
}
