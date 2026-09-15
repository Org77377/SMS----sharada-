import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole, requireRole } from "@/lib/session";

export async function GET() {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user } = session;
  const check = requireRole(session.payload, "Teacher");
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });

  const ay = await db.academicYear.findFirst({ where: { active: true } });
  if (!ay) return NextResponse.json({ assignments: [], academicYear: null });

  const assignments = await db.teacherAssignment.findMany({
    where: { teacherId: user!.id, academicYearId: ay.id },
    include: { grade: true, subject: true },
    orderBy: { grade: { gradeNumber: "asc" } },
  });
  return NextResponse.json({
    assignments: assignments.map((a) => ({
      id: a.id,
      gradeId: a.gradeId,
      subjectId: a.subjectId,
      grade: a.grade,
      subject: a.subject,
    })),
    academicYear: { id: ay.id, year: ay.year },
  });
}
