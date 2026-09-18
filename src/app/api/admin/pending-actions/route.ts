import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole, requireRole } from "@/lib/session";
import { ROLES } from "@/lib/auth";

// GET — list pending actions.
// Technical Admin sees only their own; Principal sees all.
export async function GET() {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.TECHNICAL_ADMIN, ROLES.PRINCIPAL, ROLES.SUPERADMIN);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });

  const where = session.payload.role === ROLES.TECHNICAL_ADMIN
    ? { requesterId: session.payload.userId } // Tech Admin: only own requests
    : {}; // Principal / Superadmin: all

  const actions = await db.pendingAction.findMany({
    where,
    include: {
      requester: { select: { id: true, name: true, username: true, role: { select: { name: true } } } },
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({
    actions: actions.map((a) => ({
      id: a.id,
      requesterId: a.requesterId,
      requesterName: a.requester.name,
      actionType: a.actionType,
      targetUserId: a.targetUserId,
      targetName: a.targetName,
      actionData: a.actionData,
      status: a.status,
      reviewerId: a.reviewerId,
      reviewerName: a.reviewer?.name ?? null,
      reviewerNote: a.reviewerNote,
      createdAt: a.createdAt,
      reviewedAt: a.reviewedAt,
    })),
  });
}

// POST — Technical Admin proposes a change (create/update/delete a teacher).
export async function POST(req: NextRequest) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.TECHNICAL_ADMIN);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });

  const body = await req.json();
  const { actionType, targetUserId, actionData } = body;
  if (!actionType || !actionData) {
    return NextResponse.json({ error: "actionType and actionData required" }, { status: 400 });
  }
  if (!["USER_CREATE", "USER_UPDATE", "USER_DELETE"].includes(actionType)) {
    return NextResponse.json({ error: "Invalid actionType" }, { status: 400 });
  }

  // For UPDATE/DELETE: verify the target is a Teacher (Tech Admin can only touch teachers)
  let targetName: string | null = null;
  if (actionType === "USER_UPDATE" || actionType === "USER_DELETE") {
    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId required for UPDATE/DELETE" }, { status: 400 });
    }
    const target = await db.user.findUnique({
      where: { id: targetUserId },
      include: { role: true },
    });
    if (!target) return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    if (target.role.name !== ROLES.TEACHER) {
      return NextResponse.json(
        { error: "Technical Admin can only propose changes to Teacher accounts" },
        { status: 403 }
      );
    }
    targetName = target.name;
  }

  // For USER_CREATE: force roleName to Teacher
  if (actionType === "USER_CREATE") {
    try {
      const data = JSON.parse(actionData);
      if (data.roleName && data.roleName !== ROLES.TEACHER) {
        return NextResponse.json(
          { error: "Technical Admin can only propose creating Teacher accounts" },
          { status: 403 }
        );
      }
      data.roleName = ROLES.TEACHER;
      targetName = data.name || null;
    } catch {
      return NextResponse.json({ error: "Invalid actionData JSON" }, { status: 400 });
    }
  }

  const action = await db.pendingAction.create({
    data: {
      requesterId: session.payload.userId,
      actionType,
      targetUserId: targetUserId || null,
      targetName,
      actionData,
      status: "PENDING",
    },
  });
  await db.auditLog.create({
    data: {
      actorId: session.payload.userId,
      action: "PENDING_ACTION_CREATE",
      detail: `Proposed ${actionType}${targetName ? ` for ${targetName}` : ""} (pending Principal approval)`,
    },
  });

  // Notify the Principal that a request is pending
  const principals = await db.user.findMany({
    where: { role: { name: ROLES.PRINCIPAL }, active: true },
  });
  if (principals.length > 0) {
    await db.notification.createMany({
      data: principals.map((p) => ({
        senderId: session.payload.userId,
        recipientId: p.id,
        title: "Approval needed: staff change request",
        message: `${session.payload.name} (Technical Admin) proposed a ${actionType.replace(/_/g, " ").toLowerCase()}${targetName ? ` for ${targetName}` : ""}. Review and approve in the Approvals tab.`,
      })),
    });
  }

  return NextResponse.json({ action }, { status: 201 });
}
