import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole, requireRole } from "@/lib/session";
import { ROLES, REVIEWER_ROLES } from "@/lib/auth";

export async function GET() {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.SUPERADMIN, ROLES.PRINCIPAL, ...REVIEWER_ROLES);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });
  const years = await db.academicYear.findMany({ orderBy: { year: "desc" } });
  return NextResponse.json({ years });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.SUPERADMIN);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });
  const body = await req.json();
  const { year, active } = body;
  if (!year) return NextResponse.json({ error: "year required" }, { status: 400 });
  if (active) {
    await db.academicYear.updateMany({ data: { active: false } });
  }
  const ay = await db.academicYear.upsert({
    where: { year },
    update: { active: active ?? false },
    create: { year, active: active ?? false },
  });
  await db.auditLog.create({
    data: { actorId: session.payload.userId, action: "AY_CREATE", detail: `Academic year ${year} (active=${!!active})` },
  });
  return NextResponse.json({ academicYear: ay }, { status: 201 });
}
