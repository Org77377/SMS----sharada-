import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole, requireRole, getDepartmentScope } from "@/lib/session";
import { ROLES, REVIEWER_ROLES } from "@/lib/auth";

// Returns a matrix of grade × subject with status counts + term breakdown.
export async function GET() {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(
    session.payload,
    ...REVIEWER_ROLES,
    ROLES.PRINCIPAL,
    ROLES.SUPERADMIN,
    ROLES.TECHNICAL_ADMIN
  );
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });

  const ay = await db.academicYear.findFirst({ where: { active: true } });
  if (!ay) return NextResponse.json({ grid: [], academicYear: null });

  // Department scoping for HODs — only see their department's subjects
  const scope = await getDepartmentScope(session);
  const subjectFilter = scope.subjectIds ? { id: { in: scope.subjectIds } } : {};

  const units = await db.unit.findMany({
    where: { academicYearId: ay.id, subject: subjectFilter },
    include: {
      grade: true,
      subject: true,
      createdBy: { select: { id: true, name: true } },
    },
  });
  const grades = await db.grade.findMany({ orderBy: { gradeNumber: "asc" } });
  const subjects = await db.subject.findMany({ where: subjectFilter, orderBy: { name: "asc" } });
  const terms = ["Term 1", "Term 2"];

  type Cell = {
    gradeId: string;
    subjectId: string;
    gradeNumber: number;
    gradeDisplay: string;
    subjectName: string;
    subjectCode: string;
    total: number;
    approved: number;
    submitted: number;
    draft: number;
    rejected: number;
    terms: { term: string; total: number; approved: number; submitted: number; draft: number; rejected: number; teacherName: string | null }[];
    status: "EMPTY" | "PENDING" | "IN_PROGRESS" | "APPROVED";
  };

  const grid: Cell[] = [];
  for (const grade of grades) {
    for (const subject of subjects) {
      const cellUnits = units.filter(
        (u) => u.gradeId === grade.id && u.subjectId === subject.id
      );
      const counts = {
        total: cellUnits.length,
        approved: cellUnits.filter((u) => u.status === "APPROVED").length,
        submitted: cellUnits.filter((u) => u.status === "SUBMITTED").length,
        draft: cellUnits.filter((u) => u.status === "DRAFT").length,
        rejected: cellUnits.filter((u) => u.status === "REJECTED").length,
      };
      const teacher = cellUnits[0]?.createdBy?.name ?? null;
      let status: Cell["status"] = "EMPTY";
      if (counts.total > 0) {
        if (counts.approved === counts.total) status = "APPROVED";
        else if (counts.approved > 0 || counts.submitted > 0) status = "IN_PROGRESS";
        else status = "PENDING";
      }
      const termBreakdown = terms.map((term) => {
        const t = cellUnits.filter((u) => u.term === term);
        return {
          term,
          total: t.length,
          approved: t.filter((u) => u.status === "APPROVED").length,
          submitted: t.filter((u) => u.status === "SUBMITTED").length,
          draft: t.filter((u) => u.status === "DRAFT").length,
          rejected: t.filter((u) => u.status === "REJECTED").length,
          teacherName: teacher,
        };
      });
      grid.push({
        gradeId: grade.id,
        subjectId: subject.id,
        gradeNumber: grade.gradeNumber,
        gradeDisplay: grade.displayName,
        subjectName: subject.name,
        subjectCode: subject.code,
        ...counts,
        terms: termBreakdown,
        status,
      });
    }
  }
  return NextResponse.json({ grid, academicYear: { id: ay.id, year: ay.year } });
}
