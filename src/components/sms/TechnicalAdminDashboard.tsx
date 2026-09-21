"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  History,
  Loader2,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  ScrollText,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  api,
  formatDate,
  type AuthUser,
  type CompiledDoc,
  type PendingAction,
} from "@/lib/api";
import { CompiledDocView } from "./CompiledDocView";

interface Props {
  user: AuthUser;
}

const ACTION_LABELS: Record<string, string> = {
  USER_CREATE: "Create Teacher",
  USER_UPDATE: "Edit Teacher",
  USER_DELETE: "Delete Teacher",
};

export function TechnicalAdminDashboard({ user }: Props) {
  const [tab, setTab] = useState("users");

  // Users (read-only)
  const [users, setUsers] = useState<(AuthUser & { createdAt: string })[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Pending actions (own requests)
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  // Audit logs
  const [logs, setLogs] = useState<{ id: string; actorId: string | null; action: string; detail: string | null; createdAt: string }[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Compile
  const [allGrades, setAllGrades] = useState<{ id: string; gradeNumber: number; displayName: string }[]>([]);
  const [compileGrade, setCompileGrade] = useState<number>(4);
  const [compileTerm, setCompileTerm] = useState<string>("all");
  const [compiled, setCompiled] = useState<CompiledDoc | null>(null);
  const [loadingCompile, setLoadingCompile] = useState(false);
  const [exporting, setExporting] = useState(false);
  const compileRef = useRef<HTMLDivElement>(null);

  // Propose dialogs
  const [showProposeCreate, setShowProposeCreate] = useState(false);
  const [proposeEditTarget, setProposeEditTarget] = useState<AuthUser | null>(null);
  const [proposeDeleteTarget, setProposeDeleteTarget] = useState<AuthUser | null>(null);
  // Form fields for propose create/edit
  const [pName, setPName] = useState("");
  const [pUsername, setPUsername] = useState("");
  const [pPassword, setPPassword] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pActive, setPActive] = useState(true);
  const [savingProposal, setSavingProposal] = useState(false);

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

  const loadPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const { actions } = await api.admin.pendingActions();
      setPendingActions(actions);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingPending(false);
    }
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

  const loadCompile = useCallback(async () => {
    setLoadingCompile(true);
    try {
      const doc = await api.compile(
        compileGrade,
        compileTerm === "all" ? undefined : compileTerm
      );
      setCompiled(doc);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingCompile(false);
    }
  }, [compileGrade, compileTerm]);

  useEffect(() => {
    loadUsers();
    api.grades().then(({ grades }) => {
      setAllGrades(grades);
      if (grades.length > 0 && !grades.find((g) => g.gradeNumber === compileGrade)) {
        setCompileGrade(grades[0].gradeNumber);
      }
    }).catch(() => {});
  }, [loadUsers]);

  useEffect(() => {
    if (tab === "requests") loadPending();
    if (tab === "audit") loadLogs();
  }, [tab, loadPending, loadLogs]);

  useEffect(() => {
    loadCompile();
  }, [loadCompile]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const pendingCount = pendingActions.filter((a) => a.status === "PENDING").length;

  // ---- Propose actions ----
  function openProposeCreate() {
    setPName("");
    setPUsername("");
    setPPassword("");
    setPPhone("");
    setPEmail("");
    setPActive(true);
    setShowProposeCreate(true);
  }

  function openProposeEdit(u: AuthUser) {
    setProposeEditTarget(u);
    setPName(u.name);
    setPUsername(u.username);
    setPPassword("");
    setPPhone(u.phone ?? "");
    setPEmail(u.email ?? "");
    setPActive(u.active);
  }

  async function submitProposeCreate() {
    if (!pName.trim() || !pUsername.trim() || !pPassword.trim()) {
      toast.error("Name, username and password are required");
      return;
    }
    setSavingProposal(true);
    try {
      await api.admin.createPendingAction({
        actionType: "USER_CREATE",
        actionData: JSON.stringify({
          name: pName.trim(),
          username: pUsername.trim().toLowerCase(),
          password: pPassword,
          phone: pPhone.trim() || null,
          email: pEmail.trim() || null,
          active: pActive,
        }),
      });
      toast.success("Proposed to Principal for approval");
      setShowProposeCreate(false);
      loadPending();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingProposal(false);
    }
  }

  async function submitProposeEdit() {
    if (!proposeEditTarget) return;
    setSavingProposal(true);
    try {
      const payload: Record<string, unknown> = {
        name: pName.trim(),
        phone: pPhone.trim() || null,
        email: pEmail.trim() || null,
        active: pActive,
      };
      if (pPassword) payload.password = pPassword;
      await api.admin.createPendingAction({
        actionType: "USER_UPDATE",
        targetUserId: proposeEditTarget.id,
        actionData: JSON.stringify(payload),
      });
      toast.success("Edit request sent to Principal");
      setProposeEditTarget(null);
      loadPending();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingProposal(false);
    }
  }

  async function submitProposeDelete() {
    if (!proposeDeleteTarget) return;
    setSavingProposal(true);
    try {
      await api.admin.createPendingAction({
        actionType: "USER_DELETE",
        targetUserId: proposeDeleteTarget.id,
        actionData: JSON.stringify({ userId: proposeDeleteTarget.id }),
      });
      toast.success("Delete request sent to Principal");
      setProposeDeleteTarget(null);
      loadPending();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingProposal(false);
    }
  }

  // ---- Compile export helpers (reused from CoordinatorDashboard) ----
  function handlePrint() {
    window.print();
  }

  async function handleExportPdf() {
    if (!compiled) return;
    setExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const res = await fetch("/school-header.png");
      const blob = await res.blob();
      const headerImage = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const html = buildCompiledHtml(compiled, headerImage);
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;right:0;bottom:0;width:820px;height:1100px;opacity:0;pointer-events:none;border:0;";
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument!;
      doc.open();
      doc.write(html);
      doc.close();
      const filename = `Syllabus_Grade${compiled.grade.number}_${compiled.term.replace(/\s/g, "")}_${compiled.academicYear.replace("/", "-")}.pdf`;
      const target = doc.body.firstElementChild as HTMLElement;
      const imgs = Array.from(target.querySelectorAll("img"));
      await Promise.all(imgs.map((img) => img.complete ? Promise.resolve() : new Promise<void>((r) => { img.onload = () => r(); img.onerror = () => r(); })));
      await new Promise<void>((r) => setTimeout(r, 250));
      await html2pdf().set({
        margin: [10, 10, 12, 10],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      }).from(target).save();
      document.body.removeChild(iframe);
      toast.success("PDF exported");
    } catch (e) {
      toast.error("PDF export failed: " + (e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  function handleExportDocx() {
    if (!compiled) return;
    setExporting(true);
    try {
      const html = buildCompiledHtml(compiled, "");
      const wrapped = `<!DOCTYPE html><html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${compiled.grade.displayName} Syllabus</title></head><body>${html.replace(/^<!DOCTYPE html>.*?<body[^>]*>/s, "").replace(/<\/body>.*$/s, "")}</body></html>`;
      const blob = new Blob(["\ufeff", wrapped], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Syllabus_Grade${compiled.grade.number}_${compiled.term.replace(/\s/g, "")}_${compiled.academicYear.replace("/", "-")}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("DOCX exported");
    } catch (e) {
      toast.error("DOCX export failed: " + (e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-6 sm:py-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Technical Admin Console
          </h1>
          <Badge className="bg-indigo-100 text-indigo-700 border-0">
            <ShieldCheck className="mr-1 h-3 w-3" /> Approval-gated
          </Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Signed in as {user.name}. You can view data, audit logs &amp; compile
          syllabus. Changes to teacher profiles require Principal approval.
        </p>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <ScrollArea className="w-full whitespace-nowrap sms-scroll">
          <TabsList className="bg-slate-100/80 p-1 inline-flex">
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-4 w-4" /> Staff
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-1.5 relative">
              <Send className="h-4 w-4" /> My Requests
              {pendingCount > 0 && (
                <span className="ml-1 grid h-4 min-w-4 place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5">
              <History className="h-4 w-4" /> Audit Logs
            </TabsTrigger>
            <TabsTrigger value="compile" className="gap-1.5">
              <FileText className="h-4 w-4" /> Compile
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        {/* STAFF DIRECTORY (read-only + propose) */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search staff…"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadUsers} disabled={loadingUsers}>
                <RefreshCw className={`h-4 w-4 ${loadingUsers ? "animate-spin" : ""}`} />
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={openProposeCreate}>
                <Plus className="mr-1 h-4 w-4" /> Propose Teacher
              </Button>
            </div>
          </div>

          <Card className="hidden border-slate-200/70 overflow-hidden sm:block">
            <ScrollArea className="h-[55vh] sms-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Name</th>
                    <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-500">Role</th>
                    <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-500">Phone</th>
                    <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-500">Email</th>
                    <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-500">Status</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-slate-500">Propose</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-medium text-slate-800">
                        {u.name}
                        <span className="ml-1 text-xs text-slate-400">@{u.username}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700">{u.role}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">{u.phone || "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">{u.email || "—"}</td>
                      <td className="px-3 py-2.5">
                        {u.active ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {u.role === "Teacher" ? (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-8" onClick={() => openProposeEdit(u)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 text-rose-500 hover:text-rose-600" onClick={() => setProposeDeleteTarget(u)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Read-only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {filteredUsers.map((u) => (
              <Card key={u.id} className="border-slate-200/70 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{u.name}</p>
                    <p className="truncate text-xs text-slate-500">@{u.username}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-[10px]">{u.role}</Badge>
                      {u.active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Inactive</span>
                      )}
                    </div>
                    {u.phone && <p className="mt-1 text-[11px] text-slate-500">{u.phone}</p>}
                    {u.email && <p className="text-[11px] text-slate-500">{u.email}</p>}
                  </div>
                  {u.role === "Teacher" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openProposeEdit(u)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600" onClick={() => setProposeDeleteTarget(u)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* MY REQUESTS */}
        <TabsContent value="requests" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">My Pending Requests</h2>
              <p className="text-xs text-slate-500">Teacher changes you&apos;ve proposed — awaiting Principal approval.</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadPending} disabled={loadingPending}>
              <RefreshCw className={`h-4 w-4 ${loadingPending ? "animate-spin" : ""}`} />
            </Button>
          </div>
          {pendingActions.length === 0 ? (
            <Card className="border-dashed border-slate-300 p-10 text-center">
              <Send className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">No requests yet.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingActions.map((a) => (
                <Card key={a.id} className="border-slate-200/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-0">
                          {ACTION_LABELS[a.actionType] || a.actionType}
                        </Badge>
                        {a.targetName && (
                          <span className="text-sm font-medium text-slate-800">{a.targetName}</span>
                        )}
                        {a.status === "PENDING" && (
                          <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-0">
                            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-amber-500" /> Pending
                          </Badge>
                        )}
                        {a.status === "APPROVED" && (
                          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-0">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Approved
                          </Badge>
                        )}
                        {a.status === "REJECTED" && (
                          <Badge variant="secondary" className="bg-rose-50 text-rose-700 border-0">
                            <XCircle className="mr-1 h-3 w-3" /> Rejected
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Proposed {formatDate(a.createdAt)}
                        {a.reviewerName && ` · Reviewed by ${a.reviewerName}`}
                      </p>
                      {a.reviewerNote && (
                        <p className="mt-1 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">
                          <span className="font-medium">Note:</span> {a.reviewerNote}
                        </p>
                      )}
                      {/* Show proposed data */}
                      <div className="mt-2">
                        <ProposedDataPreview action={a} />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* AUDIT LOGS */}
        <TabsContent value="audit" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ScrollText className="h-4 w-4 text-slate-400" /> Audit Trail
              </h2>
              <p className="text-xs text-slate-500">Who logged in, when, and all system actions.</p>
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
                      <History className="h-3.5 w-3.5" />
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

        {/* COMPILE */}
        <TabsContent value="compile" className="space-y-4">
          <Card className="border-slate-200/70 p-4 sms-dashboard-controls">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Grade</Label>
                <Select value={String(compileGrade)} onValueChange={(v) => setCompileGrade(Number(v))}>
                  <SelectTrigger className="h-9 w-full sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allGrades.map((g) => (
                      <SelectItem key={g.id} value={String(g.gradeNumber)}>{g.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Term</Label>
                <Select value={compileTerm} onValueChange={setCompileTerm}>
                  <SelectTrigger className="h-9 w-full sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Annual Syllabus</SelectItem>
                    <SelectItem value="Term 1">Term 1</SelectItem>
                    <SelectItem value="Term 2">Term 2</SelectItem>
                    <SelectItem value="Mid-Term">Mid-Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="ml-auto flex flex-wrap gap-2 sm:ml-auto">
                <Button variant="outline" size="sm" className="h-9" onClick={handlePrint} disabled={!compiled}>
                  <Printer className="mr-1 h-4 w-4" /> Print
                </Button>
                <Button variant="outline" size="sm" className="h-9" onClick={handleExportPdf} disabled={!compiled || exporting}>
                  {exporting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
                  PDF
                </Button>
                <Button variant="outline" size="sm" className="h-9" onClick={handleExportDocx} disabled={!compiled || exporting}>
                  <Download className="mr-1 h-4 w-4" /> DOCX
                </Button>
              </div>
            </div>
          </Card>
          {loadingCompile ? (
            <div className="flex justify-center py-16 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : compiled ? (
            <CompiledDocView ref={compileRef} doc={compiled} />
          ) : null}
        </TabsContent>
      </Tabs>

      {/* Propose Create dialog */}
      <Dialog open={showProposeCreate} onOpenChange={setShowProposeCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Propose new teacher</DialogTitle>
            <DialogDescription>
              This will be sent to the Principal for approval. The teacher account
              is created only after approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Full name</Label>
              <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="e.g. Ravi Kumar" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Username</Label>
              <Input value={pUsername} onChange={(e) => setPUsername(e.target.value)} placeholder="e.g. ravi" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Password</Label>
              <Input type="text" value={pPassword} onChange={(e) => setPPassword(e.target.value)} placeholder="initial password" className="font-mono" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Mobile number</Label>
                <Input value={pPhone} onChange={(e) => setPPhone(e.target.value)} placeholder="+91 ..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={pEmail} onChange={(e) => setPEmail(e.target.value)} placeholder="name@..." />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
              <span className="text-sm font-medium text-slate-700">Active</span>
              <Button size="sm" variant={pActive ? "default" : "outline"} onClick={() => setPActive(!pActive)}>
                {pActive ? "Yes" : "No"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProposeCreate(false)}>Cancel</Button>
            <Button onClick={submitProposeCreate} disabled={savingProposal} className="bg-blue-600 hover:bg-blue-700">
              {savingProposal && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Send for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Propose Edit dialog */}
      <Dialog open={!!proposeEditTarget} onOpenChange={(o) => !o && setProposeEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Propose edit: {proposeEditTarget?.name}</DialogTitle>
            <DialogDescription>
              Changes will be sent to the Principal for approval before taking effect.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Full name</Label>
              <Input value={pName} onChange={(e) => setPName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">New password <span className="font-normal text-slate-400">(leave blank to keep)</span></Label>
              <Input type="text" value={pPassword} onChange={(e) => setPPassword(e.target.value)} placeholder="••••••••" className="font-mono" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Mobile number</Label>
                <Input value={pPhone} onChange={(e) => setPPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={pEmail} onChange={(e) => setPEmail(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
              <span className="text-sm font-medium text-slate-700">Active</span>
              <Button size="sm" variant={pActive ? "default" : "outline"} onClick={() => setPActive(!pActive)}>
                {pActive ? "Yes" : "No"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProposeEditTarget(null)}>Cancel</Button>
            <Button onClick={submitProposeEdit} disabled={savingProposal} className="bg-blue-600 hover:bg-blue-700">
              {savingProposal && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Send for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Propose Delete dialog */}
      <Dialog open={!!proposeDeleteTarget} onOpenChange={(o) => !o && setProposeDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Propose delete: {proposeDeleteTarget?.name}</DialogTitle>
            <DialogDescription>
              This will be sent to the Principal. The teacher account will be
              deleted (along with their units &amp; assignments) only after approval.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
            <p className="text-xs text-rose-700">
              Target: <span className="font-semibold">{proposeDeleteTarget?.name}</span> (@{proposeDeleteTarget?.username})
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProposeDeleteTarget(null)}>Cancel</Button>
            <Button onClick={submitProposeDelete} disabled={savingProposal} className="bg-rose-600 hover:bg-rose-700">
              {savingProposal && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Send for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Small component to preview the proposed change data
function ProposedDataPreview({ action }: { action: PendingAction }) {
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(action.actionData);
  } catch {
    return null;
  }
  const fields = Object.entries(data).filter(([k]) => k !== "password");
  if (fields.length === 0) return null;
  return (
    <div className="rounded-md bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600">
      {fields.map(([k, v]) => (
        <span key={k} className="mr-3">
          <span className="font-medium text-slate-700">{k}:</span> {String(v || "—")}
        </span>
      ))}
    </div>
  );
}

// Build standalone HTML for PDF/DOCX export (2-column table: Chapter | Topics)
function buildCompiledHtml(doc: CompiledDoc, headerImage = ""): string {
  const headerImgTag = headerImage
    ? `<img src="${headerImage}" style="display:block;margin:0 auto 0;height:auto;max-height:90px;max-width:100%;object-fit:contain;" />`
    : "";
  const subjects = doc.subjects
    .map((s) => {
      const terms = s.terms
        .map((t) => {
          if (t.units.length === 0) return "";
          const allChapters: { chapter: string; topics: string }[] = [];
          for (const u of t.units) {
            try {
              const chs = JSON.parse(u.chapters);
              if (Array.isArray(chs)) {
                for (const ch of chs) {
                  allChapters.push({
                    chapter: ch.chapter || "Untitled",
                    topics: ch.topics || "—",
                  });
                }
              }
            } catch { /* ignore */ }
          }
          if (allChapters.length === 0) return "";
          const rowsHtml = allChapters
            .map((ch, ci) => {
              const bg = ci % 2 === 0 ? "#f8fafc" : "#ffffff";
              return `<tr style="background:${bg};">
                <td style="padding:8px 12px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;vertical-align:top;width:35%;">${ci + 1}. ${escapeHtml(ch.chapter)}</td>
                <td style="padding:8px 12px;color:#334155;border-bottom:1px solid #e2e8f0;line-height:1.5;vertical-align:top;">${escapeHtml(ch.topics)}</td>
              </tr>`;
            })
            .join("");
          return `<div style="margin-bottom:18px;break-inside:avoid;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:5px 0;border-bottom:3px solid #1e40af;width:fit-content;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:999px;background:#2563eb;"></span>
              <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#1e40af;">${t.term}</span>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:12px;break-inside:avoid;">
              <thead>
                <tr>
                  <th style="text-align:left;padding:8px 12px;background:#2563eb;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #1e40af;">Chapter</th>
                  <th style="text-align:left;padding:8px 12px;background:#2563eb;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #1e40af;">Topics</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>`;
        })
        .join("");
      return `<section style="break-inside:avoid;margin-bottom:24px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding:8px 14px;background:linear-gradient(90deg,#eff6ff 0%,#f8fafc 100%);border-radius:8px;border-left:4px solid #2563eb;">
            <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;flex:0 1 auto;">${escapeHtml(s.subject.name)}</h3>
            <span style="border-radius:5px;background:#2563eb;color:#fff;padding:2px 7px;font-size:10px;font-weight:600;">${escapeHtml(s.subject.code)}</span>
            ${s.teacherName !== "—" ? `<span style="margin-left:auto;font-size:11px;color:#64748b;">Faculty: ${escapeHtml(s.teacherName)}</span>` : ""}
          </div>
          ${terms}
        </section>`;
    })
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(doc.grade.displayName)} Syllabus</title></head><body style="margin:0;padding:0;font-family:'Inter','Segoe UI',Arial,sans-serif;color:#0f172a;background:#fff;">
<div style="max-width:760px;margin:0 auto;padding:36px 44px 28px;">
  <div style="text-align:center;margin-bottom:0;">${headerImgTag}</div>
  <div style="margin:14px 0 10px;height:3px;background:#1e40af;border-radius:1px;"></div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
    <span style="font-size:11px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.06em;">Academic Year ${escapeHtml(doc.academicYear)}</span>
    <span style="font-size:11px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(doc.term)}</span>
  </div>
  <div style="text-align:center;margin-bottom:24px;">
    <h2 style="margin:0;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.01em;">${escapeHtml(doc.grade.displayName)} — ${escapeHtml(doc.term)}</h2>
    <div style="margin:8px auto 0;width:60px;height:4px;background:#1e40af;border-radius:2px;"></div>
  </div>
  <div>${subjects || `<div style="border-radius:10px;border:1px dashed #cbd5e1;padding:36px 16px;text-align:center;font-size:13px;color:#64748b;">No syllabus entries have been compiled for this grade yet.</div>`}</div>
  <div style="margin-top:30px;padding-top:14px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="margin:0;font-size:10px;color:#94a3b8;">This compiled syllabus is auto-generated by the SMS portal of ${escapeHtml(doc.school.name)}, ${escapeHtml(doc.school.city)} ${escapeHtml(doc.school.pin)}.</p>
    <p style="margin:3px 0 0;font-size:10px;color:#94a3b8;">© ${new Date().getFullYear()} · Architected &amp; Developed by Omkar RG | Dept. of CS, Sharada Public School</p>
  </div>
</div></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
