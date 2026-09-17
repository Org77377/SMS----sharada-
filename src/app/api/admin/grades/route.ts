import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole, requireRole } from "@/lib/session";
import { ROLES } from "@/lib/auth";

export async function GET() {
  const grades = await db.grade.findMany({ orderBy: { gradeNumber: "asc" } });
  return NextResponse.json({ grades });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.SUPERADMIN);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });
  const body = await req.json();
  const { gradeNumber, displayName } = body;
  if (!gradeNumber || !displayName) {
    return NextResponse.json({ error: "gradeNumber and displayName required" }, { status: 400 });
  }
  const grade = await db.grade.create({
    data: { gradeNumber: Number(gradeNumber), displayName: displayName.trim() },
  });
  await db.auditLog.create({
    data: { actorId: session.payload.userId, action: "GRADE_CREATE", detail: `Grade ${gradeNumber}` },
  });
  return NextResponse.json({ grade }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.SUPERADMIN);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const grade = await db.grade.findUnique({ where: { id } });
  if (!grade) return NextResponse.json({ error: "Grade not found" }, { status: 404 });
  // Cascade deletes units + teacher assignments (schema-level onDelete: Cascade)
  await db.grade.delete({ where: { id } });
  await db.auditLog.create({
    data: { actorId: session.payload.userId, action: "GRADE_DELETE", detail: `Grade ${grade.displayName}` },
  });
  return NextResponse.json({ ok: true });
}
