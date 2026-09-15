"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert as AuditIcon,
  BookMarked,
  CalendarRange,
  History,
  Loader2,
  Plus,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
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
import { api, formatDate, type AuthUser, type Role } from "@/lib/api";

interface Props {
  user: AuthUser;
}

const ROLES_LIST: Role[] = ["Superadmin", "Principal", "Coordinator", "Teacher"];

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

  // Assignments
  const [assignments, setAssignments] = useState<
    (AuthUser extends never ? never : {
      id: string;
      teacher: { name: string; username: string };
      gradeId: string;
      subjectId: string;
      grade: { gradeNumber: number; displayName: string };
      subject: { name: string; code: string };
    })[]
  >([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [aTeacher, setATeacher] = useState("");
  const [aGrade, setAGrade] = useState("");
  const [aSubject, setASubject] = useState("");
  const [aAy, setAAy] = useState("");
  const [savingAssign, setSavingAssign] = useState(false);

  // Grades & subjects (for assignment creation)
  const [grades, setGrades] = useState<{ id: string; gradeNumber: number; displayName: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string; code: string }[]>([]);
  const [academicYears, setAcademicYears] = useState<{ id: string; year: string; active: boolean }[]>([]);
  const [activeAy, setActiveAy] = useState<string>("");

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
    const [g, s, y] = await Promise.all([
      api.grades(),
      api.subjects(),
      api.admin.academicYears(),
    ]);
    setGrades(g.grades);
    setSubjects(s.subjects);
    setAcademicYears(y.years);
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

  function openNewUser() {
    setEditingUser(null);
    setUName("");
    setUUsername("");
    setUPassword("");
    setURole("Teacher");
    setUActive(true);
    setShowUserDialog(true);
  }

  function openEditUser(u: AuthUser) {
    setEditingUser(u);
    setUName(u.name);
    setUUsername(u.username);
    setUPassword("");
    setURole(u.role);
    setUActive(u.active);
    setShowUserDialog(true);
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
        await api.admin.updateUser(editingUser.id, body);
        toast.success("User updated");
      } else {
        await api.admin.createUser({
          name: uName.trim(),
          username: uUsername.trim(),
          password: uPassword,
          roleName: uRole,
          active: uActive,
        });
        toast.success("User created");
      }
      setShowUserDialog(false);
      loadUsers();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingUser(false);
    }
  }

  async function deleteUser(u: AuthUser) {
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
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Superadmin Console
          </h1>
          <Badge className="bg-violet-100 text-violet-700 border-0">
            <ShieldCheck className="mr-1 h-3 w-3" /> Full access
          </Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Signed in as {user.name}. Manage users, assignments, academic years &amp;
          audit trail.
        </p>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <TabsList className="bg-slate-100/80 p-1">
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-4 w-4" /> Users
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

        {/* USERS */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total Users", value: stats.total, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Teachers", value: stats.teachers, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Admin Staff", value: stats.admins, icon: ShieldCheck, color: "text-violet-600", bg: "bg-violet-50" },
              { label: "Inactive", value: stats.inactive, icon: UserCog, color: "text-rose-500", bg: "bg-rose-50" },
            ].map((s) => (
              <Card key={s.label} className="border-slate-200/70 p-4">
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

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Staff Directory</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadUsers} disabled={loadingUsers}>
                <RefreshCw className={`h-4 w-4 ${loadingUsers ? "animate-spin" : ""}`} />
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={openNewUser}>
                <Plus className="mr-1 h-4 w-4" /> Add User
              </Button>
            </div>
          </div>

          <Card className="border-slate-200/70 overflow-hidden">
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
                  {users.map((u) => (
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
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* ASSIGNMENTS */}
        <TabsContent value="assignments" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Teacher Assignments
              </h2>
              <p className="text-xs text-slate-500">
                Map teachers to grades &amp; subjects for the active academic year.
              </p>
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
          <Card className="border-slate-200/70 overflow-hidden">
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
                          <span className="ml-1 text-xs text-slate-400">
                            @{a.teacher.username}
                          </span>
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
        </TabsContent>

        {/* ACADEMIC YEARS */}
        <TabsContent value="academic" className="space-y-4">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="border-slate-200/70 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-100 text-blue-600">
                  <CalendarRange className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Create Academic Year
                </h2>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">
                    Year (e.g. 2026-2027)
                  </Label>
                  <Input
                    placeholder="2026-2027"
                    value={newAyYear}
                    onChange={(e) => setNewAyYear(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Set as active year
                    </p>
                    <p className="text-xs text-slate-500">
                      Deactivates all other years.
                    </p>
                  </div>
                  <Switch checked={newAyActive} onCheckedChange={setNewAyActive} />
                </div>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={savingAy}
                  onClick={createAcademicYear}
                >
                  {savingAy ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-1 h-4 w-4" />
                  )}
                  Create
                </Button>
              </div>
            </Card>

            <Card className="border-slate-200/70 p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">
                Existing Academic Years
              </h2>
              <div className="space-y-2">
                {academicYears.map((ay) => (
                  <div
                    key={ay.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <CalendarRange className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-800">
                        {ay.year}
                      </span>
                    </div>
                    {ay.active ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-500">
                        Archived
                      </Badge>
                    )}
                  </div>
                ))}
                {academicYears.length === 0 && (
                  <p className="py-6 text-center text-xs text-slate-400">
                    No academic years yet.
                  </p>
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
              <p className="text-xs text-slate-500">
                Last 200 system actions.
              </p>
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800">
                          {log.action}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {log.detail || "—"}
                      </p>
                    </div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="py-12 text-center text-sm text-slate-400">
                    No audit entries yet.
                  </div>
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
                : "Create a new staff account."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Full name</Label>
              <Input value={uName} onChange={(e) => setUName(e.target.value)} placeholder="e.g. Omkar RG" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Username</Label>
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
                  <span className="font-normal text-slate-400">
                    (leave blank to keep)
                  </span>
                )}
              </Label>
              <Input
                type="password"
                value={uPassword}
                onChange={(e) => setUPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Select value={uRole} onValueChange={(v) => setURole(v as Role)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES_LIST.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
              <span className="text-sm font-medium text-slate-700">Active</span>
              <Switch checked={uActive} onCheckedChange={setUActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveUser} disabled={savingUser} className="bg-blue-600 hover:bg-blue-700">
              {savingUser && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {editingUser ? "Save changes" : "Create user"}
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
                  {users
                    .filter((u) => u.role === "Teacher")
                    .map((u) => (
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
                    <SelectItem key={g.id} value={g.id}>
                      {g.displayName}
                    </SelectItem>
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
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
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
                      {ay.year}
                      {ay.active ? " (active)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveAssignment} disabled={savingAssign} className="bg-blue-600 hover:bg-blue-700">
              {savingAssign && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
