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
  if (body.departmentId !== undefined) {
    // null clears the department; otherwise validate it exists
    if (body.departmentId === null || body.departmentId === "") {
      data.departmentId = null;
    } else {
      const dept = await db.department.findUnique({ where: { id: body.departmentId } });
      if (!dept) return NextResponse.json({ error: "Department not found" }, { status: 400 });
      data.departmentId = body.departmentId;
    }
  }
  if (body.password) {
    data.passwordHash = await hashPassword(body.password);
  }
  const updated = await db.user.update({ where: { id }, data, include: { role: true, department: true } });
  await db.auditLog.create({
    data: { actorId: session.payload.userId, action: "USER_UPDATE", detail: `Updated user ${updated.username}` },
  });
  return NextResponse.json({
    user: {
      id: updated.id,
      name: updated.name,
      username: updated.username,
      role: updated.role.name,
      active: updated.active,
      departmentId: updated.departmentId,
      departmentName: updated.department?.name ?? null,
    },
  });
}

export async function DELETE(
  req: NextRequest,
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
  const user = await db.user.findUnique({ where: { id }, include: { role: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Superadmin accounts require a special passkey to delete.
  // The passkey is checked server-side only and never surfaced to the client.
  if (user.role.name === ROLES.SUPERADMIN) {
    let body: { passkey?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const SUPERADMIN_DELETE_PASSKEY = "alpha2026";
    if (body.passkey !== SUPERADMIN_DELETE_PASSKEY) {
      await db.auditLog.create({
        data: {
          actorId: session.payload.userId,
          action: "SUPERADMIN_DELETE_DENIED",
          detail: `Blocked delete attempt on superadmin ${user.username} (invalid/missing passkey)`,
        },
      });
      return NextResponse.json(
        { error: "This is a Superadmin account. A valid passkey is required to remove it." },
        { status: 403 }
      );
    }
  }

  await db.unit.deleteMany({ where: { createdById: id } });
  await db.teacherAssignment.deleteMany({ where: { teacherId: id } });
  await db.notification.deleteMany({
    where: { OR: [{ senderId: id }, { recipientId: id }] },
  });
  await db.user.delete({ where: { id } });
  await db.auditLog.create({
    data: { actorId: session.payload.userId, action: "USER_DELETE", detail: `Deleted user ${user.username} (${user.role.name})` },
  });
  return NextResponse.json({ ok: true });
}
