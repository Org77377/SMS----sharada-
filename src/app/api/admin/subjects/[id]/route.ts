import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole, requireRole } from "@/lib/session";
import { ROLES } from "@/lib/auth";

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
  const subject = await db.subject.findUnique({ where: { id } });
  if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.code !== undefined) data.code = String(body.code).trim().toUpperCase();
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
  const updated = await db.subject.update({ where: { id }, data, include: { department: true } });
  await db.auditLog.create({
    data: { actorId: session.payload.userId, action: "SUBJECT_UPDATE", detail: `Updated subject ${updated.name}` },
  });
  return NextResponse.json({
    subject: {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      departmentId: updated.departmentId,
      departmentName: updated.department?.name ?? null,
    },
  });
}
