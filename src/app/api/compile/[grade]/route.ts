import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole, requireRole } from "@/lib/session";
import { ROLES, TERMS } from "@/lib/auth";

// GET /api/compile/[grade]?term=Term%201
// Returns the compiled syllabus for a grade (optionally filtered by term).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ grade: string }> }
) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(
    session.payload,
    ROLES.COORDINATOR,
    ROLES.PRINCIPAL,
    ROLES.SUPERADMIN
  );
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });

  const { grade: gradeParam } = await params;
  const { searchParams } = new URL(req.url);
  const termFilter = searchParams.get("term"); // "Term 1" | "Term 2" | null (all)

  const gradeNumber = parseInt(gradeParam, 10);
  const grade = await db.grade.findUnique({ where: { gradeNumber } });
  if (!grade) return NextResponse.json({ error: "Grade not found" }, { status: 404 });

  const ay = await db.academicYear.findFirst({ where: { active: true } });
  if (!ay) return NextResponse.json({ error: "No active academic year" }, { status: 400 });

  const where = {
    gradeId: grade.id,
    academicYearId: ay.id,
    status: "APPROVED",
    ...(termFilter ? { term: termFilter } : {}),
  };
  const units = await db.unit.findMany({
    where,
    include: { subject: true, createdBy: { select: { name: true } } },
    orderBy: [{ subject: { name: "asc" } }, { term: "asc" }, { createdAt: "asc" }],
  });

  // Group by subject → term → units
  const bySubject = new Map<string, { subject: { id: string; name: string; code: string }; terms: Map<string, typeof units> }>();
  for (const u of units) {
    if (!bySubject.has(u.subjectId)) {
      bySubject.set(u.subjectId, { subject: u.subject, terms: new Map() });
    }
    const subj = bySubject.get(u.subjectId)!;
    if (!subj.terms.has(u.term)) subj.terms.set(u.term, []);
    subj.terms.get(u.term)!.push(u);
  }

  const subjects = Array.from(bySubject.values()).map((s) => {
    const teacherName = s.terms.values().next().value?.[0]?.createdBy?.name ?? "—";
    // Only include terms that actually have units. When a specific term is
    // selected, the API filter already excluded the other term's units, so
    // this naturally shows only the selected term. When "All Terms" is
    // selected, only terms with approved units are listed (no empty headings).
    const terms = (termFilter ? [termFilter] : TERMS)
      .filter((t) => s.terms.has(t) && s.terms.get(t)!.length > 0)
      .map((t) => {
        const list = s.terms.get(t)!;
        return {
          term: t,
          units: list.map((u) => ({
            id: u.id,
            unitName: u.unitName,
            topics: u.topics,
            learningObjectives: u.learningObjectives || "",
          })),
        };
      });
    return { subject: s.subject, teacherName, terms };
  });

  return NextResponse.json({
    school: {
      name: "Sharada Public School",
      city: "Vijayapura",
      pin: "586109",
    },
    academicYear: ay.year,
    grade: { number: grade.gradeNumber, displayName: grade.displayName },
    term: termFilter || "All Terms",
    generatedAt: new Date().toISOString(),
    subjects,
  });
}
