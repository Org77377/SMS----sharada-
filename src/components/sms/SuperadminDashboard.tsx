"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert as AuditIcon,
  BookMarked,
  CalendarRange,
  Copy,
  GraduationCap,
  History,
  Loader2,
  Plus,
  RefreshCw,
  ScrollText,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  Wand2,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { api, formatDate, type AuthUser, type Role, type Department } from "@/lib/api";

interface Props {
  user: AuthUser;
}

const ROLES_LIST: Role[] = [
  "Superadmin",
  "Principal",
  "HOD",
  "Exam Coordinator",
  "Teacher",
];

// Generate a username from a full name: first name lowercased, or initials
function suggestUsername(name: string): string {
  const parts = name.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  // first name + last initial
  return parts[0] + parts[parts.length - 1][0];
}

function randomPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function SuperadminDashboard({ user }: Props) {
  const [tab, setTab] = useState("users");

  // Users
  const [users, setUsers] = useState<(AuthUser & { createdAt: string })[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [uName, setUName] = useState("");
  const [uUsername, setUUsername] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uRole, setURole] = useState<Role>("Teacher");
  const [uActive, setUActive] = useState(true);
  const [savingUser, setSavingUser] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ username: string; password: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  // Superadmin delete requires a passkey (opens a dedicated dialog)
  const [superadminToDelete, setSuperadminToDelete] = useState<AuthUser | null>(null);
  const [passkeyInput, setPasskeyInput] = useState("");
  const [deletingSuperadmin, setDeletingSuperadmin] = useState(false);
  // Clear all teachers
  const [showClearTeachers, setShowClearTeachers] = useState(false);
  const [clearingTeachers, setClearingTeachers] = useState(false);

  // Assignments
  const [assignments, setAssignments] = useState<
    {
      id: string;
      teacher: { name: string; username: string };
      gradeId: string;
      subjectId: string;
      grade: { gradeNumber: number; displayName: string };
      subject: { name: string; code: string };
    }[]
  >([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [aTeacher, setATeacher] = useState("");
  const [aGrade, setAGrade] = useState("");
  const [aSubject, setASubject] = useState("");
  const [aAy, setAAy] = useState("");
  const [savingAssign, setSavingAssign] = useState(false);

  // Grades & subjects
  const [grades, setGrades] = useState<{ id: string; gradeNumber: number; displayName: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string; code: string; departmentId: string | null; departmentName: string | null }[]>([]);
  const [academicYears, setAcademicYears] = useState<{ id: string; year: string; active: boolean }[]>([]);
  const [activeAy, setActiveAy] = useState<string>("");
  const [newGradeNum, setNewGradeNum] = useState("");
  const [newGradeName, setNewGradeName] = useState("");
  const [savingGrade, setSavingGrade] = useState(false);

  // Departments
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDeptName, setNewDeptName] = useState("");
  const [savingDept, setSavingDept] = useState(false);
  // Department field on the user dialog (for HODs)
  const [uDepartmentId, setUDepartmentId] = useState<string>("");

  // New academic year
  const [newAyYear, setNewAyYear] = useState("");
  const [newAyActive, setNewAyActive] = useState(true);
  const [savingAy, setSavingAy] = useState(false);

  // Audit logs
  const [logs, setLogs] = useState<{ id: string; actorId: string | null; action: string; detail: string | null; createdAt: string }[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { users } = await api.admin.users();
      setUsers(users);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadAssignments = useCallback(async () => {
    setLoadingAssignments(true);
    try {
      const { assignments, academicYear } = await api.admin.assignments();
      setAssignments(assignments as typeof assignments);
      if (academicYear) setActiveAy(academicYear.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  const loadMeta = useCallback(async () => {
    const [g, s, y, d] = await Promise.all([
      api.grades(),
      api.subjects(),
      api.admin.academicYears(),
      api.admin.departments(),
    ]);
    setGrades(g.grades);
    setSubjects(s.subjects as typeof subjects);
    setAcademicYears(y.years);
    setDepartments(d.departments);
    const active = y.years.find((ay) => ay.active);
    if (active) setActiveAy(active.id);
  }, []);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const { logs } = await api.admin.auditLogs();
      setLogs(logs);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadMeta();
  }, [loadUsers, loadMeta]);

  useEffect(() => {
    if (tab === "assignments" && assignments.length === 0) loadAssignments();
    if (tab === "audit") loadLogs();
  }, [tab, assignments.length, loadAssignments, loadLogs]);

  // ---- User dialog helpers ----
  function openNewUser() {
    setEditingUser(null);
    setUName("");
    setUUsername("");
    setUPassword("");
    setURole("Teacher");
    setUActive(true);
    setUDepartmentId("");
    setCreatedCreds(null);
    setShowUserDialog(true);
  }

  function openEditUser(u: AuthUser) {
    setEditingUser(u);
    setUName(u.name);
    setUUsername(u.username);
    setUPassword("");
    setURole(u.role);
    setUActive(u.active);
    setUDepartmentId(u.departmentId ?? "");
    setCreatedCreds(null);
    setShowUserDialog(true);
  }

  // Auto-suggest username + password as the admin types the teacher's name
  function onNameChange(name: string) {
    setUName(name);
    if (!editingUser && !createdCreds) {
      const suggested = suggestUsername(name);
      if (suggested) setUUsername(suggested);
      if (!uPassword) setUPassword(randomPassword());
    }
  }

  function regenerateCreds() {
    if (editingUser) return;
    setUUsername(suggestUsername(uName) || uUsername);
    setUPassword(randomPassword());
  }

  async function saveUser() {
    if (!uName.trim() || !uUsername.trim()) {
      toast.error("Name and username required");
      return;
    }
    if (!editingUser && !uPassword) {
      toast.error("Password required for new users");
      return;
    }
    setSavingUser(true);
    try {
      if (editingUser) {
        const body: Record<string, unknown> = {
          name: uName.trim(),
          roleName: uRole,
          active: uActive,
        };
        if (uPassword) body.password = uPassword;
        if (uRole === "HOD") body.departmentId = uDepartmentId || null;
        else body.departmentId = null;
        await api.admin.updateUser(editingUser.id, body);
        toast.success("User updated");
      } else {
        await api.admin.createUser({
          name: uName.trim(),
          username: uUsername.trim(),
          password: uPassword,
          roleName: uRole,
          active: uActive,
          departmentId: uRole === "HOD" ? (uDepartmentId || undefined) : undefined,
        });
        toast.success("User created");
        setCreatedCreds({ username: uUsername.trim(), password: uPassword });
      }
      loadUsers();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingUser(false);
    }
  }

  function copyCreds() {
    if (!createdCreds) return;
    navigator.clipboard.writeText(
      `Username: ${createdCreds.username}\nPassword: ${createdCreds.password}`
    );
    toast.success("Credentials copied to clipboard");
  }

  async function deleteUser(u: AuthUser) {
    // Superadmin accounts require a special passkey — open the passkey dialog.
    if (u.role === "Superadmin") {
      setSuperadminToDelete(u);
      setPasskeyInput("");
      return;
    }
    if (!confirm(`Delete user "${u.name}" (@${u.username})? This cannot be undone.`))
      return;
    try {
      await api.admin.deleteUser(u.id);
      toast.success("User deleted");
      loadUsers();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function confirmDeleteSuperadmin() {
    if (!superadminToDelete) return;
    if (!passkeyInput.trim()) {
      toast.error("Passkey is required to remove a Superadmin.");
      return;
    }
    setDeletingSuperadmin(true);
    try {
      await api.admin.deleteUser(superadminToDelete.id, passkeyInput.trim());
      toast.success(`Superadmin ${superadminToDelete.username} removed`);
      setSuperadminToDelete(null);
      setPasskeyInput("");
      loadUsers();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeletingSuperadmin(false);
    }
  }

  async function clearAllTeachers() {
    setClearingTeachers(true);
    try {
      const { removed, message } = await api.admin.clearTeachers();
      if (message && removed === 0) {
        toast.info(message);
      } else {
        toast.success(`Removed ${removed} teacher account${removed === 1 ? "" : "s"}`);
      }
      setShowClearTeachers(false);
      loadUsers();
      if (tab === "assignments") loadAssignments();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setClearingTeachers(false);
    }
  }

  // ---- Assignments ----
  async function saveAssignment() {
    if (!aTeacher || !aGrade || !aSubject || !aAy) {
      toast.error("All fields required");
      return;
    }
    setSavingAssign(true);
    try {
      await api.admin.createAssignment({
        teacherId: aTeacher,
        gradeId: aGrade,
        subjectId: aSubject,
        academicYearId: aAy,
      });
      toast.success("Assignment created");
      setShowAssignDialog(false);
      setATeacher("");
      setAGrade("");
      setASubject("");
      loadAssignments();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingAssign(false);
    }
  }

  async function removeAssignment(id: string) {
    if (!confirm("Remove this assignment?")) return;
    try {
      await api.admin.deleteAssignment(id);
      toast.success("Assignment removed");
      loadAssignments();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  // ---- Grades ----
  async function createGrade() {
    const num = Number(newGradeNum);
    if (!num || !newGradeName.trim()) {
      toast.error("Grade number and display name required");
      return;
    }
    setSavingGrade(true);
    try {
      await api.admin.createGrade({ gradeNumber: num, displayName: newGradeName.trim() });
      toast.success("Grade added");
      setNewGradeNum("");
      setNewGradeName("");
      loadMeta();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingGrade(false);
    }
  }

  async function deleteGrade(id: string, name: string) {
    if (!confirm(`Delete ${name}? This also removes its units and assignments.`)) return;
    try {
      await api.admin.deleteGrade(id);
      toast.success("Grade removed");
      loadMeta();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  // ---- Departments ----
  async function createDepartment() {
    if (!newDeptName.trim()) {
      toast.error("Department name required");
      return;
    }
    setSavingDept(true);
    try {
      await api.admin.createDepartment(newDeptName.trim());
      toast.success("Department created");
      setNewDeptName("");
      loadMeta();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingDept(false);
    }
  }

  async function deleteDepartment(id: string, name: string) {
    if (!confirm(`Delete department "${name}"? Subjects in it will become unassigned.`)) return;
    try {
      await api.admin.deleteDepartment(id);
      toast.success("Department removed");
      loadMeta();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function assignSubjectDepartment(subjectId: string, departmentId: string) {
    try {
      await api.admin.updateSubject(subjectId, {
        departmentId: departmentId || null,
      });
      loadMeta();
      toast.success("Department assigned");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  // ---- Academic years ----
  async function createAcademicYear() {
    if (!newAyYear.trim()) {
      toast.error("Year is required (e.g. 2026-2027)");
      return;
    }
    setSavingAy(true);
    try {
      await api.admin.createAcademicYear({ year: newAyYear.trim(), active: newAyActive });
      toast.success("Academic year created");
      setNewAyYear("");
      setNewAyActive(true);
      loadMeta();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingAy(false);
    }
  }

  // ---- Derived ----
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery, roleFilter]);

  const stats = useMemo(
    () => ({
      total: users.length,
      teachers: users.filter((u) => u.role === "Teacher").length,
      admins: users.filter((u) => u.role !== "Teacher").length,
      inactive: users.filter((u) => !u.active).length,
    }),
    [users]
  );

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-6 sm:py-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Superadmin Console
          </h1>
          <Badge className="bg-violet-100 text-violet-700 border-0">
            <ShieldCheck className="mr-1 h-3 w-3" /> Full access
          </Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Signed in as {user.name}. Manage users, assignments, grades &amp; audit trail.
        </p>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <ScrollArea className="w-full whitespace-nowrap sms-scroll">
          <TabsList className="bg-slate-100/80 p-1 inline-flex">
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-4 w-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="grades" className="gap-1.5">
              <GraduationCap className="h-4 w-4" /> Grades
            </TabsTrigger>
            <TabsTrigger value="departments" className="gap-1.5">
              <Building2 className="h-4 w-4" /> Departments
            </TabsTrigger>
            <TabsTrigger value="assignments" className="gap-1.5">
              <BookMarked className="h-4 w-4" /> Assignments
            </TabsTrigger>
            <TabsTrigger value="academic" className="gap-1.5">
              <CalendarRange className="h-4 w-4" /> Academic Years
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5">
              <History className="h-4 w-4" /> Audit Logs
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        {/* USERS */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total Users", value: stats.total, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Teachers", value: stats.teachers, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Admin Staff", value: stats.admins, icon: ShieldCheck, color: "text-violet-600", bg: "bg-violet-50" },
              { label: "Inactive", value: stats.inactive, icon: UserCog, color: "text-rose-500", bg: "bg-rose-50" },
            ].map((s) => (
              <Card key={s.label} className="border-slate-200/70 p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <div className={`grid h-9 w-9 place-items-center rounded-lg ${s.bg}`}>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none text-slate-900">
                      {s.value}
                    </p>
                    <p className="text-xs text-slate-500">{s.label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Search + actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search name, username or role…"
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-10 sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {ROLES_LIST.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadUsers} disabled={loadingUsers}>
                <RefreshCw className={`h-4 w-4 ${loadingUsers ? "animate-spin" : ""}`} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => setShowClearTeachers(true)}
                disabled={stats.teachers === 0}
                title="Remove all teacher accounts"
              >
                <Trash2 className="mr-1 h-4 w-4" /> Clear Teachers
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={openNewUser}>
                <Plus className="mr-1 h-4 w-4" /> Add User
              </Button>
            </div>
          </div>

          {/* Desktop: table; Mobile: cards */}
          <Card className="hidden border-slate-200/70 overflow-hidden sm:block">
            <ScrollArea className="h-[60vh] sms-scroll">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70">
                    <TableHead className="text-xs uppercase text-slate-500">Name</TableHead>
                    <TableHead className="text-xs uppercase text-slate-500">Username</TableHead>
                    <TableHead className="text-xs uppercase text-slate-500">Role</TableHead>
                    <TableHead className="text-xs uppercase text-slate-500">Status</TableHead>
                    <TableHead className="text-xs uppercase text-slate-500">Created</TableHead>
                    <TableHead className="text-right text-xs uppercase text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id} className="hover:bg-slate-50/60">
                      <TableCell className="font-medium text-slate-800">{u.name}</TableCell>
                      <TableCell className="text-slate-500">@{u.username}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.active ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" /> Inactive
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatDate(u.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={() => openEditUser(u)}
                          >
                            <UserCog className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-rose-500 hover:text-rose-600"
                            onClick={() => deleteUser(u)}
                            disabled={u.id === user.id}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-400">
                        No users match your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>

          {/* Mobile: card list */}
          <div className="space-y-2 sm:hidden">
            {filteredUsers.map((u) => (
              <Card key={u.id} className="border-slate-200/70 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{u.name}</p>
                    <p className="truncate text-xs text-slate-500">@{u.username}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-[10px]">
                        {u.role}
                      </Badge>
                      {u.active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" /> Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEditUser(u)}>
                      <UserCog className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600"
                      onClick={() => deleteUser(u)}
                      disabled={u.id === user.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {filteredUsers.length === 0 && (
              <Card className="border-dashed border-slate-300 p-8 text-center">
                <p className="text-sm text-slate-400">No users match your search.</p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* GRADES */}
        <TabsContent value="grades" className="space-y-4">
          <Card className="border-slate-200/70 p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-100 text-blue-600">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Add Grade</h2>
                <p className="text-xs text-slate-500">Grades are configurable — add or remove any.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Grade Number</Label>
                <Input
                  type="number"
                  placeholder="e.g. 11"
                  value={newGradeNum}
                  onChange={(e) => setNewGradeNum(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Display Name</Label>
                <Input
                  placeholder="e.g. Grade 11"
                  value={newGradeName}
                  onChange={(e) => setNewGradeName(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={savingGrade}
                  onClick={createGrade}
                >
                  {savingGrade ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-1 h-4 w-4" />
                  )}
                  Add
                </Button>
              </div>
            </div>
          </Card>

          <Card className="border-slate-200/70 p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Existing Grades</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {grades.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {g.displayName}
                    </p>
                    <p className="text-[11px] text-slate-400">#{g.gradeNumber}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 p-0 text-rose-500 hover:text-rose-600"
                    onClick={() => deleteGrade(g.id, g.displayName)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {grades.length === 0 && (
                <p className="col-span-full py-6 text-center text-xs text-slate-400">
                  No grades configured yet.
                </p>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* DEPARTMENTS */}
        <TabsContent value="departments" className="space-y-4">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="border-slate-200/70 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-100 text-blue-600">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Add Department</h2>
                  <p className="text-xs text-slate-500">Group subjects under departments for HOD oversight.</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Department Name</Label>
                  <Input
                    placeholder="e.g. Science & Mathematics"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") createDepartment(); }}
                  />
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700" disabled={savingDept} onClick={createDepartment}>
                  {savingDept ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                  Add Department
                </Button>
              </div>
            </Card>

            <Card className="border-slate-200/70 p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Existing Departments</h2>
              <div className="space-y-2">
                {departments.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-800">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-[10px]">
                        {d.subjectCount} subjects · {d.hodCount} HOD{d.hodCount === 1 ? "" : "s"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600"
                        onClick={() => deleteDepartment(d.id, d.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {departments.length === 0 && (
                  <p className="py-6 text-center text-xs text-slate-400">No departments yet.</p>
                )}
              </div>
            </Card>
          </div>

          {/* Subject → Department assignment */}
          <Card className="border-slate-200/70 p-5">
            <h2 className="mb-1 text-sm font-semibold text-slate-900">Assign Subjects to Departments</h2>
            <p className="mb-3 text-xs text-slate-500">
              An HOD assigned to a department will only see submissions for subjects in that department.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {subjects.map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{s.name}</p>
                    <p className="text-[11px] text-slate-400">{s.code}</p>
                  </div>
                  <Select
                    value={s.departmentId ?? "none"}
                    onValueChange={(v) => assignSubjectDepartment(s.id, v === "none" ? "" : v)}
                  >
                    <SelectTrigger className="h-8 w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— No department —</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              {subjects.length === 0 && (
                <p className="col-span-full py-6 text-center text-xs text-slate-400">No subjects yet.</p>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ASSIGNMENTS */}
        <TabsContent value="assignments" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Teacher Assignments</h2>
              <p className="text-xs text-slate-500">Map teachers to grades &amp; subjects.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadAssignments} disabled={loadingAssignments}>
                <RefreshCw className={`h-4 w-4 ${loadingAssignments ? "animate-spin" : ""}`} />
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowAssignDialog(true)}>
                <Plus className="mr-1 h-4 w-4" /> Assign
              </Button>
            </div>
          </div>
          <Card className="hidden border-slate-200/70 overflow-hidden sm:block">
            <ScrollArea className="h-[55vh] sms-scroll">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70">
                    <TableHead className="text-xs uppercase text-slate-500">Teacher</TableHead>
                    <TableHead className="text-xs uppercase text-slate-500">Grade</TableHead>
                    <TableHead className="text-xs uppercase text-slate-500">Subject</TableHead>
                    <TableHead className="text-right text-xs uppercase text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-sm text-slate-400">
                        No assignments yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignments.map((a) => (
                      <TableRow key={a.id} className="hover:bg-slate-50/60">
                        <TableCell className="font-medium text-slate-800">
                          {a.teacher.name}
                          <span className="ml-1 text-xs text-slate-400">@{a.teacher.username}</span>
                        </TableCell>
                        <TableCell>{a.grade.displayName}</TableCell>
                        <TableCell>
                          {a.subject.name}{" "}
                          <span className="text-xs text-slate-400">({a.subject.code})</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-rose-500 hover:text-rose-600"
                            onClick={() => removeAssignment(a.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
          {/* Mobile assignment cards */}
          <div className="space-y-2 sm:hidden">
            {assignments.map((a) => (
              <Card key={a.id} className="border-slate-200/70 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{a.teacher.name}</p>
                    <p className="truncate text-xs text-slate-500">@{a.teacher.username}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[10px]">{a.grade.displayName}</Badge>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-[10px]">{a.subject.name}</Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 p-0 text-rose-500 hover:text-rose-600"
                    onClick={() => removeAssignment(a.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
            {assignments.length === 0 && (
              <Card className="border-dashed border-slate-300 p-8 text-center">
                <p className="text-sm text-slate-400">No assignments yet.</p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ACADEMIC YEARS */}
        <TabsContent value="academic" className="space-y-4">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="border-slate-200/70 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-100 text-blue-600">
                  <CalendarRange className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">Create Academic Year</h2>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Year (e.g. 2026-2027)</Label>
                  <Input
                    placeholder="2026-2027"
                    value={newAyYear}
                    onChange={(e) => setNewAyYear(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Set as active year</p>
                    <p className="text-xs text-slate-500">Deactivates all other years.</p>
                  </div>
                  <Switch checked={newAyActive} onCheckedChange={setNewAyActive} />
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700" disabled={savingAy} onClick={createAcademicYear}>
                  {savingAy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                  Create
                </Button>
              </div>
            </Card>

            <Card className="border-slate-200/70 p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Existing Academic Years</h2>
              <div className="space-y-2">
                {academicYears.map((ay) => (
                  <div key={ay.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <CalendarRange className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-800">{ay.year}</span>
                    </div>
                    {ay.active ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-500">Archived</Badge>
                    )}
                  </div>
                ))}
                {academicYears.length === 0 && (
                  <p className="py-6 text-center text-xs text-slate-400">No academic years yet.</p>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* AUDIT LOGS */}
        <TabsContent value="audit" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <AuditIcon className="h-4 w-4 text-slate-400" /> Audit Trail
              </h2>
              <p className="text-xs text-slate-500">Last 200 system actions.</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadLogs} disabled={loadingLogs}>
              <RefreshCw className={`h-4 w-4 ${loadingLogs ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <Card className="border-slate-200/70 p-0 overflow-hidden">
            <ScrollArea className="h-[60vh] sms-scroll">
              <div className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                      <ScrollText className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800">{log.action}</span>
                        <span className="text-[11px] text-slate-400">{formatDate(log.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600">{log.detail || "—"}</p>
                    </div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="py-12 text-center text-sm text-slate-400">No audit entries yet.</div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit user" : "Add user"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? `Editing @${editingUser.username}`
                : "Create a new staff account. Username & password are auto-suggested — copy them to share with the staff member."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Full name</Label>
              <Input value={uName} onChange={(e) => onNameChange(e.target.value)} placeholder="e.g. Omkar RG" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Username</Label>
                {!editingUser && (
                  <button
                    type="button"
                    onClick={regenerateCreds}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                  >
                    <Wand2 className="h-3 w-3" /> Auto-generate
                  </button>
                )}
              </div>
              <Input
                value={uUsername}
                onChange={(e) => setUUsername(e.target.value)}
                placeholder="e.g. omkar"
                disabled={!!editingUser}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Password{" "}
                {editingUser && (
                  <span className="font-normal text-slate-400">(leave blank to keep)</span>
                )}
              </Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={uPassword}
                  onChange={(e) => setUPassword(e.target.value)}
                  placeholder="••••••••"
                  className="font-mono"
                />
                {!editingUser && (
                  <Button type="button" variant="outline" size="sm" onClick={regenerateCreds}>
                    <Wand2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Select value={uRole} onValueChange={(v) => setURole(v as Role)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES_LIST.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {uRole === "HOD" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Department (HOD oversight)</Label>
                <Select value={uDepartmentId} onValueChange={setUDepartmentId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="— Select department —" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400">
                  This HOD will only see submissions for subjects in this department.
                </p>
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
              <span className="text-sm font-medium text-slate-700">Active</span>
              <Switch checked={uActive} onCheckedChange={setUActive} />
            </div>

            {/* Credentials summary after creation */}
            {createdCreds && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="mb-1 text-xs font-semibold text-emerald-800">
                  ✓ Account created — share these credentials
                </p>
                <p className="font-mono text-xs text-emerald-900">
                  Username: {createdCreds.username}
                  <br />
                  Password: {createdCreds.password}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                  onClick={copyCreds}
                >
                  <Copy className="mr-1 h-3 w-3" /> Copy
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUserDialog(false); setCreatedCreds(null); }}>
              {createdCreds ? "Close" : "Cancel"}
            </Button>
            <Button onClick={saveUser} disabled={savingUser} className="bg-blue-600 hover:bg-blue-700">
              {savingUser && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {editingUser ? "Save changes" : createdCreds ? "Saved" : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New teacher assignment</DialogTitle>
            <DialogDescription>
              Assign a teacher to a grade + subject for an academic year.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Teacher</Label>
              <Select value={aTeacher} onValueChange={setATeacher}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter((u) => u.role === "Teacher").map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} (@{u.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Grade</Label>
              <Select value={aGrade} onValueChange={setAGrade}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Subject</Label>
              <Select value={aSubject} onValueChange={setASubject}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Academic Year</Label>
              <Select value={aAy} onValueChange={setAAy}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((ay) => (
                    <SelectItem key={ay.id} value={ay.id}>
                      {ay.year}{ay.active ? " (active)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
            <Button onClick={saveAssignment} disabled={savingAssign} className="bg-blue-600 hover:bg-blue-700">
              {savingAssign && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Superadmin delete — passkey dialog */}
      <Dialog
        open={!!superadminToDelete}
        onOpenChange={(o) => {
          if (!o) {
            setSuperadminToDelete(null);
            setPasskeyInput("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Superadmin</DialogTitle>
            <DialogDescription>
              {superadminToDelete
                ? `Removing ${superadminToDelete.name} (@${superadminToDelete.username}). This is a Superadmin account — enter the authorized passkey to confirm.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-800">
                <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
                Superadmin removal is protected. Only someone with the authorized
                passkey can complete this action. All attempts are logged.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Passkey</Label>
              <Input
                type="password"
                autoFocus
                placeholder="Enter passkey"
                value={passkeyInput}
                onChange={(e) => setPasskeyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmDeleteSuperadmin();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSuperadminToDelete(null);
                setPasskeyInput("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteSuperadmin}
              disabled={deletingSuperadmin || !passkeyInput.trim()}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deletingSuperadmin && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Remove Superadmin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear all teachers — confirmation */}
      <Dialog open={showClearTeachers} onOpenChange={setShowClearTeachers}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear all teachers</DialogTitle>
            <DialogDescription>
              This will permanently remove{" "}
              <span className="font-semibold text-slate-900">
                {stats.teachers} teacher account{stats.teachers === 1 ? "" : "s"}
              </span>{" "}
              along with their syllabus units and assignments. Admin staff
              (Superadmin / Principal / HOD / Exam Coordinator) are{" "}
              <span className="font-semibold">not</span> affected.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
            <p className="text-xs text-rose-700">
              This action cannot be undone. Type nothing — just click{" "}
              <span className="font-semibold">Clear Teachers</span> to confirm.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearTeachers(false)}>
              Cancel
            </Button>
            <Button
              onClick={clearAllTeachers}
              disabled={clearingTeachers || stats.teachers === 0}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {clearingTeachers ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-4 w-4" />
              )}
              Clear Teachers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
