import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole, requireRole } from "@/lib/session";
import { hashPassword, ROLES } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.SUPERADMIN);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.active !== undefined) data.active = !!body.active;
  if (body.roleName !== undefined) {
    const role = await db.role.findUnique({ where: { name: body.roleName } });
    if (!role) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    data.roleId = role.id;
  }
  if (body.password) {
    data.passwordHash = await hashPassword(body.password);
  }
  const updated = await db.user.update({ where: { id }, data, include: { role: true } });
  await db.auditLog.create({
    data: { actorId: session.payload.userId, action: "USER_UPDATE", detail: `Updated user ${updated.username}` },
  });
  return NextResponse.json({
    user: { id: updated.id, name: updated.name, username: updated.username, role: updated.role.name, active: updated.active },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.SUPERADMIN);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });
  const { id } = await params;
  if (id === session.payload.userId) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  await db.user.delete({ where: { id } });
  await db.auditLog.create({
    data: { actorId: session.payload.userId, action: "USER_DELETE", detail: `Deleted user ${user.username}` },
  });
  return NextResponse.json({ ok: true });
}
