import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ClipboardList, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import { academicService } from "@/services/academicService";
import { toast } from "@/stores/uiStore";
import { formatDate } from "@/lib/format";
import type { ApiError } from "@/lib/api/client";
import type { Assessment, AssessmentType } from "@/types";

export const ASSESSMENT_TYPE: Record<AssessmentType, { label: string; variant: BadgeVariant }> = {
  EXAM: { label: "Exam", variant: "ink" },
  TEST: { label: "Test", variant: "info" },
  QUIZ: { label: "Quiz", variant: "neutral" },
  ASSIGNMENT: { label: "Assignment", variant: "gold" },
};

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface DraftAssessment {
  classId: string;
  subject: string;
  title: string;
  type: AssessmentType;
  maxScore: string;
  date: string;
}

export default function AssessmentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<DraftAssessment | null>(null);

  const { data: teacher } = useQuery({
    queryKey: ["teacher", user?.id],
    queryFn: () => academicService.teacher(user!.id),
    enabled: Boolean(user),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["teacher-classes", user?.id],
    queryFn: () => academicService.teacherClasses(user!.id),
    enabled: Boolean(user),
  });

  const { data: term } = useQuery({ queryKey: ["current-term"], queryFn: () => academicService.currentTerm() });

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ["assessments", user?.id],
    queryFn: () => academicService.assessmentsByTeacher(user!.id),
    enabled: Boolean(user),
  });

  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);

  const openModal = () =>
    setDraft({
      classId: classes[0]?.id ?? "",
      subject: teacher?.subjects[0] ?? "",
      title: "",
      type: "TEST",
      maxScore: "100",
      date: localToday(),
    });

  const patch = (p: Partial<DraftAssessment>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const create = useMutation({
    mutationFn: () =>
      academicService.createAssessment({
        schoolId: user!.schoolId!,
        classId: draft!.classId,
        teacherId: user!.id,
        subject: draft!.subject,
        title: draft!.title.trim(),
        type: draft!.type,
        maxScore: Number(draft!.maxScore),
        date: draft!.date,
        termId: term!.id,
      }),
    onSuccess: (created) => {
      setDraft(null);
      void qc.invalidateQueries({ queryKey: ["assessments"] });
      toast({
        title: "Assessment created",
        description: `${created.title} — open the gradebook to enter scores.`,
        variant: "success",
      });
      navigate(`/teacher/assessments/${created.id}`);
    },
    onError: (e) =>
      toast({ title: "Could not create assessment", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const valid =
    Boolean(draft) &&
    Boolean(term) &&
    draft!.classId !== "" &&
    draft!.subject !== "" &&
    draft!.title.trim().length > 0 &&
    Number(draft!.maxScore) > 0 &&
    draft!.date !== "";

  return (
    <PageTransition>
      <PageHeader
        title="Assessments"
        description="Every exam, test, quiz and assignment you have recorded — click a row to grade it."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={openModal} disabled={classes.length === 0}>
            New assessment
          </Button>
        }
      />

      <DataTable<Assessment>
        loading={isLoading}
        columns={[
          { key: "date", header: "Date", render: (a) => <span className="tnum">{formatDate(a.date)}</span> },
          { key: "class", header: "Class", render: (a) => classNameById.get(a.classId) ?? "—" },
          { key: "subject", header: "Subject" },
          { key: "title", header: "Title", render: (a) => <span className="font-medium text-ink">{a.title}</span> },
          {
            key: "type",
            header: "Type",
            render: (a) => {
              const meta = ASSESSMENT_TYPE[a.type];
              return <Badge variant={meta.variant}>{meta.label}</Badge>;
            },
          },
          { key: "maxScore", header: "Max score", align: "right", render: (a) => <span className="tnum">{a.maxScore}</span> },
          {
            key: "grade",
            header: "",
            align: "right",
            render: () => (
              <span className="inline-flex items-center gap-1 text-[13px] font-medium text-primary-deep">
                Grade
                <ArrowRight className="size-3.5" aria-hidden />
              </span>
            ),
          },
        ]}
        rows={assessments}
        keyField={(a) => a.id}
        onRowClick={(a) => navigate(`/teacher/assessments/${a.id}`)}
        pageSize={10}
        dense
        empty={
          <span className="inline-flex flex-col items-center gap-1">
            <ClipboardList className="size-5 text-faint" aria-hidden />
            No assessments yet — create your first one to start grading.
          </span>
        }
      />

      <Modal
        open={Boolean(draft)}
        onClose={() => !create.isPending && setDraft(null)}
        title="New assessment"
        description={term ? `Will be recorded under ${term.label}.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button loading={create.isPending} disabled={!valid} onClick={() => create.mutate()}>
              Create & open gradebook
            </Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">Details</p>
            <div className="grid sm:grid-cols-2 gap-3.5">
              <Select label="Class" required value={draft.classId} onChange={(e) => patch({ classId: e.target.value })}>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Select label="Subject" required value={draft.subject} onChange={(e) => patch({ subject: e.target.value })}>
                {(teacher?.subjects ?? []).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <Input
              label="Title"
              required
              placeholder="e.g. Mid-term exam — Algebra"
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint pt-1">Scoring & date</p>
            <div className="grid sm:grid-cols-3 gap-3.5">
              <Select
                label="Type"
                required
                value={draft.type}
                onChange={(e) => patch({ type: e.target.value as AssessmentType })}
              >
                {(Object.keys(ASSESSMENT_TYPE) as AssessmentType[]).map((t) => (
                  <option key={t} value={t}>
                    {ASSESSMENT_TYPE[t].label}
                  </option>
                ))}
              </Select>
              <Input
                label="Max score"
                required
                type="number"
                min={1}
                value={draft.maxScore}
                onChange={(e) => patch({ maxScore: e.target.value })}
                error={draft.maxScore !== "" && Number(draft.maxScore) <= 0 ? "Must be greater than 0" : undefined}
              />
              <Input label="Date" required type="date" value={draft.date} onChange={(e) => patch({ date: e.target.value })} />
            </div>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
