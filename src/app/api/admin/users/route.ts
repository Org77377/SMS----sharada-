import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole, requireRole } from "@/lib/session";
import { hashPassword, ROLES, REVIEWER_ROLES } from "@/lib/auth";

export async function GET() {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.SUPERADMIN, ROLES.PRINCIPAL, ...REVIEWER_ROLES);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });
  const users = await db.user.findMany({
    include: { role: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      role: u.role.name,
      roleId: u.roleId,
      active: u.active,
      createdAt: u.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.SUPERADMIN);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });

  const body = await req.json();
  const { name, username, password, roleName, active } = body;
  if (!name || !username || !password || !roleName) {
    return NextResponse.json({ error: "name, username, password, roleName required" }, { status: 400 });
  }
  const role = await db.role.findUnique({ where: { name: roleName } });
  if (!role) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const exists = await db.user.findUnique({ where: { username: username.trim().toLowerCase() } });
  if (exists) return NextResponse.json({ error: "Username already taken" }, { status: 409 });

  const user = await db.user.create({
    data: {
      name: name.trim(),
      username: username.trim().toLowerCase(),
      passwordHash: await hashPassword(password),
      roleId: role.id,
      active: active ?? true,
    },
    include: { role: true },
  });
  await db.auditLog.create({
    data: { actorId: session.payload.userId, action: "USER_CREATE", detail: `Created user ${user.username} (${role.name})` },
  });
  return NextResponse.json({
    user: { id: user.id, name: user.name, username: user.username, role: user.role.name, active: user.active, createdAt: user.createdAt },
  }, { status: 201 });
}
