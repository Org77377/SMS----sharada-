import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comparePassword, signToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }
    const user = await db.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      include: { role: true },
    });
    if (!user || !user.active) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }
    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }
    const token = signToken({
      userId: user.id,
      role: user.role.name,
      username: user.username,
      name: user.name,
    });
    const res = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role.name,
      },
    });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    await db.auditLog.create({
      data: {
        actorId: user.id,
        action: "LOGIN",
        detail: `${user.role.name} ${user.username} signed in`,
      },
    });
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: "Login failed: " + (e as Error).message },
      { status: 500 }
    );
  }
}
