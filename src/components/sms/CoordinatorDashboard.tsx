"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  LayoutGrid,
  Loader2,
  Megaphone,
  Printer,
  RefreshCw,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
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
  GRID_STATUS_META,
  formatDate,
  type AuthUser,
  type CompiledDoc,
  type StatusCell,
  type Unit,
} from "@/lib/api";
import { CompiledDocView } from "./CompiledDocView";

interface Props {
  user: AuthUser;
}

export function CoordinatorDashboard({ user: _user }: Props) {
  const [tab, setTab] = useState("overview");

  // ---- Overview ----
  const [grid, setGrid] = useState<StatusCell[]>([]);
  const [academicYear, setAcademicYear] = useState<string>("");
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  // ---- Review queue ----
  const [submittedUnits, setSubmittedUnits] = useState<Unit[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [rejecting, setRejecting] = useState<Unit | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [approving, setApproving] = useState(false);

  // ---- Compile ----
  const [compileGrade, setCompileGrade] = useState<number>(4);
  const [compileTerm, setCompileTerm] = useState<string>("all");
  const [compiled, setCompiled] = useState<CompiledDoc | null>(null);
  const [loadingCompile, setLoadingCompile] = useState(false);
  const compileRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  // ---- Broadcast ----
  const [bTitle, setBTitle] = useState("");
  const [bMessage, setBMessage] = useState("");
  const [bTarget, setBTarget] = useState<string>("Teacher");
  const [broadcasting, setBroadcasting] = useState(false);

  const loadGrid = useCallback(async () => {
    setLoadingGrid(true);
    try {
      const { grid, academicYear } = await api.statusGrid();
      setGrid(grid);
      setAcademicYear(academicYear?.year || "");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingGrid(false);
    }
  }, []);

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const { units } = await api.units({ status: "SUBMITTED" });
      setSubmittedUnits(units);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingQueue(false);
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
    loadGrid();
  }, [loadGrid]);

  useEffect(() => {
    if (tab === "review") loadQueue();
  }, [tab, loadQueue]);

  useEffect(() => {
    loadCompile();
  }, [loadCompile]);

  async function handleApprove(id: string) {
    setApproving(true);
    try {
      await api.approveUnit(id);
      setSubmittedUnits((prev) => prev.filter((u) => u.id !== id));
      toast.success("Unit approved");
      loadGrid();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setApproving(false);
    }
  }

  async function confirmReject() {
    if (!rejecting) return;
    try {
      await api.rejectUnit(rejecting.id, rejectFeedback);
      setSubmittedUnits((prev) => prev.filter((u) => u.id !== rejecting.id));
      toast.success("Unit returned with feedback");
      setRejecting(null);
      setRejectFeedback("");
      loadGrid();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  // ---- Export helpers ----
  function buildCompiledHtml(doc: CompiledDoc): string {
    const subjects = doc.subjects
      .map((s) => {
        const terms = s.terms
          .map((t) => {
            const units =
              t.units.length === 0
                ? `<p style="margin:0 0 0 16px;font-size:12px;font-style:italic;color:#94a3b8;">No units published for this term.</p>`
                : `<ol style="margin:0;padding-left:16px;list-style:none;display:flex;flex-direction:column;gap:12px;">${t.units
                    .map(
                      (u, i) => `<li style="break-inside:avoid;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;padding:12px;">
                      <div style="display:flex;align-items:baseline;gap:8px;"><span style="font-size:13px;font-weight:700;color:#1e40af;">${i + 1}.</span><span style="font-size:13px;font-weight:600;color:#0f172a;">${escapeHtml(u.unitName)}</span></div>
                      <div style="margin-top:4px;margin-left:20px;font-size:12px;line-height:1.6;color:#334155;">
                        <p style="margin:0 0 4px;"><span style="font-weight:600;color:#0f172a;">Topics: </span>${escapeHtml(u.topics)}</p>
                        ${u.learningObjectives ? `<p style="margin:0;"><span style="font-weight:600;color:#0f172a;">Objectives: </span>${escapeHtml(u.learningObjectives)}</p>` : ""}
                      </div></li>`
                    )
                    .join("")}</ol>`;
            return `<div style="margin-bottom:16px;break-inside:avoid;"><h4 style="margin:0 0 8px;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:#1e40af;"><span style="display:inline-block;width:8px;height:8px;border-radius:999px;background:#2563eb;"></span>${t.term}</h4>${units}</div>`;
          })
          .join("");
        return `<section style="break-inside:avoid;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;"><h3 style="margin:0;font-size:17px;font-weight:600;color:#0f172a;">${escapeHtml(s.subject.name)}</h3><span style="border-radius:6px;background:#eff6ff;padding:2px 8px;font-size:11px;font-weight:500;color:#1e40af;">${escapeHtml(s.subject.code)}</span>${s.teacherName !== "—" ? `<span style="margin-left:auto;font-size:12px;color:#64748b;">Faculty: ${escapeHtml(s.teacherName)}</span>` : ""}</div>${terms}</section>`;
      })
      .join("");

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(doc.grade.displayName)} Syllabus</title></head><body style="margin:0;font-family:'Inter','Segoe UI',Arial,sans-serif;color:#0f172a;">
<div style="max-width:780px;margin:0 auto;padding:40px 48px;">
<div style="display:flex;align-items:center;gap:16px;padding-bottom:20px;border-bottom:2px solid #2563eb;">
<div style="width:56px;height:56px;border-radius:12px;background:#2563eb;display:grid;place-items:center;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>
<div style="flex:1;"><h1 style="margin:0;font-size:24px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;">${escapeHtml(doc.school.name)}</h1><p style="margin:2px 0 0;font-size:13px;color:#334155;">${escapeHtml(doc.school.city)} — ${escapeHtml(doc.school.pin)} · Karnataka, India</p></div>
<div style="text-align:right;font-size:12px;color:#64748b;"><p style="margin:0;font-weight:600;color:#334155;">Academic Year</p><p style="margin:0;">${escapeHtml(doc.academicYear)}</p></div>
</div>
<div style="margin:24px 0;text-align:center;"><h2 style="margin:0;font-size:20px;font-weight:700;color:#0f172a;">${escapeHtml(doc.grade.displayName)} — Annual Syllabus</h2><p style="margin:4px 0 0;font-size:13px;color:#64748b;">${escapeHtml(doc.term)} · Compiled for parent reference</p></div>
<div style="display:flex;flex-direction:column;gap:28px;">${subjects || `<div style="border-radius:12px;border:1px dashed #e2e8f0;padding:40px 16px;text-align:center;font-size:13px;color:#64748b;">No approved syllabus entries have been compiled for this grade yet.</div>`}</div>
<div style="margin-top:40px;border-top:1px solid #e2e8f0;padding-top:16px;text-align:center;"><p style="margin:0;font-size:11px;color:#94a3b8;">This compiled syllabus is auto-generated by the SMS portal of ${escapeHtml(doc.school.name)}, ${escapeHtml(doc.school.city)} ${escapeHtml(doc.school.pin)}.</p><p style="margin:4px 0 0;font-size:11px;color:#94a3b8;">Architected &amp; Developed by Omkar RG | Dept. of CS, Sharada Public School</p></div>
</div></body></html>`;
  }

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function handlePrint() {
    window.print();
  }

  async function handleExportPdf() {
    if (!compiled) return;
    setExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const html = buildCompiledHtml(compiled);
      // Render in an isolated iframe to avoid oklch contamination from the main page
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "820px";
      iframe.style.height = "1100px";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";
      iframe.style.border = "0";
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument!;
      doc.open();
      doc.write(html);
      doc.close();

      const filename = `Syllabus_Grade${compiled.grade.number}_${compiled.term.replace(
        /\s/g,
        ""
      )}_${compiled.academicYear.replace("/", "-")}.pdf`;
      const target = doc.body.firstElementChild as HTMLElement;
      await new Promise<void>((resolve) => {
        // ensure fonts/layout settle
        setTimeout(resolve, 250);
      });
      const opt = {
        margin: [10, 10, 12, 10],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      };
      await html2pdf().set(opt).from(target).save();
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
      const html = buildCompiledHtml(compiled);
      const wrapped = `<!DOCTYPE html><html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${compiled.grade.displayName} Syllabus</title></head><body>${html.replace(
        /^<!DOCTYPE html>.*?<body[^>]*>/s,
        ""
      ).replace(/<\/body>.*$/s, "")}</body></html>`;
      const blob = new Blob(["\ufeff", wrapped], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Syllabus_Grade${compiled.grade.number}_${compiled.term.replace(
        /\s/g,
        ""
      )}_${compiled.academicYear.replace("/", "-")}.doc`;
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

  async function handleBroadcast() {
    if (!bTitle.trim() || !bMessage.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setBroadcasting(true);
    try {
      await api.broadcast({
        title: bTitle.trim(),
        message: bMessage.trim(),
        targetRoleId: bTarget,
        scope: "role",
      });
      toast.success("Notification broadcast");
      setBTitle("");
      setBMessage("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBroadcasting(false);
    }
  }

  // grid helpers
  const gradesInGrid = useMemo(
    () => Array.from(new Set(grid.map((c) => c.gradeNumber))).sort((a, b) => a - b),
    [grid]
  );
  const subjectsInGrid = useMemo(
    () => Array.from(new Set(grid.map((c) => c.subjectName))).sort(),
    [grid]
  );
  const visibleCells = useMemo(() => {
    if (gradeFilter === "all") return grid;
    return grid.filter((c) => String(c.gradeNumber) === gradeFilter);
  }, [grid, gradeFilter]);

  const summary = useMemo(() => {
    const s = { empty: 0, pending: 0, inProgress: 0, approved: 0, total: 0, approvedUnits: 0, totalUnits: 0 };
    for (const c of grid) {
      s.totalUnits += c.total;
      s.approvedUnits += c.approved;
      s.total++;
      if (c.status === "EMPTY") s.empty++;
      else if (c.status === "PENDING") s.pending++;
      else if (c.status === "IN_PROGRESS") s.inProgress++;
      else if (c.status === "APPROVED") s.approved++;
    }
    return s;
  }, [grid]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Coordinator Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {academicYear ? `Academic Year ${academicYear} · ` : ""}Track, review and
          compile syllabus across Grades 4–10.
        </p>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <TabsList className="bg-slate-100/80 p-1">
          <TabsTrigger value="overview" className="gap-1.5">
            <LayoutGrid className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-1.5 relative">
            <ClipboardList className="h-4 w-4" /> Review
            {submittedUnits.length > 0 && (
              <span className="ml-1 grid h-4 min-w-4 place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                {submittedUnits.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="compile" className="gap-1.5">
            <FileText className="h-4 w-4" /> Compile &amp; Export
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="gap-1.5">
            <Megaphone className="h-4 w-4" /> Broadcast
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Approved", value: summary.approved, color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
              { label: "In Review", value: summary.inProgress, color: "text-amber-600", bg: "bg-amber-50", icon: RefreshCw },
              { label: "In Draft", value: summary.pending, color: "text-slate-600", bg: "bg-slate-100", icon: FileText },
              { label: "Not Started", value: summary.empty, color: "text-rose-500", bg: "bg-rose-50", icon: LayoutGrid },
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

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Syllabus status grid
              </span>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                {summary.approvedUnits}/{summary.totalUnits} units approved
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="h-9 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {gradesInGrid.map((g) => (
                    <SelectItem key={g} value={String(g)}>
                      Grade {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={loadGrid}
                disabled={loadingGrid}
              >
                <RefreshCw className={`h-4 w-4 ${loadingGrid ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Grid table */}
          <Card className="overflow-hidden border-slate-200/70">
            <div className="overflow-x-auto sms-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                    <th className="sticky left-0 z-10 bg-slate-50/70 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Subject
                    </th>
                    {gradesInGrid.map((g) => (
                      <th
                        key={g}
                        className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        G{g}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subjectsInGrid.map((subj) => (
                    <tr key={subj} className="border-b border-slate-100 last:border-0">
                      <td className="sticky left-0 z-10 bg-white px-4 py-2.5 font-medium text-slate-700">
                        {subj}
                      </td>
                      {gradesInGrid.map((g) => {
                        const cell = visibleCells.find(
                          (c) => c.subjectName === subj && c.gradeNumber === g
                        );
                        if (!cell)
                          return (
                            <td key={g} className="px-3 py-2.5 text-center">
                              —
                            </td>
                          );
                        const meta = GRID_STATUS_META[cell.status];
                        return (
                          <td key={g} className="px-2 py-2.5 text-center">
                            <div
                              className={`mx-auto inline-flex min-w-[60px] flex-col items-center rounded-lg px-2 py-1.5 ${meta.bg}`}
                              title={`${cell.total} units · ${cell.approved} approved`}
                            >
                              <div className="flex items-center gap-1">
                                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                                <span className={`text-[11px] font-semibold ${meta.color}`}>
                                  {meta.label}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500">
                                {cell.approved}/{cell.total}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* REVIEW */}
        <TabsContent value="review" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ClipboardList className="h-4 w-4 text-slate-400" />
              Awaiting review
              <span className="text-xs font-normal text-slate-400">
                ({submittedUnits.length})
              </span>
            </h2>
            <Button variant="outline" size="sm" onClick={loadQueue} disabled={loadingQueue}>
              <RefreshCw className={`h-4 w-4 ${loadingQueue ? "animate-spin" : ""}`} />
            </Button>
          </div>
          {loadingQueue ? (
            <div className="flex justify-center py-16 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : submittedUnits.length === 0 ? (
            <Card className="border-dashed border-slate-300 p-10 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-emerald-400" />
              <p className="mt-3 text-sm font-medium text-slate-600">
                All caught up!
              </p>
              <p className="text-xs text-slate-400">
                No submissions are pending review right now.
              </p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {submittedUnits.map((u) => (
                <Card key={u.id} className="border-slate-200/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {u.unitName}
                        </h3>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                          {u.grade?.displayName}
                        </Badge>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                          {u.subject?.name}
                        </Badge>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                          {u.term}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                        {u.topics}
                      </p>
                      {u.learningObjectives && (
                        <p className="mt-1 text-xs text-slate-500">
                          <span className="font-medium">Objectives: </span>
                          {u.learningObjectives}
                        </p>
                      )}
                      <p className="mt-2 text-[11px] text-slate-400">
                        Submitted by {u.createdBy?.name} · {formatDate(u.updatedAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50"
                        onClick={() => {
                          setRejecting(u);
                          setRejectFeedback("");
                        }}
                      >
                        <ThumbsDown className="mr-1 h-3.5 w-3.5" /> Return
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 bg-emerald-600 hover:bg-emerald-700"
                        disabled={approving}
                        onClick={() => handleApprove(u.id)}
                      >
                        <ThumbsUp className="mr-1 h-3.5 w-3.5" /> Approve
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* COMPILE & EXPORT */}
        <TabsContent value="compile" className="space-y-4">
          <Card className="border-slate-200/70 p-4 sms-dashboard-controls">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Grade</Label>
                <Select
                  value={String(compileGrade)}
                  onValueChange={(v) => setCompileGrade(Number(v))}
                >
                  <SelectTrigger className="h-9 w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[4, 5, 6, 7, 8, 9, 10].map((g) => (
                      <SelectItem key={g} value={String(g)}>
                        Grade {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Term</Label>
                <Select value={compileTerm} onValueChange={setCompileTerm}>
                  <SelectTrigger className="h-9 w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Terms</SelectItem>
                    <SelectItem value="Term 1">Term 1</SelectItem>
                    <SelectItem value="Term 2">Term 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={handlePrint}
                  disabled={!compiled}
                >
                  <Printer className="mr-1 h-4 w-4" /> Print
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={handleExportPdf}
                  disabled={!compiled || exporting}
                >
                  {exporting ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-1 h-4 w-4" />
                  )}
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={handleExportDocx}
                  disabled={!compiled || exporting}
                >
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

        {/* BROADCAST */}
        <TabsContent value="broadcast" className="space-y-4">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="border-slate-200/70 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-amber-600">
                  <Megaphone className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Send announcement
                  </h2>
                  <p className="text-xs text-slate-500">
                    Broadcast to teachers, coordinators or all staff.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">
                    Recipients
                  </Label>
                  <Select value={bTarget} onValueChange={setBTarget}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Teacher">All Teachers</SelectItem>
                      <SelectItem value="Coordinator">All Coordinators</SelectItem>
                      <SelectItem value="Principal">Principal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Title</Label>
                  <Input
                    placeholder="e.g. Term 1 syllabus deadline"
                    value={bTitle}
                    onChange={(e) => setBTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Message</Label>
                  <Textarea
                    rows={5}
                    placeholder="Write the announcement..."
                    value={bMessage}
                    onChange={(e) => setBMessage(e.target.value)}
                  />
                </div>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={broadcasting}
                  onClick={handleBroadcast}
                >
                  {broadcasting ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-1 h-4 w-4" />
                  )}
                  Broadcast
                </Button>
              </div>
            </Card>

            <Card className="border-slate-200/70 p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Tips</h3>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex gap-2">
                  <span className="text-blue-600">•</span>
                  Teachers receive notifications in real time via the bell icon.
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600">•</span>
                  Use announcements for deadlines, exam coordination &amp; circulars.
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600">•</span>
                  Approved/returned units automatically notify the submitting teacher.
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600">•</span>
                  Use the Compile tab to produce print-ready grade syllabi for parents.
                </li>
              </ul>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Reject dialog */}
      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Return unit for revision</DialogTitle>
            <DialogDescription>
              {rejecting?.unitName} — {rejecting?.grade?.displayName} ·{" "}
              {rejecting?.subject?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs">Feedback to teacher</Label>
            <Textarea
              rows={4}
              placeholder="Explain what needs to change..."
              value={rejectFeedback}
              onChange={(e) => setRejectFeedback(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmReject}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Send back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
