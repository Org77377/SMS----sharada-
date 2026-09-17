import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole, requireRole } from "@/lib/session";
import { ROLES, REVIEWER_ROLES } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.PRINCIPAL, ...REVIEWER_ROLES, ROLES.SUPERADMIN);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });

  const body = await req.json();
  const { title, message, targetRoleId, targetUserId, scope } = body;
  if (!title || !message) {
    return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
  }

  if (scope === "user" && targetUserId) {
    const n = await db.notification.create({
      data: { senderId: session.payload.userId, recipientId: targetUserId, title, message },
    });
    await db.auditLog.create({
      data: { actorId: session.payload.userId, action: "NOTIFY_USER", detail: `To ${targetUserId}: ${title}` },
    });
    return NextResponse.json({ notification: n }, { status: 201 });
  }

  // Broadcast to a role by name (Teacher, HOD, Exam Coordinator, Principal)
  const targetRoleRecord = await db.role.findUnique({
    where: { name: targetRoleId || "Teacher" },
  });
  if (!targetRoleRecord) {
    return NextResponse.json({ error: "Target role not found" }, { status: 400 });
  }

  const n = await db.notification.create({
    data: {
      senderId: session.payload.userId,
      targetRoleId: targetRoleRecord.id,
      title,
      message,
    },
  });
  await db.auditLog.create({
    data: { actorId: session.payload.userId, action: "NOTIFY_BROADCAST", detail: `To ${targetRoleRecord.name}: ${title}` },
  });
  return NextResponse.json({ notification: n }, { status: 201 });
}
