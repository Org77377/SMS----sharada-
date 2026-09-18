"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ClipboardCheck,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  api,
  GRID_STATUS_META,
  formatDate,
  type AuthUser,
  type CompiledDoc,
  type PendingAction,
  type StatusCell,
  type Unit,
} from "@/lib/api";
import { CompiledDocView } from "./CompiledDocView";

interface Props {
  user: AuthUser;
}

export function CoordinatorDashboard({ user }: Props) {
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
  const [allGrades, setAllGrades] = useState<{ id: string; gradeNumber: number; displayName: string }[]>([]);
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

  // Approvals tab (Principal sees pending Technical Admin requests)
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [reviewingAction, setReviewingAction] = useState<PendingAction | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(false);

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
    // Load grades dynamically (configurable — may not always be 4-10)
    api.grades().then(({ grades }) => {
      setAllGrades(grades);
      if (grades.length > 0 && !grades.find((g) => g.gradeNumber === compileGrade)) {
        setCompileGrade(grades[0].gradeNumber);
      }
    }).catch(() => {});
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
  function splitTopics(raw: string): string[] {
    return raw
      .split(/[\n\r]+|,(?=\s)/)
      .map((t) => t.replace(/^\s*[-•·*\d.)\]]+\s*/, "").trim())
      .filter((t) => t.length > 0);
  }

  function buildCompiledHtml(doc: CompiledDoc, headerImage = ""): string {
    const headerImgTag = headerImage
      ? `<img src="${headerImage}" style="display:block;margin:0 auto 0;height:auto;max-height:90px;max-width:100%;object-fit:contain;" />`
      : "";

    const subjects = doc.subjects
      .map((s) => {
        const terms = s.terms
          .map((t) => {
            const units =
              t.units.length === 0
                ? `<p style="margin:0;padding:8px 14px;font-size:12px;font-style:italic;color:#94a3b8;">No units published for this term.</p>`
                : t.units
                    .map((u, i) => {
                      const topicList = splitTopics(u.topics);
                      const topicsHtml =
                        topicList.length === 0
                          ? ""
                          : `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;">${topicList
                              .map(
                                (tp, ti) => `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;background:#f1f5f9;border-radius:999px;border:1px solid #e2e8f0;font-size:11.5px;line-height:1.4;color:#334155;"><span style="font-size:10px;font-weight:700;color:#2563eb;">${ti + 1}</span>${escapeHtml(tp)}</span>`
                              )
                              .join("")}</div>`;
                      const objectivesHtml = u.learningObjectives
                        ? `<div style="margin-top:8px;padding:7px 10px;background:#fefce8;border-radius:5px;border-left:3px solid #ca8a04;"><span style="font-size:11px;font-weight:700;color:#854d0e;text-transform:uppercase;letter-spacing:0.04em;">Objectives</span><p style="margin:3px 0 0;font-size:11.5px;line-height:1.5;color:#713f12;">${escapeHtml(u.learningObjectives)}</p></div>`
                        : "";
                      return `<div style="break-inside:avoid;margin-bottom:14px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                        <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:#eff6ff;border-bottom:1px solid #e2e8f0;">
                          <span style="flex:0 0 auto;display:inline-grid;place-items:center;width:22px;height:22px;border-radius:6px;background:#2563eb;color:#fff;font-size:11px;font-weight:700;">${i + 1}</span>
                          <span style="flex:1;font-size:13px;font-weight:700;color:#0f172a;">${escapeHtml(u.unitName)}</span>
                        </div>
                        <div style="padding:10px 12px;">
                          <span style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Topics</span>
                          ${topicsHtml}
                          ${objectivesHtml}
                        </div>
                      </div>`;
                    })
                    .join("");
            return `<div style="margin-bottom:18px;break-inside:avoid;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:5px 0;border-bottom:2px solid #2563eb;width:fit-content;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:999px;background:#2563eb;"></span>
                <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#1e40af;">${t.term}</span>
              </div>
              ${units}
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
  <!-- Header image centered with top margin -->
  <div style="text:center;margin-bottom:0;">
    ${headerImgTag}
  </div>
  <!-- Line after header -->
  <div style="margin:14px 0 10px;height:2px;background:#2563eb;border-radius:1px;"></div>
  <!-- Meta row: academic year left, term right -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
    <span style="font-size:11px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.06em;">Academic Year ${escapeHtml(doc.academicYear)}</span>
    <span style="font-size:11px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(doc.term)}</span>
  </div>
  <!-- Grade title -->
  <div style="text-align:center;margin-bottom:24px;">
    <h2 style="margin:0;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.01em;">${escapeHtml(doc.grade.displayName)} — Annual Syllabus</h2>
    <div style="margin:8px auto 0;width:60px;height:3px;background:#2563eb;border-radius:2px;"></div>
  </div>
  <!-- Subjects -->
  <div>${subjects || `<div style="border-radius:10px;border:1px dashed #cbd5e1;padding:36px 16px;text-align:center;font-size:13px;color:#64748b;">No approved syllabus entries have been compiled for this grade yet.</div>`}</div>
  <!-- Footer -->
  <div style="margin-top:30px;padding-top:14px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="margin:0;font-size:10px;color:#94a3b8;">This compiled syllabus is auto-generated by the SMS portal of ${escapeHtml(doc.school.name)}, ${escapeHtml(doc.school.city)} ${escapeHtml(doc.school.pin)}.</p>
    <p style="margin:3px 0 0;font-size:10px;color:#94a3b8;">© ${new Date().getFullYear()} · Architected &amp; Developed by Omkar RG | Dept. of CS, Sharada Public School</p>
  </div>
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

  async function fetchHeaderImage(): Promise<string> {
    try {
      const res = await fetch("/school-header.png");
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return "";
    }
  }

  async function handleExportPdf() {
    if (!compiled) return;
    setExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const headerImage = await fetchHeaderImage();
      const html = buildCompiledHtml(compiled, headerImage);
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
      // Wait for the header image (if any) to finish loading before snapshot
      const imgs = Array.from(target.querySelectorAll("img"));
      await Promise.all(
        imgs.map(
          (img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  img.onload = () => resolve();
                  img.onerror = () => resolve();
                })
        )
      );
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

  async function handleExportDocx() {
    if (!compiled) return;
    setExporting(true);
    try {
      const headerImage = await fetchHeaderImage();
      const html = buildCompiledHtml(compiled, headerImage);
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

  // ---- Approvals (Principal reviews Technical Admin requests) ----
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

  useEffect(() => {
    if (tab === "approvals") loadPending();
  }, [tab, loadPending]);

  async function handleApproveAction() {
    if (!reviewingAction) return;
    setReviewing(true);
    try {
      await api.admin.approvePendingAction(reviewingAction.id, reviewNote.trim() || undefined);
      toast.success("Approved & executed");
      setReviewingAction(null);
      setReviewNote("");
      loadPending();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReviewing(false);
    }
  }

  async function handleRejectAction() {
    if (!reviewingAction) return;
    setReviewing(true);
    try {
      await api.admin.rejectPendingAction(reviewingAction.id, reviewNote.trim() || undefined);
      toast.success("Request rejected");
      setReviewingAction(null);
      setReviewNote("");
      loadPending();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReviewing(false);
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
          Review Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {academicYear ? `Academic Year ${academicYear} · ` : ""}Track, review and
          compile syllabus across all grades.
        </p>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <ScrollArea className="w-full whitespace-nowrap sms-scroll">
          <TabsList className="bg-slate-100/80 p-1 inline-flex">
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
          {user.role === "Principal" && (
            <TabsTrigger value="approvals" className="gap-1.5 relative">
              <ClipboardCheck className="h-4 w-4" /> Approvals
              {pendingActions.filter((a) => a.status === "PENDING").length > 0 && (
                <span className="ml-1 grid h-4 min-w-4 place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                  {pendingActions.filter((a) => a.status === "PENDING").length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>
        </ScrollArea>

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
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Grade</Label>
                <Select
                  value={String(compileGrade)}
                  onValueChange={(v) => setCompileGrade(Number(v))}
                >
                  <SelectTrigger className="h-9 w-full sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allGrades.map((g) => (
                      <SelectItem key={g.id} value={String(g.gradeNumber)}>
                        {g.displayName}
                      </SelectItem>
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
                    <SelectItem value="all">All Terms</SelectItem>
                    <SelectItem value="Term 1">Term 1</SelectItem>
                    <SelectItem value="Term 2">Term 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="ml-auto flex flex-wrap gap-2 sm:ml-auto">
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
                      <SelectItem value="HOD">All HODs</SelectItem>
                      <SelectItem value="Exam Coordinator">All Exam Coordinators</SelectItem>
                      <SelectItem value="Technical Admin">All Technical Admins</SelectItem>
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

        {/* APPROVALS (Principal only) */}
        {user.role === "Principal" && (
          <TabsContent value="approvals" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ClipboardCheck className="h-4 w-4 text-slate-400" /> Approval Requests
                </h2>
                <p className="text-xs text-slate-500">Technical Admin change requests — review &amp; approve to execute.</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadPending} disabled={loadingPending}>
                <RefreshCw className={`h-4 w-4 ${loadingPending ? "animate-spin" : ""}`} />
              </Button>
            </div>
            {pendingActions.length === 0 ? (
              <Card className="border-dashed border-slate-300 p-10 text-center">
                <ClipboardCheck className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm text-slate-500">No approval requests.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingActions.map((a) => {
                  let preview: Record<string, unknown> = {};
                  try { preview = JSON.parse(a.actionData); } catch { /* */ }
                  return (
                    <Card key={a.id} className="border-slate-200/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-0">
                              {a.actionType === "USER_CREATE" ? "Create Teacher" : a.actionType === "USER_UPDATE" ? "Edit Teacher" : "Delete Teacher"}
                            </Badge>
                            {a.targetName && <span className="text-sm font-medium text-slate-800">{a.targetName}</span>}
                            {a.status === "PENDING" && (
                              <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-0">Pending</Badge>
                            )}
                            {a.status === "APPROVED" && (
                              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-0">Approved</Badge>
                            )}
                            {a.status === "REJECTED" && (
                              <Badge variant="secondary" className="bg-rose-50 text-rose-700 border-0">Rejected</Badge>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            Requested by {a.requesterName} · {formatDate(a.createdAt)}
                            {a.reviewerName && ` · Reviewed by ${a.reviewerName}`}
                          </p>
                          {/* Preview proposed data */}
                          {Object.keys(preview).length > 0 && (
                            <div className="mt-2 rounded-md bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600">
                              {Object.entries(preview).filter(([k]) => k !== "password").map(([k, v]) => (
                                <span key={k} className="mr-3">
                                  <span className="font-medium text-slate-700">{k}:</span> {String(v || "—")}
                                </span>
                              ))}
                            </div>
                          )}
                          {a.reviewerNote && (
                            <p className="mt-1 text-xs text-slate-500">
                              <span className="font-medium">Note:</span> {a.reviewerNote}
                            </p>
                          )}
                        </div>
                        {a.status === "PENDING" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => { setReviewingAction(a); setReviewNote(""); }}
                          >
                            <ClipboardCheck className="mr-1 h-3.5 w-3.5" /> Review
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Review dialog */}
            <Dialog open={!!reviewingAction} onOpenChange={(o) => !o && setReviewingAction(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Review request</DialogTitle>
                  <DialogDescription>
                    {reviewingAction?.actionType === "USER_CREATE" ? "Create teacher" :
                     reviewingAction?.actionType === "USER_UPDATE" ? `Edit teacher: ${reviewingAction?.targetName}` :
                     `Delete teacher: ${reviewingAction?.targetName}`}
                    {" — approve to execute the change."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-2">
                  <Label className="text-xs">Note (optional)</Label>
                  <Textarea
                    rows={3}
                    placeholder="Add a note for the Technical Admin…"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setReviewingAction(null); setReviewNote(""); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleRejectAction} disabled={reviewing} className="bg-rose-600 hover:bg-rose-700">
                    {reviewing && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                    Reject
                  </Button>
                  <Button onClick={handleApproveAction} disabled={reviewing} className="bg-emerald-600 hover:bg-emerald-700">
                    {reviewing && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                    Approve &amp; Execute
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}
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
