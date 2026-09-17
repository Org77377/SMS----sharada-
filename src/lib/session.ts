import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyToken, COOKIE_NAME, JwtPayload, ROLES } from "@/lib/auth";

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
    include: { role: true, department: true },
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

/**
 * Department scoping for HODs.
 * Returns the set of subjectIds the current user is allowed to review/compile.
 * - HOD with a department → only their department's subject IDs
 * - HOD without a department, Exam Coordinator, Principal, Superadmin → null (all subjects)
 *
 * Also returns the departmentId + departmentName for display purposes.
 */
export async function getDepartmentScope(
  session: { payload: JwtPayload; user: { departmentId: string | null; department: { name: string } | null; role: { name: string } } } | null
): Promise<{
  subjectIds: string[] | null; // null = no restriction (see all subjects)
  departmentId: string | null;
  departmentName: string | null;
}> {
  if (!session) return { subjectIds: null, departmentId: null, departmentName: null };
  // Only HODs are department-scoped
  if (session.user.role.name !== ROLES.HOD) {
    return { subjectIds: null, departmentId: null, departmentName: null };
  }
  const deptId = session.user.departmentId;
  if (!deptId) {
    // HOD without a department assigned — sees all (no scoping)
    return { subjectIds: null, departmentId: null, departmentName: null };
  }
  const subjects = await db.subject.findMany({
    where: { departmentId: deptId },
    select: { id: true },
  });
  return {
    subjectIds: subjects.map((s) => s.id),
    departmentId: deptId,
    departmentName: session.user.department?.name ?? null,
  };
}
