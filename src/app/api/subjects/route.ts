import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const subjects = await db.subject.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ subjects });
}
