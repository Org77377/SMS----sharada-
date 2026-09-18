import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole, requireRole } from "@/lib/session";
import { ROLES } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";

// POST /api/admin/pending-actions/[id]/approve
// Principal approves a pending action → the system executes the proposed change.
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

  // Execute the proposed change
  let executedDetail = "";
  try {
    const data = JSON.parse(action.actionData);
    const teacherRole = await db.role.findUnique({ where: { name: ROLES.TEACHER } });
    if (!teacherRole) throw new Error("Teacher role not found");

    if (action.actionType === "USER_CREATE") {
      // Create the teacher
      const exists = await db.user.findUnique({ where: { username: String(data.username).toLowerCase() } });
      if (exists) throw new Error("Username already exists (may have been created since the request)");
      const user = await db.user.create({
        data: {
          name: String(data.name).trim(),
          username: String(data.username).toLowerCase().trim(),
          passwordHash: await hashPassword(String(data.password)),
          roleId: teacherRole.id,
          phone: data.phone || null,
          email: data.email || null,
          active: data.active ?? true,
        },
      });
      executedDetail = `Created teacher ${user.username}`;
    } else if (action.actionType === "USER_UPDATE") {
      // Update the teacher — only safe fields
      if (!action.targetUserId) throw new Error("No target user");
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = String(data.name).trim();
      if (data.phone !== undefined) updateData.phone = data.phone ? String(data.phone).trim() : null;
      if (data.email !== undefined) updateData.email = data.email ? String(data.email).trim().toLowerCase() : null;
      if (data.active !== undefined) updateData.active = !!data.active;
      if (data.password) updateData.passwordHash = await hashPassword(String(data.password));
      const updated = await db.user.update({
        where: { id: action.targetUserId },
        data: updateData,
      });
      executedDetail = `Updated teacher ${updated.username}`;
    } else if (action.actionType === "USER_DELETE") {
      // Delete the teacher (+ cascade their units, assignments, notifications)
      if (!action.targetUserId) throw new Error("No target user");
      const target = await db.user.findUnique({
        where: { id: action.targetUserId },
        include: { role: true },
      });
      if (!target) throw new Error("Target user not found (may have been deleted already)");
      if (target.role.name !== ROLES.TEACHER) throw new Error("Target is no longer a Teacher");
      await db.unit.deleteMany({ where: { createdById: target.id } });
      await db.teacherAssignment.deleteMany({ where: { teacherId: target.id } });
      await db.notification.deleteMany({
        where: { OR: [{ senderId: target.id }, { recipientId: target.id }] },
      });
      await db.user.delete({ where: { id: target.id } });
      executedDetail = `Deleted teacher ${target.username}`;
    }
  } catch (e) {
    // Mark as rejected with the error so the Principal knows why it failed
    await db.pendingAction.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewerId: session.payload.userId,
        reviewerNote: `Execution failed: ${(e as Error).message}`,
        reviewedAt: new Date(),
      },
    });
    return NextResponse.json({ error: "Failed to execute: " + (e as Error).message }, { status: 500 });
  }

  // Mark as approved
  await db.pendingAction.update({
    where: { id },
    data: {
      status: "APPROVED",
      reviewerId: session.payload.userId,
      reviewerNote: note,
      reviewedAt: new Date(),
    },
  });
  await db.auditLog.create({
    data: {
      actorId: session.payload.userId,
      action: "PENDING_ACTION_APPROVED",
      detail: `Approved & executed: ${action.actionType} — ${executedDetail}`,
    },
  });

  // Notify the Technical Admin who requested it
  await db.notification.create({
    data: {
      senderId: session.payload.userId,
      recipientId: action.requesterId,
      title: "Request approved & executed",
      message: `Your ${action.actionType.replace(/_/g, " ").toLowerCase()} request${action.targetName ? ` for ${action.targetName}` : ""} was approved and executed by ${session.payload.name}.`,
    },
  });

  return NextResponse.json({ ok: true, detail: executedDetail });
}
