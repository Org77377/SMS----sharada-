import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole, requireRole } from "@/lib/session";
import { ROLES } from "@/lib/auth";

// DELETE /api/admin/users/clear-teachers
// Removes ALL users with role "Teacher" (and, via cascade, their
// teacher assignments + the units they created). Superadmin/Principal/
// HOD/Exam Coordinator accounts are never touched.
export async function DELETE() {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.SUPERADMIN);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });

  const teacherRole = await db.role.findUnique({ where: { name: ROLES.TEACHER } });
  if (!teacherRole) return NextResponse.json({ error: "Teacher role not found" }, { status: 500 });

  // Cascade handles TeacherAssignment (onDelete: Cascade) — units have
  // onDelete: RESTRICT by default on createdById, so delete units first.
  const teachers = await db.user.findMany({
    where: { roleId: teacherRole.id },
    select: { id: true, username: true, name: true },
  });

  if (teachers.length === 0) {
    return NextResponse.json({ removed: 0, message: "No teachers to remove." });
  }

  const teacherIds = teachers.map((t) => t.id);
  // Delete units created by these teachers first (RESTRICT FK on Unit.createdById)
  await db.unit.deleteMany({ where: { createdById: { in: teacherIds } } });
  // TeacherAssignment cascades on user delete, but deleteMany is explicit & safe.
  await db.teacherAssignment.deleteMany({ where: { teacherId: { in: teacherIds } } });
  // Notifications sent by / received by these teachers
  await db.notification.deleteMany({
    where: { OR: [{ senderId: { in: teacherIds } }, { recipientId: { in: teacherIds } }] },
  });
  // Finally delete the users
  await db.user.deleteMany({ where: { id: { in: teacherIds } } });

  await db.auditLog.create({
    data: {
      actorId: session.payload.userId,
      action: "TEACHERS_CLEAR",
      detail: `Removed ${teachers.length} teacher account(s): ${teachers.map((t) => t.username).join(", ")}`,
    },
  });

  return NextResponse.json({ removed: teachers.length });
}
