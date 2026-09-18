import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole } from "@/lib/session";
import { comparePassword, hashPassword, ROLES } from "@/lib/auth";

// POST /api/auth/change-password
// Allows the logged-in user to change their own password.
// Body: { currentPassword, newPassword }
export async function POST(req: NextRequest) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "currentPassword and newPassword are required" }, { status: 400 });
  }
  if (String(newPassword).length < 6) {
    return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
  }

  const user = session.user;
  const ok = await comparePassword(String(currentPassword), user!.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
  }

  const newHash = await hashPassword(String(newPassword));
  await db.user.update({
    where: { id: user!.id },
    data: { passwordHash: newHash },
  });
  await db.auditLog.create({
    data: {
      actorId: user!.id,
      action: "PASSWORD_CHANGE",
      detail: `${user!.role.name} ${user!.username} changed their own password`,
    },
  });
  return NextResponse.json({ ok: true });
}
