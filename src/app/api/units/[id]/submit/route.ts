import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole } from "@/lib/session";
import { UNIT_STATUS, ROLES } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.payload.role !== ROLES.TEACHER)
    return NextResponse.json({ error: "Only teachers submit" }, { status: 403 });
  const { id } = await params;
  const unit = await db.unit.findUnique({ where: { id } });
  if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });
  if (unit.createdById !== session.payload.userId)
    return NextResponse.json({ error: "Not your unit" }, { status: 403 });
  if (unit.status === UNIT_STATUS.APPROVED)
    return NextResponse.json({ error: "Already approved" }, { status: 400 });

  const updated = await db.unit.update({
    where: { id },
    data: { status: UNIT_STATUS.SUBMITTED, feedback: null },
    include: { grade: true, subject: true, createdBy: { select: { name: true } } },
  });
  await db.auditLog.create({
    data: { actorId: session.payload.userId, action: "UNIT_SUBMIT", detail: `Submitted unit "${unit.unitName}"` },
  });
  // Notify coordinators & principal
  const reviewers = await db.user.findMany({
    where: { role: { name: { in: [ROLES.COORDINATOR, ROLES.PRINCIPAL] } }, active: true },
  });
  if (reviewers.length > 0) {
    await db.notification.createMany({
      data: reviewers.map((r) => ({
        senderId: session.payload.userId,
        recipientId: r.id,
        title: "New syllabus submission",
        message: `${session.payload.name} submitted "${unit.unitName}" for review.`,
      })),
    });
  }
  return NextResponse.json({ unit: updated });
}
