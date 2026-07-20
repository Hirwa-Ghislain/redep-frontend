import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightCircle, FileText, Inbox, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition } from "@/components/motion";
import { Can } from "@/components/auth/guards";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { Dropdown } from "@/components/ui/Dropdown";
import { EmptyState } from "@/components/ui/EmptyState";
import { Textarea } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Timeline } from "@/components/ui/Timeline";
import { P } from "@/config/permissions";
import { recruitmentService } from "@/services/recruitmentService";
import { toast } from "@/stores/uiStore";
import { formatDate, formatDateTime, timeAgo } from "@/lib/format";
import { JOB_STAGE, VACANCY_STATUS } from "@/lib/status";
import type { ApiError } from "@/lib/api/client";
import type { EmploymentType, JobApplication, JobApplicationStage, PositionType } from "@/types";

const POSITION_LABEL: Record<PositionType, string> = {
  TEACHER: "Teacher",
  ACCOUNTANT: "Accountant",
  ADMINISTRATOR: "Administrator",
  LIBRARIAN: "Librarian",
  DRIVER: "Driver",
  OTHER: "Other",
};

const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
};

/** Board columns; OFFERED and HIRED share a column to keep five lanes. */
const BOARD_COLUMNS: { key: string; label: string; stages: JobApplicationStage[] }[] = [
  { key: "APPLIED", label: JOB_STAGE.APPLIED.label, stages: ["APPLIED"] },
  { key: "SHORTLISTED", label: JOB_STAGE.SHORTLISTED.label, stages: ["SHORTLISTED"] },
  { key: "INTERVIEW", label: JOB_STAGE.INTERVIEW.label, stages: ["INTERVIEW"] },
  { key: "OFFERED", label: "Offered / Hired", stages: ["OFFERED", "HIRED"] },
  { key: "REJECTED", label: JOB_STAGE.REJECTED.label, stages: ["REJECTED"] },
];

const ALL_STAGES: JobApplicationStage[] = ["APPLIED", "SHORTLISTED", "INTERVIEW", "OFFERED", "HIRED", "REJECTED"];

const stageTone = (stage: JobApplicationStage): "default" | "success" | "warning" | "danger" =>
  stage === "OFFERED" || stage === "HIRED" ? "success" : stage === "REJECTED" ? "danger" : stage === "INTERVIEW" ? "warning" : "default";

export default function VacancyPipelinePage() {
  const { vacancyId } = useParams<{ vacancyId: string }>();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<JobApplication | null>(null);
  const [note, setNote] = useState("");

  const { data: vacancy } = useQuery({
    queryKey: ["vacancy", vacancyId],
    queryFn: () => recruitmentService.vacancy(vacancyId!),
    enabled: Boolean(vacancyId),
  });

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["job-applications", vacancyId],
    queryFn: () => recruitmentService.applicationsByVacancy(vacancyId!),
    enabled: Boolean(vacancyId),
  });

  const move = useMutation({
    mutationFn: (input: { id: string; stage: JobApplicationStage }) =>
      recruitmentService.moveStage(input.id, input.stage, note.trim() || undefined),
    onSuccess: (updated) => {
      setSelected(updated);
      setNote("");
      void qc.invalidateQueries({ queryKey: ["job-applications"] });
      void qc.invalidateQueries({ queryKey: ["vacancy"] });
      toast({
        title: `Moved to ${JOB_STAGE[updated.stage].label}`,
        description: `${updated.applicantName} has been notified.`,
        variant: "success",
      });
    },
    onError: (e) => toast({ title: "Could not move candidate", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const statusMeta = vacancy ? VACANCY_STATUS[vacancy.status] : null;

  return (
    <PageTransition>
      <PageHeader
        backTo="/school/recruitment"
        backLabel="Recruitment"
        title={vacancy?.title ?? "Vacancy pipeline"}
        description={
          vacancy
            ? `${POSITION_LABEL[vacancy.positionType]}${vacancy.subject ? ` · ${vacancy.subject}` : ""} · ${EMPLOYMENT_LABEL[vacancy.employmentType]} · deadline ${formatDate(vacancy.deadline)}`
            : undefined
        }
        actions={
          statusMeta ? (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
                <Users className="size-4" aria-hidden />
                <span className="tnum">{applications.length}</span> candidate{applications.length === 1 ? "" : "s"}
              </span>
              <Badge variant={statusMeta.variant} dot>{statusMeta.label}</Badge>
            </div>
          ) : undefined
        }
      />

      {!isLoading && applications.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No applications yet"
          description="Candidates who apply on the national job board appear here, sorted by stage."
        />
      ) : (
        <FadeIn>
          <div className="overflow-x-auto pb-2 -mx-1 px-1">
            <div className="grid grid-cols-5 gap-3 min-w-[900px]">
              {BOARD_COLUMNS.map((col) => {
                const inColumn = applications.filter((a) => col.stages.includes(a.stage));
                return (
                  <section key={col.key} aria-label={`${col.label} column`} className="flex flex-col">
                    <div className="flex items-center gap-2 px-1 mb-2">
                      <span className="size-1.5 rounded-full bg-current text-faint" aria-hidden />
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint truncate">
                        {col.label}
                      </h3>
                      <span className="ml-auto rounded-full bg-ink/8 px-1.5 py-0.5 text-[10.5px] font-semibold leading-none text-muted tnum">
                        {inColumn.length}
                      </span>
                    </div>
                    <div className="flex-1 rounded-(--radius-card) bg-paper/60 border border-line p-2 space-y-2 min-h-32">
                      {isLoading ? (
                        <>
                          <Skeleton className="h-20 w-full" />
                          <Skeleton className="h-20 w-full" />
                        </>
                      ) : inColumn.length === 0 ? (
                        <p className="text-[12px] text-faint text-center py-6">No candidates</p>
                      ) : (
                        inColumn.map((a) => (
                          <Card
                            key={a.id}
                            hover
                            padded={false}
                            className="p-3 cursor-pointer"
                            onClick={() => { setSelected(a); setNote(""); }}
                          >
                            <div className="flex items-start gap-2.5">
                              <Avatar name={a.applicantName} size="sm" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-semibold text-ink truncate">{a.applicantName}</p>
                                <p className="text-[12px] text-muted line-clamp-1 mt-0.5">{a.applicantHeadline}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-2">
                              <span className="text-[11px] text-faint">Applied {timeAgo(a.appliedAt)}</span>
                              {col.stages.length > 1 && (
                                <Badge variant={JOB_STAGE[a.stage].variant} className="text-[10.5px] px-2">
                                  {JOB_STAGE[a.stage].label}
                                </Badge>
                              )}
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </FadeIn>
      )}

      {/* Candidate drawer */}
      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.applicantName ?? ""}
        description={selected?.applicantHeadline || undefined}
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={JOB_STAGE[selected.stage].variant} dot>{JOB_STAGE[selected.stage].label}</Badge>
              <span className="text-[12.5px] text-muted">Applied {formatDate(selected.appliedAt)}</span>
            </div>

            <Can permission={P.RECRUITMENT_MANAGE}>
              <div className="rounded-(--radius-card) border border-line bg-paper/60 p-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Update stage</p>
                <Textarea
                  label="Note (optional)"
                  placeholder="E.g. Interview scheduled for Friday 10:00…"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Dropdown
                  align="left"
                  trigger={
                    <Button variant="secondary" loading={move.isPending} icon={<ArrowRightCircle className="size-4" />}>
                      Move to stage
                    </Button>
                  }
                  items={ALL_STAGES.map((stage) => ({
                    label: JOB_STAGE[stage].label,
                    disabled: stage === selected.stage,
                    danger: stage === "REJECTED",
                    onSelect: () => move.mutate({ id: selected.id, stage }),
                  }))}
                />
                <p className="text-[12px] text-muted">The candidate is notified automatically on every stage change.</p>
              </div>
            </Can>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint mb-2">Cover letter</p>
              <p className="text-[13.5px] text-ink leading-relaxed whitespace-pre-line">{selected.coverLetter}</p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint mb-2">CV</p>
              <span className="inline-flex items-center gap-2.5 rounded-(--radius-ctl) border border-line px-3 py-2.5 text-[13px]">
                <FileText className="size-4 text-primary-deep shrink-0" aria-hidden />
                <span className="text-ink">{selected.cvFileName}</span>
              </span>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint mb-3">History</p>
              <Timeline
                events={selected.timeline.map((e) => ({
                  title: JOB_STAGE[e.stage].label,
                  meta: formatDateTime(e.at),
                  description: e.note,
                  tone: stageTone(e.stage),
                }))}
              />
            </div>
          </div>
        )}
      </Drawer>
    </PageTransition>
  );
}
