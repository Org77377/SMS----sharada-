import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole, requireRole } from "@/lib/session";
import { ROLES } from "@/lib/auth";

export async function GET() {
  const subjects = await db.subject.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ subjects });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.SUPERADMIN);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });
  const body = await req.json();
  const { name, code } = body;
  if (!name || !code) {
    return NextResponse.json({ error: "name and code required" }, { status: 400 });
  }
  const subject = await db.subject.create({
    data: { name: name.trim(), code: code.trim().toUpperCase() },
  });
  await db.auditLog.create({
    data: { actorId: session.payload.userId, action: "SUBJECT_CREATE", detail: `Subject ${name} (${code})` },
  });
  return NextResponse.json({ subject }, { status: 201 });
}
