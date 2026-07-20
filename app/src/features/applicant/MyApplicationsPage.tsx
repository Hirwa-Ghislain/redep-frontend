import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Briefcase, ChevronRight, FileText, UserRound } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Timeline } from "@/components/ui/Timeline";
import { useAuth } from "@/hooks/useAuth";
import { recruitmentService } from "@/services/recruitmentService";
import { formatDate, formatDateTime } from "@/lib/format";
import { JOB_STAGE } from "@/lib/status";
import type { JobApplication, JobApplicationStage } from "@/types";

const stageTone = (stage: JobApplicationStage) =>
  stage === "OFFERED" || stage === "HIRED" ? "success"
  : stage === "REJECTED" ? "danger"
  : stage === "SHORTLISTED" || stage === "INTERVIEW" ? "warning"
  : "default";

export default function MyApplicationsPage() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<JobApplication | null>(null);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["job-applications", user?.id],
    queryFn: () => recruitmentService.applicationsByApplicant(user!.id),
    enabled: Boolean(user),
  });

  const stageCounts = (Object.keys(JOB_STAGE) as JobApplicationStage[])
    .map((stage) => ({ stage, count: applications.filter((a) => a.stage === stage).length }))
    .filter((s) => s.count > 0);

  return (
    <PageTransition>
      <PageHeader
        title="My applications"
        description="Every job application you've submitted, with live pipeline status."
        actions={
          <Link to="/applicant/jobs">
            <Button variant="secondary" icon={<Briefcase className="size-4" />}>Browse jobs</Button>
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_310px] items-start">
        {/* Applications */}
        <div className="min-w-0">
          {isLoading ? (
            <div className="space-y-3"><CardSkeleton /><CardSkeleton /></div>
          ) : applications.length === 0 ? (
            <Card padded={false}>
              <EmptyState
                icon={Briefcase}
                title="No applications yet"
                description="Find an open position on the job board and send your first application."
                action={
                  <Link to="/applicant/jobs">
                    <Button iconRight={<ArrowRight className="size-4" />}>Open the job board</Button>
                  </Link>
                }
              />
            </Card>
          ) : (
            <Card padded={false} className="overflow-hidden">
              <Stagger className="divide-y divide-line">
                {applications.map((app) => {
                  const meta = JOB_STAGE[app.stage];
                  return (
                    <StaggerItem key={app.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(app)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-paper/60"
                        aria-label={`View application — ${app.vacancyTitle}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] font-medium text-ink truncate">{app.vacancyTitle}</p>
                          <p className="text-[12px] text-muted truncate mt-0.5">
                            {app.schoolName} — applied {formatDate(app.appliedAt)}
                          </p>
                        </div>
                        <Badge variant={meta.variant} dot>{meta.label}</Badge>
                        <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
                      </button>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            </Card>
          )}
        </div>

        {/* Side rail */}
        <aside className="space-y-4">
          {stageCounts.length > 0 && (
            <Card>
              <CardHeader title="Where you stand" description="Your applications by pipeline stage." />
              <ul className="space-y-2">
                {stageCounts.map(({ stage, count }) => (
                  <li key={stage} className="flex items-center justify-between gap-3">
                    <Badge variant={JOB_STAGE[stage].variant} dot>{JOB_STAGE[stage].label}</Badge>
                    <span className="text-[13px] font-semibold text-ink tnum">{count}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader title="How hiring works" />
            <Timeline
              events={[
                { title: "Applied", description: "Your cover letter and CV land with the school's hiring team.", tone: "success" },
                { title: "Shortlisted", description: "The school marks you as a strong match for the role.", tone: "warning" },
                { title: "Interview", description: "The school contacts you to arrange a conversation.", tone: "warning" },
                { title: "Offer", description: "An offer reserves the position — the school follows up with next steps.", tone: "default" },
              ]}
            />
          </Card>

          <Card className="bg-primary-soft/40 border-primary/25">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
                <UserRound className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-ink">Boost your profile</p>
                <p className="text-[12px] text-muted mt-0.5 mb-2.5">
                  A complete profile with an up-to-date CV is what schools see first when they review you.
                </p>
                <Link to="/applicant/profile">
                  <Button size="sm" variant="secondary">Update profile & CV</Button>
                </Link>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.vacancyTitle ?? ""}
        description={selected ? `${selected.schoolName} · applied ${formatDate(selected.appliedAt)}` : undefined}
      >
        {selected && (
          <div className="space-y-6">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted mb-3">Progress</p>
              <Timeline
                events={selected.timeline.map((e) => ({
                  title: JOB_STAGE[e.stage].label,
                  meta: formatDateTime(e.at),
                  description: e.note,
                  tone: stageTone(e.stage),
                }))}
              />
            </div>

            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted mb-3">Cover letter</p>
              <blockquote className="rounded-(--radius-card) border border-line bg-paper/60 px-4 py-3 text-[13.5px] text-ink leading-relaxed">
                “{selected.coverLetter}”
              </blockquote>
            </div>

            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted mb-3">Attached CV</p>
              <div className="flex items-center gap-2.5 rounded-(--radius-ctl) border border-line px-3 py-2.5 text-[13px]">
                <FileText className="size-4 text-primary-deep shrink-0" aria-hidden />
                <span className="truncate flex-1 text-ink">{selected.cvFileName}</span>
              </div>
            </div>

            {selected.stage === "OFFERED" && (
              <div className="rounded-xl bg-primary-soft px-4 py-3 text-[13px] text-primary-deep">
                Congratulations — the school made you an offer. They will contact you with next steps.
              </div>
            )}
          </div>
        )}
      </Drawer>
    </PageTransition>
  );
}
