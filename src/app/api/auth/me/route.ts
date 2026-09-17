import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole } from "@/lib/session";
import { SUBMISSION_ROLES } from "@/lib/auth";

export async function GET() {
  const session = await getCurrentUserWithRole();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  const { user } = session;
  const roleName = user!.role.name;

  // Load teacher assignments for any role that can submit syllabus
  // (Teacher, HOD, Exam Coordinator, Principal — if they take subjects).
  let assignments: { gradeId: string; subjectId: string; grade: { id: string; gradeNumber: number; displayName: string }; subject: { id: string; name: string; code: string } }[] = [];
  if ((SUBMISSION_ROLES as readonly string[]).includes(roleName)) {
    const ay = await db.academicYear.findFirst({ where: { active: true } });
    if (ay) {
      const raw = await db.teacherAssignment.findMany({
        where: { teacherId: user!.id, academicYearId: ay.id },
        include: { grade: true, subject: true },
        orderBy: { grade: { gradeNumber: "asc" } },
      });
      assignments = raw.map((a) => ({
        gradeId: a.gradeId,
        subjectId: a.subjectId,
        grade: a.grade,
        subject: a.subject,
      }));
    }
  }
  return NextResponse.json({
    user: {
      id: user!.id,
      name: user!.name,
      username: user!.username,
      role: roleName,
      roleId: user!.roleId,
      active: user!.active,
      departmentId: user!.departmentId ?? null,
      departmentName: user!.department?.name ?? null,
    },
    assignments,
  });
}
