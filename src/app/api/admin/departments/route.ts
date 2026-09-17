import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole, requireRole } from "@/lib/session";
import { ROLES } from "@/lib/auth";

export async function GET() {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.SUPERADMIN, ROLES.PRINCIPAL, ROLES.HOD, ROLES.EXAM_COORDINATOR);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });
  const departments = await db.department.findMany({
    include: {
      _count: { select: { subjects: true, hods: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    departments: departments.map((d) => ({
      id: d.id,
      name: d.name,
      subjectCount: d._count.subjects,
      hodCount: d._count.hods,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.SUPERADMIN);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });
  const body = await req.json();
  const { name } = body;
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Department name required" }, { status: 400 });
  }
  const dept = await db.department.create({ data: { name: name.trim() } });
  await db.auditLog.create({
    data: { actorId: session.payload.userId, action: "DEPARTMENT_CREATE", detail: `Department ${name.trim()}` },
  });
  return NextResponse.json({ department: dept }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.SUPERADMIN);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const dept = await db.department.findUnique({ where: { id } });
  if (!dept) return NextResponse.json({ error: "Department not found" }, { status: 404 });
  // SetNull on subjects + users handles the foreign key cleanup
  await db.department.delete({ where: { id } });
  await db.auditLog.create({
    data: { actorId: session.payload.userId, action: "DEPARTMENT_DELETE", detail: `Department ${dept.name}` },
  });
  return NextResponse.json({ ok: true });
}
