import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyToken, COOKIE_NAME, JwtPayload } from "@/lib/auth";

export async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function getCurrentUser(): Promise<JwtPayload | null> {
  const token = await getToken();
  if (!token) return null;
  return verifyToken(token);
}

export async function getCurrentUserWithRole(): Promise<{
  payload: JwtPayload;
  user: Awaited<ReturnType<typeof db.user.findUnique>>;
} | null> {
  const payload = await getCurrentUser();
  if (!payload) return null;
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    include: { role: true },
  });
  if (!user || !user.active) return null;
  return { payload, user };
}

export function requireRole(
  payload: JwtPayload | null,
  ...roles: string[]
): { ok: boolean; error?: string } {
  if (!payload) return { ok: false, error: "Not authenticated" };
  if (!roles.includes(payload.role)) {
    return { ok: false, error: "Insufficient permissions" };
  }
  return { ok: true };
}
