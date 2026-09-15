import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const grades = await db.grade.findMany({ orderBy: { gradeNumber: "asc" } });
  return NextResponse.json({ grades });
}
