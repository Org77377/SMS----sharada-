"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookPlus,
  CheckCircle2,
  FileEdit,
  Loader2,
  Pencil,
  Plus,
  PlusCircle,
  Send,
  Trash2,
  X,
  ClipboardList,
  GraduationCap,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  STATUS_META,
  formatDate,
  type Assignment,
  type AuthUser,
  type Chapter,
  type Unit,
  type UnitStatus,
} from "@/lib/api";

interface Props {
  user: AuthUser;
}

// Parse the JSON-encoded chapters string into an array.
function parseChapters(raw: string): Chapter[] {
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr as Chapter[];
  } catch {
    /* ignore */
  }
  return [];
}

const MAX_CHAPTERS = 10;

export function TeacherDashboard({ user }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("Term 1");
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // New unit form
  const [unitName, setUnitName] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([{ chapter: "", topics: "" }]);
  const [saving, setSaving] = useState(false);

  // Edit dialog
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editName, setEditName] = useState("");
  const [editChapters, setEditChapters] = useState<Chapter[]>([{ chapter: "", topics: "" }]);
  const [editSaving, setEditSaving] = useState(false);

  // Reject feedback view
  const [feedbackUnit, setFeedbackUnit] = useState<Unit | null>(null);

  // Track whether selectedGradeId was explicitly set (by user or first load)
  const gradeInitializedRef = useRef(false);

  const isStaffRole = user.role !== "Teacher"; // HOD/EC/Principal can edit any + auto-approve

  // subject derived from assignment
  const currentAssignment = useMemo(
    () => assignments.find((a) => a.gradeId === selectedGradeId),
    [assignments, selectedGradeId]
  );

  const loadAssignments = useCallback(async () => {
    setLoadingAssignments(true);
    try {
      const { assignments } = await api.myAssignments();
      setAssignments(assignments);
      if (assignments.length > 0 && !gradeInitializedRef.current) {
        gradeInitializedRef.current = true;
        setSelectedGradeId(assignments[0].gradeId);
      }
    } catch (e) {
      toast.error("Could not load assignments: " + (e as Error).message);
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  const loadUnits = useCallback(async () => {
    if (!selectedGradeId) return;
    setLoadingUnits(true);
    try {
      const { units } = await api.units({
        gradeId: selectedGradeId,
        term: selectedTerm,
        createdById: user.id,
      });
      setUnits(units);
    } catch (e) {
      toast.error("Could not load units: " + (e as Error).message);
    } finally {
      setLoadingUnits(false);
    }
  }, [selectedGradeId, selectedTerm, user.id]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  // Warn the user if they have unsaved form data and try to close/refresh the tab.
  const hasUnsavedForm =
    unitName.trim() !== "" ||
    chapters.some((c) => c.chapter.trim() !== "" || c.topics.trim() !== "");
  useEffect(() => {
    function beforeUnloadHandler(e: BeforeUnloadEvent) {
      if (!hasUnsavedForm) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", beforeUnloadHandler);
    return () => window.removeEventListener("beforeunload", beforeUnloadHandler);
  }, [hasUnsavedForm]);

  // ---- Chapter row helpers ----
  function addChapter() {
    if (chapters.length >= MAX_CHAPTERS) {
      toast.warning(`Maximum ${MAX_CHAPTERS} chapters per unit`);
      return;
    }
    setChapters([...chapters, { chapter: "", topics: "" }]);
  }
  function removeChapter(idx: number) {
    setChapters(chapters.filter((_, i) => i !== idx));
  }
  function updateChapter(idx: number, field: keyof Chapter, value: string) {
    setChapters(chapters.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  }

  function addEditChapter() {
    if (editChapters.length >= MAX_CHAPTERS) {
      toast.warning(`Maximum ${MAX_CHAPTERS} chapters per unit`);
      return;
    }
    setEditChapters([...editChapters, { chapter: "", topics: "" }]);
  }
  function removeEditChapter(idx: number) {
    setEditChapters(editChapters.filter((_, i) => i !== idx));
  }
  function updateEditChapter(idx: number, field: keyof Chapter, value: string) {
    setEditChapters(editChapters.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  }

  // ---- Actions ----
  async function handleAddUnit(submit: boolean) {
    if (!selectedGradeId || !currentAssignment) {
      toast.error("Select a grade first");
      return;
    }
    if (!unitName.trim()) {
      toast.error("Unit name is required");
      return;
    }
    const valid = chapters.filter((c) => c.chapter.trim() || c.topics.trim());
    if (valid.length === 0) {
      toast.error("Add at least one chapter with a name or topics");
      return;
    }
    setSaving(true);
    try {
      const { unit } = await api.createUnit({
        gradeId: selectedGradeId,
        subjectId: currentAssignment.subjectId,
        term: selectedTerm,
        unitName: unitName.trim(),
        chapters: valid,
        status: submit ? "SUBMITTED" : "DRAFT",
      } as Record<string, unknown>);
      setUnits((prev) => [...prev, unit].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      setUnitName("");
      setChapters([{ chapter: "", topics: "" }]);
      toast.success(
        submit
          ? isStaffRole
            ? "Unit submitted & auto-approved ✓"
            : "Unit submitted for review"
          : "Draft saved"
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitUnit(id: string) {
    const btn = document.querySelector(`[data-submit-id="${id}"]`) as HTMLButtonElement | null;
    if (btn) btn.disabled = true;
    try {
      const { unit, autoApproved } = await api.submitUnit(id) as { unit: Unit; autoApproved?: boolean };
      setUnits((prev) => prev.map((u) => (u.id === id ? unit : u)));
      toast.success(autoApproved ? "Auto-approved (you are an HOD/Coordinator)" : "Submitted for approval");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function handleDeleteUnit(id: string) {
    if (!confirm("Delete this unit? This cannot be undone.")) return;
    try {
      await api.deleteUnit(id);
      setUnits((prev) => prev.filter((u) => u.id !== id));
      toast.success("Unit deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function openEdit(u: Unit) {
    setEditingUnit(u);
    setEditName(u.unitName);
    const parsed = parseChapters(u.chapters);
    setEditChapters(parsed.length > 0 ? parsed : [{ chapter: "", topics: "" }]);
  }

  async function saveEdit() {
    if (!editingUnit) return;
    if (!editName.trim()) {
      toast.error("Unit name is required");
      return;
    }
    const valid = editChapters.filter((c) => c.chapter.trim() || c.topics.trim());
    if (valid.length === 0) {
      toast.error("Add at least one chapter");
      return;
    }
    setEditSaving(true);
    try {
      const { unit } = await api.updateUnit(editingUnit.id, {
        unitName: editName.trim(),
        chapters: valid,
      });
      setUnits((prev) => prev.map((u) => (u.id === unit.id ? unit : u)));
      setEditingUnit(null);
      toast.success("Unit updated");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEditSaving(false);
    }
  }

  const stats = useMemo(() => {
    const counts = { draft: 0, submitted: 0, approved: 0, rejected: 0 };
    for (const u of units) {
      if (u.status === "DRAFT") counts.draft++;
      else if (u.status === "SUBMITTED") counts.submitted++;
      else if (u.status === "APPROVED") counts.approved++;
      else if (u.status === "REJECTED") counts.rejected++;
    }
    return counts;
  }, [units]);

  const subjects = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of assignments) map.set(a.subject.name, a.subject.name);
    return Array.from(map.values());
  }, [assignments]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Hello, {user.name.split(" ")[0]} 👋
          </h1>
          {subjects.length > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 border-0">
              {subjects.join(" · ")}
            </Badge>
          )}
          {isStaffRole && (
            <Badge className="bg-blue-100 text-blue-700 border-0">
              Auto-approve on submit
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Submit your term-wise syllabus for review. HODs and coordinators will
          compile the final grade document.
        </p>
      </motion.div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Drafts", value: stats.draft, icon: FileEdit, color: "text-slate-600", bg: "bg-slate-100" },
          { label: "Submitted", value: stats.submitted, icon: Send, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Approved", value: stats.approved, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Returned", value: stats.rejected, icon: X, color: "text-rose-600", bg: "bg-rose-50" },
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

      {/* Filters */}
      <Card className="mb-6 border-slate-200/70 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Grade</Label>
            <Select
              value={selectedGradeId}
              onValueChange={setSelectedGradeId}
              disabled={loadingAssignments}
            >
              <SelectTrigger className="h-10">
                <SelectValue
                  placeholder={loadingAssignments ? "Loading..." : "Select grade"}
                />
              </SelectTrigger>
              <SelectContent>
                {assignments.map((a) => (
                  <SelectItem key={a.gradeId} value={a.gradeId}>
                    {a.grade.displayName} · {a.subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Term</Label>
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Term 1">Term 1</SelectItem>
                <SelectItem value="Term 2">Term 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            {currentAssignment && (
              <div className="flex w-full items-center gap-2 rounded-lg bg-blue-50 px-3 py-2.5">
                <GraduationCap className="h-4 w-4 text-blue-600" />
                <div className="text-xs">
                  <span className="text-slate-500">Subject: </span>
                  <span className="font-semibold text-slate-800">
                    {currentAssignment.subject.name}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Add unit form */}
        <Card className="border-slate-200/70 p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white">
              <BookPlus className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Add Unit / Chapter
              </h2>
              <p className="text-xs text-slate-500">
                {currentAssignment
                  ? `${currentAssignment.grade.displayName} · ${currentAssignment.subject.name} · ${selectedTerm}`
                  : "Select a grade to begin"}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="unitName" className="text-xs font-medium text-slate-600">
                Unit / Chapter Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="unitName"
                placeholder="e.g. Computer Fundamentals"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
              />
            </div>

            {/* Chapters + Topics rows */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-slate-600">
                  Chapters & Topics{" "}
                  <span className="font-normal text-slate-400">
                    ({chapters.length}/{MAX_CHAPTERS})
                  </span>
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-blue-600 hover:bg-blue-50"
                  onClick={addChapter}
                  disabled={chapters.length >= MAX_CHAPTERS}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Chapter
                </Button>
              </div>
              <div className="space-y-2">
                {chapters.map((ch, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-200 bg-slate-50/50 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                        <GripVertical className="h-3 w-3" />
                        Chapter {idx + 1}
                      </span>
                      {chapters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeChapter(idx)}
                          className="text-rose-400 hover:text-rose-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Chapter name"
                        value={ch.chapter}
                        onChange={(e) => updateChapter(idx, "chapter", e.target.value)}
                        className="bg-white"
                      />
                      <Input
                        placeholder="Topics (comma-separated)"
                        value={ch.topics}
                        onChange={(e) => updateChapter(idx, "topics", e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                disabled={saving || !currentAssignment}
                onClick={() => handleAddUnit(false)}
              >
                {saving ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <FileEdit className="mr-1 h-4 w-4" />
                )}
                Save Draft
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={saving || !currentAssignment}
                onClick={() => handleAddUnit(true)}
              >
                {saving ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-1 h-4 w-4" />
                )}
                {isStaffRole ? "Submit" : "Submit"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Units list */}
        <div className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ClipboardList className="h-4 w-4 text-slate-400" />
              My Syllabus Entries
              <span className="text-xs font-normal text-slate-400">
                ({units.length})
              </span>
            </h2>
          </div>
          {loadingUnits ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : units.length === 0 ? (
            <Card className="border-dashed border-slate-300 p-10 text-center">
              <PlusCircle className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-600">
                No units yet for this term
              </p>
              <p className="text-xs text-slate-400">
                Add your first unit using the form on the left.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {units.map((u, idx) => {
                  const unitChapters = parseChapters(u.chapters);
                  const meta = STATUS_META[u.status as UnitStatus];
                  const canEdit = isStaffRole || u.status === "DRAFT" || u.status === "REJECTED";
                  const canDelete = isStaffRole || u.status !== "APPROVED";
                  return (
                    <motion.div
                      key={u.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ delay: Math.min(idx * 0.03, 0.2) }}
                    >
                      <Card className="border-slate-200/70 p-4 transition hover:shadow-md hover:shadow-slate-200/60">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-slate-900">
                                {u.unitName}
                              </h3>
                              <Badge variant="secondary" className={`${meta.bg} ${meta.color} border-0`}>
                                <span className={`mr-1 h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                                {meta.label}
                              </Badge>
                              {unitChapters.length > 0 && (
                                <span className="text-[11px] text-slate-400">
                                  {unitChapters.length} chapter{unitChapters.length === 1 ? "" : "s"}
                                </span>
                              )}
                            </div>
                            {/* Chapter preview */}
                            {unitChapters.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {unitChapters.slice(0, 2).map((ch, ci) => (
                                  <div key={ci} className="text-xs text-slate-600">
                                    <span className="font-medium text-slate-700">{ci + 1}. {ch.chapter || "Untitled"}</span>
                                    {ch.topics && <span className="text-slate-500"> — {ch.topics.length > 60 ? ch.topics.slice(0, 60) + "…" : ch.topics}</span>}
                                  </div>
                                ))}
                                {unitChapters.length > 2 && (
                                  <p className="text-[11px] text-slate-400">+ {unitChapters.length - 2} more</p>
                                )}
                              </div>
                            )}
                            {u.status === "REJECTED" && u.feedback && (
                              <button
                                onClick={() => setFeedbackUnit(u)}
                                className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100"
                              >
                                <FileEdit className="h-3 w-3" /> View feedback
                              </button>
                            )}
                            <p className="mt-2 text-[11px] text-slate-400">
                              Updated {formatDate(u.updatedAt)}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1">
                            {canEdit && (
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(u)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600"
                                onClick={() => handleDeleteUnit(u.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {(u.status === "DRAFT" || u.status === "REJECTED") && (
                              <Button
                                size="sm"
                                data-submit-id={u.id}
                                className="h-7 bg-blue-600 text-[11px] hover:bg-blue-700"
                                onClick={() => handleSubmitUnit(u.id)}
                              >
                                <Send className="mr-1 h-3 w-3" /> Submit
                              </Button>
                            )}
                            {u.status === "SUBMITTED" && (
                              <span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-600">
                                Awaiting review
                              </span>
                            )}
                            {u.status === "APPROVED" && (
                              <CheckCircle2 className="h-5 w-5 self-end text-emerald-500" />
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingUnit} onOpenChange={(o) => !o && setEditingUnit(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit unit</DialogTitle>
            <DialogDescription>
              {editingUnit?.status === "APPROVED"
                ? "This unit is already approved. Changes will keep the approved status."
                : "Update the unit details. Re-submit after editing if needed."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Unit / Chapter Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">
                  Chapters & Topics ({editChapters.length}/{MAX_CHAPTERS})
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-blue-600 hover:bg-blue-50"
                  onClick={addEditChapter}
                  disabled={editChapters.length >= MAX_CHAPTERS}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Chapter
                </Button>
              </div>
              <div className="sms-scroll max-h-[40vh] space-y-2 overflow-y-auto pr-1">
                {editChapters.map((ch, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                        <GripVertical className="h-3 w-3" />
                        Chapter {idx + 1}
                      </span>
                      {editChapters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEditChapter(idx)}
                          className="text-rose-400 hover:text-rose-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Chapter name"
                        value={ch.chapter}
                        onChange={(e) => updateEditChapter(idx, "chapter", e.target.value)}
                        className="bg-white"
                      />
                      <Input
                        placeholder="Topics (comma-separated)"
                        value={ch.topics}
                        onChange={(e) => updateEditChapter(idx, "topics", e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUnit(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={editSaving} className="bg-blue-600 hover:bg-blue-700">
              {editSaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback dialog */}
      <Dialog
        open={!!feedbackUnit}
        onOpenChange={(o) => !o && setFeedbackUnit(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reviewer feedback</DialogTitle>
            <DialogDescription>
              {feedbackUnit?.unitName}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
            {feedbackUnit?.feedback || "No written feedback provided."}
          </div>
          <DialogFooter>
            <Button onClick={() => setFeedbackUnit(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
