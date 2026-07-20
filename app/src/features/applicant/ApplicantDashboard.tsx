import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Briefcase, FileText, Sparkles, Star } from "lucide-react";
import { HeroBanner } from "@/components/layout/HeroBanner";
import { FadeIn, PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { recruitmentService } from "@/services/recruitmentService";
import { percent, timeAgo } from "@/lib/format";
import { JOB_STAGE } from "@/lib/status";
import type { JobApplication } from "@/types";
import { profileStrength } from "./shared";

const lastActivityAt = (a: JobApplication) => a.timeline[a.timeline.length - 1]?.at ?? a.appliedAt;

export default function ApplicantDashboard() {
  const { user } = useAuth();

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["applicant-profile", user?.id],
    queryFn: () => recruitmentService.profile(user!.id),
    enabled: Boolean(user),
  });
  const { data: applications = [], isLoading: loadingApps } = useQuery({
    queryKey: ["job-applications", user?.id],
    queryFn: () => recruitmentService.applicationsByApplicant(user!.id),
    enabled: Boolean(user),
  });
  const { data: vacancies = [], isLoading: loadingVacancies } = useQuery({
    queryKey: ["vacancies"],
    queryFn: () => recruitmentService.vacancies(),
  });

  const active = applications.filter((a) => !["HIRED", "REJECTED"].includes(a.stage));
  const inProcess = applications.filter((a) => ["SHORTLISTED", "INTERVIEW"].includes(a.stage));
  const strength = profile ? profileStrength(profile) : 0;

  const recent = [...applications].sort((a, b) => lastActivityAt(b).localeCompare(lastActivityAt(a)));

  const appliedIds = new Set(applications.map((a) => a.vacancyId));
  const matches = vacancies.filter(
    (v) =>
      !appliedIds.has(v.id) &&
      ((v.positionType === "TEACHER" && Boolean(v.subject) && (profile?.subjects ?? []).includes(v.subject!)) ||
        v.district === profile?.district),
  );
  const recommended = (matches.length > 0 ? matches : vacancies.filter((v) => !appliedIds.has(v.id))).slice(0, 5);

  const loading = loadingProfile || loadingApps || loadingVacancies;

  return (
    <PageTransition>
      <HeroBanner
        eyebrow="Careers"
        title={`Muraho, ${user?.firstName ?? ""}`}
        subtitle={profile?.headline ?? "Your job search across Rwanda's schools, in one place."}
        stats={
          loading
            ? undefined
            : [
                { label: "Active applications", value: String(active.length) },
                { label: "Shortlisted", value: String(inProcess.length) },
                { label: "Open roles", value: String(vacancies.length) },
              ]
        }
        actions={
          <Link to="/applicant/jobs">
            <Button variant="gold" icon={<Briefcase className="size-4" />}>Browse jobs</Button>
          </Link>
        }
      />

      {/* KPI row */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      ) : (
        <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StaggerItem>
            <StatCard label="Active applications" value={String(active.length)} icon={FileText} tone="primary" />
          </StaggerItem>
          <StaggerItem>
            <StatCard label="Shortlisted / interview" value={String(inProcess.length)} icon={Star} tone="gold" />
          </StaggerItem>
          <StaggerItem>
            <StatCard label="Open vacancies" value={String(vacancies.length)} icon={Briefcase} tone="sky" />
          </StaggerItem>
          <StaggerItem>
            <Card padded={false} className="h-full p-4">
              <p className="text-[12px] font-medium text-muted">Profile strength</p>
              <p className="font-display text-[22px] leading-7 font-bold text-ink tnum mt-1.5">{percent(strength)}</p>
              <ProgressBar value={strength} label="Profile strength" className="mt-2" />
              <Link
                to="/applicant/profile"
                className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-deep hover:underline mt-2"
              >
                {strength < 1 ? "Complete your profile" : "View your profile"}
                <ArrowRight className="size-3.5" />
              </Link>
            </Card>
          </StaggerItem>
        </Stagger>
      )}

      <div className="grid lg:grid-cols-3 gap-4 mt-4 items-start">
        {/* Recent activity */}
        <Card padded={false} className="lg:col-span-2">
          <CardHeader
            className="px-4 pt-4 mb-0"
            title="Recent activity"
            description="Latest movement on your applications."
            action={
              <Link to="/applicant/applications" className="text-[12.5px] font-medium text-primary-deep hover:underline">
                All applications
              </Link>
            }
          />
          {loadingApps ? (
            <div className="px-4 pb-4 pt-3"><CardSkeleton /></div>
          ) : recent.length === 0 ? (
            <p className="px-4 pb-7 pt-4 text-center text-[12.5px] text-muted">
              No applications yet — your activity will appear here.
            </p>
          ) : (
            <div className="divide-y divide-line mt-2">
              {recent.slice(0, 5).map((app) => {
                const meta = JOB_STAGE[app.stage];
                return (
                  <div key={app.id} className="flex items-center gap-3 px-4 py-3">
                    <FileText className="size-4 text-muted shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink truncate">{app.vacancyTitle}</p>
                      <p className="text-[12px] text-muted truncate">
                        {app.schoolName} · updated {timeAgo(lastActivityAt(app))}
                      </p>
                    </div>
                    <Badge variant={meta.variant} dot>{meta.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recommended vacancies — compact right rail */}
        <FadeIn>
          <Card padded={false}>
            <CardHeader
              className="px-4 pt-4 mb-0"
              title="Recommended for you"
              description={matches.length > 0 ? "Matched to your subjects and district." : "Newest openings on the platform."}
              action={
                <Link to="/applicant/jobs" className="text-[12.5px] font-medium text-primary-deep hover:underline">
                  Job board
                </Link>
              }
            />
            {loading ? (
              <div className="px-4 pb-4 pt-3"><CardSkeleton /></div>
            ) : recommended.length === 0 ? (
              <p className="px-4 pb-7 pt-4 text-center text-[12.5px] text-muted">
                Nothing new right now — check the job board later.
              </p>
            ) : (
              <div className="divide-y divide-line mt-2">
                {recommended.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink truncate">{v.title}</p>
                      <p className="text-[12px] text-muted truncate">
                        {v.schoolName} · {v.district}
                      </p>
                    </div>
                    <Link
                      to={`/applicant/jobs/${v.id}`}
                      className="shrink-0 text-[12px] font-semibold text-primary-deep hover:underline"
                    >
                      Apply
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </FadeIn>
      </div>

      {/* Nudge when the profile is incomplete */}
      {!loading && profile && strength < 1 && (
        <FadeIn delay={0.1}>
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-gold-soft px-4 py-3 text-[13px] text-gold-deep">
            <Sparkles className="size-4.5 shrink-0 mt-0.5" aria-hidden />
            <p>
              Applicants with complete profiles get shortlisted more often.{" "}
              <Link to="/applicant/profile" className="font-semibold underline underline-offset-2">
                Finish your CV
              </Link>{" "}
              — it takes about two minutes.
            </p>
          </div>
        </FadeIn>
      )}
    </PageTransition>
  );
}
