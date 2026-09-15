import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole } from "@/lib/session";

export async function GET() {
  const session = await getCurrentUserWithRole();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  const { user } = session;
  // Load teacher assignments if teacher
  let assignments: { gradeId: string; subjectId: string; grade: { id: string; gradeNumber: number; displayName: string }; subject: { id: string; name: string; code: string } }[] = [];
  if (user!.role.name === "Teacher") {
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
      role: user!.role.name,
      roleId: user!.roleId,
      active: user!.active,
    },
    assignments,
  });
}
