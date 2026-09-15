import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole } from "@/lib/session";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const userId = session.payload.userId;
  const notification = await db.notification.findUnique({ where: { id } });
  if (!notification) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Only mark read if it belongs to the user (direct) or their role (broadcast)
  const belongsToUser = notification.recipientId === userId || notification.targetRoleId === session.user!.roleId;
  if (!belongsToUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const updated = await db.notification.update({ where: { id }, data: { isRead: true } });
  return NextResponse.json({ notification: updated });
}
