import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Inbox, Info, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition } from "@/components/motion";
import { Can } from "@/components/auth/guards";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Textarea } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Timeline } from "@/components/ui/Timeline";
import { useAuth } from "@/hooks/useAuth";
import { P } from "@/config/permissions";
import { recruitmentService } from "@/services/recruitmentService";
import { toast } from "@/stores/uiStore";
import { formatDate, formatDateTime, timeAgo } from "@/lib/format";
import { VACANCY_STATUS } from "@/lib/status";
import type { ApiError } from "@/lib/api/client";
import type { JobApplication, JobApplicationStage } from "@/types";

const COLUMNS: { stage: JobApplicationStage; label: string }[] = [
  { stage: "APPLIED", label: "Applied" },
  { stage: "SHORTLISTED", label: "Shortlisted" },
  { stage: "REJECTED", label: "Not selected" },
];

export default function VacancyPipelinePage() {
  const { user } = useAuth();
  const { vacancyId } = useParams<{ vacancyId: string }>();
  const schoolId = user!.schoolId!;
  const qc = useQueryClient();
  const [selected, setSelected] = useState<JobApplication | null>(null);
  const [interview, setInterview] = useState({ interviewAt: "", interviewLocation: "", message: "" });
  const [rejectReason, setRejectReason] = useState("");
  const [action, setAction] = useState<"shortlist" | "reject" | null>(null);

  const { data: vacancy } = useQuery({
    queryKey: ["vacancy", vacancyId],
    queryFn: () => recruitmentService.vacancy(vacancyId!),
    enabled: Boolean(vacancyId),
  });

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["job-applications", schoolId, vacancyId],
    queryFn: () => recruitmentService.applicationsByVacancy(schoolId, vacancyId!),
    enabled: Boolean(vacancyId),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["job-applications"] });

  const shortlist = useMutation({
    mutationFn: () =>
      recruitmentService.shortlistApplicant(schoolId, vacancyId!, selected!.id, {
        interviewAt: new Date(interview.interviewAt).toISOString(),
        interviewLocation: interview.interviewLocation.trim(),
        message: interview.message.trim() || undefined,
      }),
    onSuccess: (updated) => {
      setSelected(updated);
      setAction(null);
      invalidate();
      toast({ title: "Applicant shortlisted", description: `${updated.applicantName} was emailed the interview details.`, variant: "success" });
    },
    onError: (e) => toast({ title: "Could not shortlist", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const reject = useMutation({
    mutationFn: () => recruitmentService.rejectApplicant(schoolId, vacancyId!, selected!.id, rejectReason.trim() || undefined),
    onSuccess: (updated) => {
      setSelected(updated);
      setAction(null);
      invalidate();
      toast({ title: "Applicant rejected", variant: "success" });
    },
    onError: (e) => toast({ title: "Could not reject", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const statusMeta = vacancy ? VACANCY_STATUS[vacancy.status] : null;

  return (
    <PageTransition>
      <PageHeader
        backTo="/school/recruitment"
        backLabel="Recruitment"
        title={vacancy?.title ?? "Vacancy pipeline"}
        description={vacancy ? `Deadline ${formatDate(vacancy.deadline)}` : undefined}
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

      <div className="mb-4 flex items-start gap-2.5 rounded-(--radius-card) border border-line bg-sky-soft/60 px-4 py-3 text-[13px] text-sky-deep">
        <Info className="size-4 shrink-0 mt-0.5" aria-hidden />
        <span>
          The real hiring model only tracks Applied → Shortlisted (with interview details) → Not selected — there is
          no Offer/Hire stage on the platform. Once you decide to hire someone, that's tracked outside E-SHURI for now.
        </span>
      </div>

      {!isLoading && applications.length === 0 ? (
        <EmptyState icon={Inbox} title="No applications yet" description="Candidates who apply on the national job board appear here." />
      ) : (
        <FadeIn>
          <div className="overflow-x-auto pb-2 -mx-1 px-1">
            <div className="grid grid-cols-3 gap-3 min-w-[640px]">
              {COLUMNS.map((col) => {
                const inColumn = applications.filter((a) => a.stage === col.stage);
                return (
                  <section key={col.stage} aria-label={`${col.label} column`} className="flex flex-col">
                    <div className="flex items-center gap-2 px-1 mb-2">
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint truncate">{col.label}</h3>
                      <span className="ml-auto rounded-full bg-ink/8 px-1.5 py-0.5 text-[10.5px] font-semibold leading-none text-muted tnum">{inColumn.length}</span>
                    </div>
                    <div className="flex-1 rounded-(--radius-card) bg-paper/60 border border-line p-2 space-y-2 min-h-32">
                      {isLoading ? (
                        <><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></>
                      ) : inColumn.length === 0 ? (
                        <p className="text-[12px] text-faint text-center py-6">No candidates</p>
                      ) : (
                        inColumn.map((a) => (
                          <Card key={a.id} hover padded={false} className="p-3 cursor-pointer" onClick={() => { setSelected(a); setAction(null); }}>
                            <div className="flex items-start gap-2.5">
                              <Avatar name={a.applicantName} size="sm" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-semibold text-ink truncate">{a.applicantName}</p>
                                <p className="text-[12px] text-muted line-clamp-1 mt-0.5">{a.applicantHeadline}</p>
                              </div>
                            </div>
                            <p className="text-[11px] text-faint mt-2">Applied {timeAgo(a.appliedAt)}</p>
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

      <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.applicantName ?? ""} description={selected?.applicantHeadline || undefined}>
        {selected && (
          <div className="space-y-5">
            <Badge variant={selected.stage === "SHORTLISTED" ? "warning" : selected.stage === "REJECTED" ? "danger" : "info"} dot>
              {COLUMNS.find((c) => c.stage === selected.stage)?.label ?? selected.stage}
            </Badge>

            {selected.stage === "APPLIED" && (
              <Can permission={P.RECRUITMENT_MANAGE}>
                <div className="rounded-(--radius-card) border border-line bg-paper/60 p-4 space-y-3">
                  {action === "shortlist" ? (
                    <div className="space-y-3">
                      <Input label="Interview date & time" type="datetime-local" value={interview.interviewAt} onChange={(e) => setInterview({ ...interview, interviewAt: e.target.value })} required />
                      <Input label="Interview location" value={interview.interviewLocation} onChange={(e) => setInterview({ ...interview, interviewLocation: e.target.value })} required />
                      <Textarea label="Message (optional)" rows={2} value={interview.message} onChange={(e) => setInterview({ ...interview, message: e.target.value })} />
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setAction(null)}>Cancel</Button>
                        <Button size="sm" loading={shortlist.isPending} disabled={!interview.interviewAt || !interview.interviewLocation.trim()} onClick={() => shortlist.mutate()}>
                          Send shortlist email
                        </Button>
                      </div>
                    </div>
                  ) : action === "reject" ? (
                    <div className="space-y-3">
                      <Textarea label="Reason (optional)" rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setAction(null)}>Cancel</Button>
                        <Button size="sm" variant="danger" loading={reject.isPending} onClick={() => reject.mutate()}>Confirm rejection</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => { setInterview({ interviewAt: "", interviewLocation: "", message: "" }); setAction("shortlist"); }}>Shortlist</Button>
                      <Button size="sm" variant="danger" onClick={() => { setRejectReason(""); setAction("reject"); }}>Reject</Button>
                    </div>
                  )}
                </div>
              </Can>
            )}

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint mb-2">Cover letter</p>
              <p className="text-[13.5px] text-ink leading-relaxed whitespace-pre-line">{selected.coverLetter || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint mb-2">CV</p>
              <span className="inline-flex items-center gap-2.5 rounded-(--radius-ctl) border border-line px-3 py-2.5 text-[13px]">
                <FileText className="size-4 text-primary-deep shrink-0" aria-hidden />
                <span className="text-ink">{selected.cvFileName || "No CV uploaded"}</span>
              </span>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint mb-3">History</p>
              <Timeline
                events={selected.timeline.map((e) => ({
                  title: COLUMNS.find((c) => c.stage === e.stage)?.label ?? e.stage,
                  meta: formatDateTime(e.at),
                  description: e.note,
                  tone: e.stage === "SHORTLISTED" ? "warning" : e.stage === "REJECTED" ? "danger" : "default",
                }))}
              />
            </div>
          </div>
        )}
      </Drawer>
    </PageTransition>
  );
}
