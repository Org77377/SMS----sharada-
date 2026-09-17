// Frontend API helpers + shared types

export type Role = "Superadmin" | "Principal" | "HOD" | "Exam Coordinator" | "Teacher";
export type UnitStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  roleId: string;
  active: boolean;
}
export interface Assignment {
  id?: string;
  gradeId: string;
  subjectId: string;
  grade: { id: string; gradeNumber: number; displayName: string };
  subject: { id: string; name: string; code: string };
}
export interface MeResponse {
  user: AuthUser | null;
  assignments?: Assignment[];
}

export interface Unit {
  id: string;
  gradeId: string;
  subjectId: string;
  academicYearId: string;
  term: string;
  unitName: string;
  topics: string;
  learningObjectives: string | null;
  status: UnitStatus;
  feedback: string | null;
  createdById: string;
  createdBy?: { id: string; name: string; username?: string };
  grade?: { id: string; gradeNumber: number; displayName: string };
  subject?: { id: string; name: string; code: string };
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  senderId: string;
  recipientId: string | null;
  targetRoleId: string | null;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  sender?: { id: string; name: string; role: { name: string } };
}

export interface StatusCell {
  gradeId: string;
  subjectId: string;
  gradeNumber: number;
  gradeDisplay: string;
  subjectName: string;
  subjectCode: string;
  total: number;
  approved: number;
  submitted: number;
  draft: number;
  rejected: number;
  status: "EMPTY" | "PENDING" | "IN_PROGRESS" | "APPROVED";
  terms: {
    term: string;
    total: number;
    approved: number;
    submitted: number;
    draft: number;
    rejected: number;
    teacherName: string | null;
  }[];
}

export interface CompiledSubject {
  subject: { id: string; name: string; code: string };
  teacherName: string;
  terms: {
    term: string;
    units: { id: string; unitName: string; topics: string; learningObjectives: string }[];
  }[];
}
export interface CompiledDoc {
  school: { name: string; city: string; pin: string };
  academicYear: string;
  grade: { number: number; displayName: string };
  term: string;
  generatedAt: string;
  subjects: CompiledSubject[];
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  me: () => request<MeResponse>("/api/auth/me"),
  myAssignments: () =>
    request<{ assignments: Assignment[]; academicYear: { id: string; year: string } | null }>(
      "/api/my-assignments"
    ),
  grades: () => request<{ grades: { id: string; gradeNumber: number; displayName: string }[] }>("/api/grades"),
  subjects: () =>
    request<{ subjects: { id: string; name: string; code: string }[] }>("/api/subjects"),
  units: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{ units: Unit[] }>(`/api/units${qs}`);
  },
  createUnit: (body: Record<string, unknown>) =>
    request<{ unit: Unit }>("/api/units", { method: "POST", body: JSON.stringify(body) }),
  updateUnit: (id: string, body: Record<string, unknown>) =>
    request<{ unit: Unit }>(`/api/units/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteUnit: (id: string) =>
    request<{ ok: true }>(`/api/units/${id}`, { method: "DELETE" }),
  submitUnit: (id: string) =>
    request<{ unit: Unit }>(`/api/units/${id}/submit`, { method: "POST" }),
  approveUnit: (id: string) =>
    request<{ unit: Unit }>(`/api/units/${id}/approve`, { method: "POST" }),
  rejectUnit: (id: string, feedback: string) =>
    request<{ unit: Unit }>(`/api/units/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ feedback }),
    }),
  notifications: () =>
    request<{ notifications: NotificationItem[]; unreadCount: number }>("/api/notifications"),
  markNotificationRead: (id: string) =>
    request<{ notification: NotificationItem }>(`/api/notifications/${id}/read`, {
      method: "POST",
    }),
  markAllRead: () => request<{ ok: true }>("/api/notifications", { method: "POST" }),
  broadcast: (body: { title: string; message: string; targetRoleId?: string; targetUserId?: string; scope?: string }) =>
    request<{ notification: NotificationItem }>("/api/notifications/broadcast", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  statusGrid: () =>
    request<{ grid: StatusCell[]; academicYear: { id: string; year: string } | null }>(
      "/api/status-grid"
    ),
  compile: (grade: number, term?: string) =>
    request<CompiledDoc>(`/api/compile/${grade}${term ? `?term=${encodeURIComponent(term)}` : ""}`),
  admin: {
    users: () =>
      request<{ users: (AuthUser & { createdAt: string })[] }>("/api/admin/users"),
    createUser: (body: { name: string; username: string; password: string; roleName: Role; active?: boolean }) =>
      request<{ user: AuthUser }>("/api/admin/users", { method: "POST", body: JSON.stringify(body) }),
    updateUser: (id: string, body: Record<string, unknown>) =>
      request<{ user: AuthUser }>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    deleteUser: (id: string, passkey?: string) =>
      request<{ ok: true }>(`/api/admin/users/${id}`, {
        method: "DELETE",
        body: passkey ? JSON.stringify({ passkey }) : undefined,
      }),
    clearTeachers: () =>
      request<{ removed: number; message?: string }>(`/api/admin/users/clear-teachers`, {
        method: "DELETE",
      }),
    assignments: () =>
      request<{
        assignments: (Assignment & { teacher: { name: string; username: string } })[];
        academicYear: { id: string; year: string } | null;
      }>("/api/admin/assignments"),
    createAssignment: (body: { teacherId: string; gradeId: string; subjectId: string; academicYearId: string }) =>
      request<{ assignment: unknown }>("/api/admin/assignments", { method: "POST", body: JSON.stringify(body) }),
    deleteAssignment: (id: string) =>
      request<{ ok: true }>(`/api/admin/assignments?id=${id}`, { method: "DELETE" }),
    academicYears: () =>
      request<{ years: { id: string; year: string; active: boolean }[] }>("/api/admin/academic-years"),
    createAcademicYear: (body: { year: string; active: boolean }) =>
      request<{ academicYear: { id: string; year: string; active: boolean } }>(
        "/api/admin/academic-years",
        { method: "POST", body: JSON.stringify(body) }
      ),
    auditLogs: () =>
      request<{ logs: { id: string; actorId: string | null; action: string; detail: string | null; createdAt: string }[] }>(
        "/api/admin/audit-logs"
      ),
    createGrade: (body: { gradeNumber: number; displayName: string }) =>
      request<{ grade: { id: string; gradeNumber: number; displayName: string } }>(
        "/api/admin/grades",
        { method: "POST", body: JSON.stringify(body) }
      ),
    deleteGrade: (id: string) =>
      request<{ ok: true }>(`/api/admin/grades?id=${id}`, { method: "DELETE" }),
    createSubject: (body: { name: string; code: string }) =>
      request<{ subject: { id: string; name: string; code: string } }>(
        "/api/admin/subjects",
        { method: "POST", body: JSON.stringify(body) }
      ),
  },
};

export const STATUS_META: Record<UnitStatus, { label: string; color: string; bg: string; dot: string }> = {
  DRAFT: { label: "Draft", color: "text-slate-600", bg: "bg-slate-100", dot: "bg-slate-400" },
  SUBMITTED: { label: "Submitted", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
  APPROVED: { label: "Approved", color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  REJECTED: { label: "Returned", color: "text-rose-700", bg: "bg-rose-50", dot: "bg-rose-500" },
};

export const GRID_STATUS_META: Record<StatusCell["status"], { label: string; color: string; bg: string; dot: string }> = {
  EMPTY: { label: "Pending", color: "text-slate-500", bg: "bg-slate-50", dot: "bg-slate-300" },
  PENDING: { label: "In Draft", color: "text-slate-600", bg: "bg-slate-100", dot: "bg-slate-400" },
  IN_PROGRESS: { label: "In Review", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
  APPROVED: { label: "Approved", color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
};

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
