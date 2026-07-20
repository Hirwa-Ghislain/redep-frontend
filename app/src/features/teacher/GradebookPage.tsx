import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardX, ListChecks, Percent, Save, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition } from "@/components/motion";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { BarsChart } from "@/components/charts/BarsChart";
import { useAuth } from "@/hooks/useAuth";
import { academicService } from "@/services/academicService";
import { toast } from "@/stores/uiStore";
import { formatDate, fullName, percent } from "@/lib/format";
import { clamp } from "@/lib/utils";
import type { ApiError } from "@/lib/api/client";
import type { Grade, Student } from "@/types";
import { ASSESSMENT_TYPE } from "./AssessmentsPage";

interface GradeDraft {
  score: string;
  comment: string;
}

type GradebookRow = { student: Student; grade: Grade | null };

export default function GradebookPage() {
  const { assessmentId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [entries, setEntries] = useState<Record<string, GradeDraft>>({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ["gradebook", assessmentId],
    queryFn: () => academicService.gradebook(assessmentId),
    enabled: Boolean(assessmentId),
    retry: false,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["teacher-classes", user?.id],
    queryFn: () => academicService.teacherClasses(user!.id),
    enabled: Boolean(user),
  });

  // Seed the editable map from existing grades whenever the gradebook loads.
  useEffect(() => {
    if (!data) return;
    const next: Record<string, GradeDraft> = {};
    for (const row of data.rows) {
      next[row.student.id] = {
        score: row.grade ? String(row.grade.score) : "",
        comment: row.grade?.comment ?? "",
      };
    }
    setEntries(next);
  }, [data]);

  const assessment = data?.assessment;
  const maxScore = assessment?.maxScore ?? 100;
  const className = assessment ? (classes.find((c) => c.id === assessment.classId)?.name ?? "—") : "—";

  const setScore = (studentId: string, raw: string) => {
    let value = raw;
    if (raw !== "") {
      const n = Number(raw);
      if (!Number.isNaN(n)) value = String(clamp(n, 0, maxScore));
    }
    setEntries((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? { score: "", comment: "" }), score: value },
    }));
  };

  const setComment = (studentId: string, comment: string) => {
    setEntries((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? { score: "", comment: "" }), comment },
    }));
  };

  const scored = useMemo(
    () =>
      Object.entries(entries)
        .filter(([, e]) => e.score !== "" && !Number.isNaN(Number(e.score)))
        .map(([studentId, e]) => ({ studentId, score: clamp(Number(e.score), 0, maxScore), comment: e.comment })),
    [entries, maxScore],
  );

  const stats = useMemo(() => {
    if (scored.length === 0) return null;
    const values = scored.map((s) => s.score);
    return {
      average: values.reduce((a, b) => a + b, 0) / values.length / maxScore,
      highest: Math.max(...values),
      lowest: Math.min(...values),
    };
  }, [scored, maxScore]);

  const distribution = useMemo(() => {
    const buckets = [
      { range: "0–39%", students: 0 },
      { range: "40–59%", students: 0 },
      { range: "60–79%", students: 0 },
      { range: "80–100%", students: 0 },
    ];
    for (const { score } of scored) {
      const pct = (score / maxScore) * 100;
      const i = pct < 40 ? 0 : pct < 60 ? 1 : pct < 80 ? 2 : 3;
      buckets[i]!.students += 1;
    }
    return buckets;
  }, [scored, maxScore]);

  const save = useMutation({
    mutationFn: () =>
      academicService.saveGrades(
        assessmentId,
        scored.map((s) => ({ studentId: s.studentId, score: s.score, comment: s.comment.trim() || undefined })),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["gradebook", assessmentId] });
      toast({
        title: "Grades saved",
        description: `${scored.length} of ${data?.rows.length ?? 0} scores recorded for ${assessment?.title ?? "assessment"}.`,
        variant: "success",
      });
    },
    onError: (e) =>
      toast({ title: "Could not save grades", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  if (isError) {
    return (
      <PageTransition>
        <PageHeader backTo="/teacher/assessments" backLabel="Assessments" title="Gradebook" />
        <Card padded={false}>
          <EmptyState
            icon={ClipboardX}
            title="Assessment not found"
            description="It may have been removed. Head back to your assessments list."
            action={<Button onClick={() => navigate("/teacher/assessments")}>Back to assessments</Button>}
          />
        </Card>
      </PageTransition>
    );
  }

  if (isLoading || !data || !assessment) {
    return (
      <PageTransition>
        <PageHeader backTo="/teacher/assessments" backLabel="Assessments" title="Gradebook" />
        <Skeleton className="h-24 mb-4" />
        <Skeleton className="h-80" />
      </PageTransition>
    );
  }

  const typeMeta = ASSESSMENT_TYPE[assessment.type];

  return (
    <PageTransition>
      <PageHeader
        backTo="/teacher/assessments"
        backLabel="Assessments"
        title="Gradebook"
        className="mb-3"
        actions={
          <Button icon={<Save className="size-4" />} loading={save.isPending} disabled={scored.length === 0} onClick={() => save.mutate()}>
            Save grades
          </Button>
        }
      />

      {/* Slim meta band */}
      <Card padded={false} className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3">
        <h2 className="font-display text-[17px] font-bold text-ink leading-tight">{assessment.title}</h2>
        <span className="flex flex-wrap items-center gap-1.5">
          <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
          <Badge variant="neutral">{assessment.subject}</Badge>
          <Badge variant="neutral">{className}</Badge>
          <Badge variant="neutral">
            <span className="tnum">{formatDate(assessment.date)}</span>
          </Badge>
          <Badge variant="neutral">
            out of&nbsp;<span className="tnum">{assessment.maxScore}</span>
          </Badge>
        </span>
      </Card>

      {/* Live stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard
          label="Scores entered"
          value={`${scored.length}/${data.rows.length}`}
          icon={ListChecks}
          tone="primary"
        />
        <StatCard label="Class average" value={stats ? percent(stats.average) : "—"} icon={Percent} tone="gold" />
        <StatCard
          label="Highest score"
          value={stats ? `${stats.highest}/${assessment.maxScore}` : "—"}
          icon={TrendingUp}
          tone="sky"
        />
        <StatCard
          label="Lowest score"
          value={stats ? `${stats.lowest}/${assessment.maxScore}` : "—"}
          icon={TrendingDown}
          tone="clay"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        {/* Grades table */}
        <div className="lg:col-span-2">
          <Card padded={false}>
            <CardHeader
              className="px-5 pt-4"
              title="Scores & comments"
              description="Scores are clamped to the max score; comments are optional and visible to parents."
            />
            <DataTable<GradebookRow>
              columns={[
                {
                  key: "student",
                  header: "Student",
                  render: (r) => (
                    <span className="flex items-center gap-2.5">
                      <Avatar name={fullName(r.student)} size="sm" />
                      <span className="font-medium text-ink whitespace-nowrap">{fullName(r.student)}</span>
                    </span>
                  ),
                },
                {
                  key: "score",
                  header: `Score / ${assessment.maxScore}`,
                  render: (r) => (
                    <span className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={assessment.maxScore}
                        step={1}
                        inputMode="numeric"
                        placeholder="—"
                        aria-label={`Score for ${fullName(r.student)} out of ${assessment.maxScore}`}
                        value={entries[r.student.id]?.score ?? ""}
                        onChange={(e) => setScore(r.student.id, e.target.value)}
                        className="w-20 [&_input]:h-8 [&_input]:px-2 [&_input]:text-[13px]"
                      />
                      <span className="text-[12.5px] text-faint tnum whitespace-nowrap">/ {assessment.maxScore}</span>
                    </span>
                  ),
                },
                {
                  key: "comment",
                  header: "Comment (optional)",
                  render: (r) => (
                    <Input
                      type="text"
                      placeholder="e.g. Great improvement"
                      aria-label={`Comment for ${fullName(r.student)}`}
                      value={entries[r.student.id]?.comment ?? ""}
                      onChange={(e) => setComment(r.student.id, e.target.value)}
                      className="min-w-44 [&_input]:h-8 [&_input]:text-[13px]"
                    />
                  ),
                },
              ]}
              rows={data.rows}
              keyField={(r) => r.student.id}
              dense
              empty="No enrolled students in this class."
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-[13px]">
              <span className="text-muted">
                <span className="tnum font-semibold text-ink">{scored.length}</span> of{" "}
                <span className="tnum">{data.rows.length}</span> scores entered
              </span>
              <Button size="sm" loading={save.isPending} disabled={scored.length === 0} onClick={() => save.mutate()}>
                Save grades
              </Button>
            </div>
          </Card>
        </div>

        {/* Distribution side card */}
        <FadeIn>
          <Card>
            <CardHeader title="Score distribution" description="Entered scores, as a share of the max score." />
            {scored.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-muted">Enter scores to see the distribution.</p>
            ) : (
              <BarsChart
                data={distribution}
                xKey="range"
                series={[{ key: "students", name: "Students" }]}
                height={190}
              />
            )}
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
