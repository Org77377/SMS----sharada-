import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole } from "@/lib/session";

export async function GET() {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.payload.userId;
  const roleId = session.user!.roleId;

  // Notifications addressed to this user directly OR broadcast to their role
  const notifications = await db.notification.findMany({
    where: {
      OR: [{ recipientId: userId }, { targetRoleId: roleId, recipientId: null }],
    },
    include: {
      sender: { select: { id: true, name: true, role: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  return NextResponse.json({ notifications, unreadCount });
}

// Mark all as read
export async function POST() {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.payload.userId;
  const roleId = session.user!.roleId;
  await db.notification.updateMany({
    where: { OR: [{ recipientId: userId }, { targetRoleId: roleId, recipientId: null }], isRead: false },
    data: { isRead: true },
  });
  return NextResponse.json({ ok: true });
}
