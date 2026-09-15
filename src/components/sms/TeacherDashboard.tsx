"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookPlus,
  CheckCircle2,
  FileEdit,
  Loader2,
  Pencil,
  PlusCircle,
  Send,
  Trash2,
  X,
  ClipboardList,
  GraduationCap,
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
  type Unit,
  type UnitStatus,
} from "@/lib/api";

interface Props {
  user: AuthUser;
}

export function TeacherDashboard({ user }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("Term 1");
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // New unit form
  const [unitName, setUnitName] = useState("");
  const [topics, setTopics] = useState("");
  const [objectives, setObjectives] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit dialog
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editName, setEditName] = useState("");
  const [editTopics, setEditTopics] = useState("");
  const [editObjectives, setEditObjectives] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Reject feedback view
  const [feedbackUnit, setFeedbackUnit] = useState<Unit | null>(null);

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
      if (assignments.length > 0 && !selectedGradeId) {
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

  async function handleAddUnit(submit: boolean) {
    if (!selectedGradeId || !currentAssignment) {
      toast.error("Select a grade first");
      return;
    }
    if (!unitName.trim() || !topics.trim()) {
      toast.error("Unit name and topics are required");
      return;
    }
    setSaving(true);
    try {
      const { unit } = await api.createUnit({
        gradeId: selectedGradeId,
        subjectId: currentAssignment.subjectId,
        term: selectedTerm,
        unitName: unitName.trim(),
        topics: topics.trim(),
        learningObjectives: objectives.trim() || undefined,
        status: submit ? "SUBMITTED" : "DRAFT",
      });
      setUnits((prev) => [...prev, unit].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      setUnitName("");
      setTopics("");
      setObjectives("");
      toast.success(submit ? "Unit submitted for review" : "Draft saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitUnit(id: string) {
    try {
      const { unit } = await api.submitUnit(id);
      setUnits((prev) => prev.map((u) => (u.id === id ? unit : u)));
      toast.success("Submitted for approval");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDeleteUnit(id: string) {
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
    setEditTopics(u.topics);
    setEditObjectives(u.learningObjectives || "");
  }

  async function saveEdit() {
    if (!editingUnit) return;
    setEditSaving(true);
    try {
      const { unit } = await api.updateUnit(editingUnit.id, {
        unitName: editName.trim(),
        topics: editTopics.trim(),
        learningObjectives: editObjectives.trim() || null,
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
    // unique subject names from assignments
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
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Submit your term-wise syllabus for review. Coordinators will compile the
          final grade document.
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
                  placeholder={
                    loadingAssignments ? "Loading..." : "Select grade"
                  }
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
            <div className="space-y-1.5">
              <Label htmlFor="topics" className="text-xs font-medium text-slate-600">
                Topics Covered <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="topics"
                rows={4}
                placeholder="Comma or line-separated list of topics..."
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="objectives"
                className="text-xs font-medium text-slate-600"
              >
                Learning Objectives{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </Label>
              <Textarea
                id="objectives"
                rows={3}
                placeholder="What students should achieve by the end of this unit..."
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
              />
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
                Submit
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
                {units.map((u, idx) => (
                  <UnitCard
                    key={u.id}
                    unit={u}
                    index={idx}
                    onSubmit={() => handleSubmitUnit(u.id)}
                    onDelete={() => handleDeleteUnit(u.id)}
                    onEdit={() => openEdit(u)}
                    onViewFeedback={() => setFeedbackUnit(u)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingUnit} onOpenChange={(o) => !o && setEditingUnit(null)}>
        <DialogContent className="sm:max-w-lg">
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
            <div className="space-y-1.5">
              <Label className="text-xs">Topics Covered</Label>
              <Textarea
                rows={4}
                value={editTopics}
                onChange={(e) => setEditTopics(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Learning Objectives</Label>
              <Textarea
                rows={3}
                value={editObjectives}
                onChange={(e) => setEditObjectives(e.target.value)}
              />
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

function UnitCard({
  unit,
  index,
  onSubmit,
  onDelete,
  onEdit,
  onViewFeedback,
}: {
  unit: Unit;
  index: number;
  onSubmit: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onViewFeedback: () => void;
}) {
  const meta = STATUS_META[unit.status as UnitStatus];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index * 0.03, 0.2) }}
    >
      <Card className="border-slate-200/70 p-4 transition hover:shadow-md hover:shadow-slate-200/60">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                {unit.unitName}
              </h3>
              <Badge variant="secondary" className={`${meta.bg} ${meta.color} border-0`}>
                <span className={`mr-1 h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </Badge>
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
              {unit.topics}
            </p>
            {unit.status === "REJECTED" && unit.feedback && (
              <button
                onClick={onViewFeedback}
                className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100"
              >
                <FileEdit className="h-3 w-3" /> View feedback
              </button>
            )}
            <p className="mt-2 text-[11px] text-slate-400">
              Updated {formatDate(unit.updatedAt)}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            {(unit.status === "DRAFT" || unit.status === "REJECTED") && (
              <>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onEdit}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600"
                  onClick={onDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  className="h-7 bg-blue-600 text-[11px] hover:bg-blue-700"
                  onClick={onSubmit}
                >
                  <Send className="mr-1 h-3 w-3" /> Submit
                </Button>
              </>
            )}
            {unit.status === "SUBMITTED" && (
              <span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-600">
                Awaiting review
              </span>
            )}
            {unit.status === "APPROVED" && (
              <CheckCircle2 className="h-5 w-5 self-end text-emerald-500" />
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
