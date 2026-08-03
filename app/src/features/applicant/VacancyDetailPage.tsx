import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Briefcase, CalendarDays, CheckCircle2, MapPin, Send, Star, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileDrop } from "@/components/ui/FileDrop";
import { Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Timeline } from "@/components/ui/Timeline";
import { useAuth } from "@/hooks/useAuth";
import { recruitmentService } from "@/services/recruitmentService";
import { schoolService } from "@/services/schoolService";
import { USE_MOCKS, type ApiError } from "@/lib/api/client";
import { formatDate, formatDateTime, formatNumber, formatRWF, fullName } from "@/lib/format";
import { toast } from "@/stores/uiStore";
import { JOB_STAGE, SCHOOL_TYPE_LABEL } from "@/lib/status";
import type { JobApplicationStage } from "@/types";
import { cn } from "@/lib/utils";
import { daysUntil } from "./shared";

const MIN_COVER_LETTER = 40;

const stageTone = (stage: JobApplicationStage) =>
  stage === "OFFERED" || stage === "HIRED" ? "success"
  : stage === "REJECTED" ? "danger"
  : stage === "SHORTLISTED" || stage === "INTERVIEW" ? "warning"
  : "default";

export default function VacancyDetailPage() {
  const { vacancyId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [applyOpen, setApplyOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [cvFiles, setCvFiles] = useState<string[]>([]);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ coverLetter?: string; cv?: string }>({});

  const { data: vacancy, isLoading, isError } = useQuery({
    queryKey: ["vacancy", vacancyId],
    queryFn: () => recruitmentService.vacancy(vacancyId),
  });
  const { data: school } = useQuery({
    queryKey: ["school", vacancy?.schoolId],
    queryFn: () => schoolService.get(vacancy!.schoolId),
    enabled: Boolean(vacancy),
  });
  const { data: applications = [] } = useQuery({
    queryKey: ["job-applications", user?.id],
    queryFn: () => recruitmentService.applicationsByApplicant(user!.id),
    enabled: Boolean(user),
  });
  const { data: profile } = useQuery({
    queryKey: ["applicant-profile", user?.id],
    queryFn: () => recruitmentService.profile(user!.id),
    enabled: Boolean(user),
  });

  const existing = applications.find((a) => a.vacancyId === vacancyId);

  const apply = useMutation({
    mutationFn: () =>
      recruitmentService.apply({
        vacancyId,
        applicantId: user!.id,
        applicantName: fullName(user!),
        coverLetter: coverLetter.trim(),
        cvFileName: cvFiles[0]!,
        cvFile: cvFile ?? undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["job-applications"] });
      void qc.invalidateQueries({ queryKey: ["vacancies"] });
      void qc.invalidateQueries({ queryKey: ["vacancy"] });
      toast({
        title: "Application sent",
        description: `${vacancy?.schoolName} will review it and update you here.`,
        variant: "success",
      });
      navigate("/applicant/applications");
    },
    onError: (e) =>
      toast({
        title: "Could not apply",
        description: (e as unknown as ApiError).message ?? "Please try again.",
        variant: "error",
      }),
  });

  const openApply = () => {
    // The CV-builder profile is a purely local convenience (the backend has no profile store), so a
    // prefilled file name only carries real bytes in mock mode — in live mode the applicant must pick
    // the actual file so it can be uploaded.
    if (USE_MOCKS && cvFiles.length === 0) {
      const cvDoc = profile?.documents.find((d) => d.type === "CV");
      if (cvDoc) setCvFiles([cvDoc.fileName]);
    }
    setErrors({});
    setCvFile(null);
    setApplyOpen(true);
  };

  const submit = () => {
    const next: { coverLetter?: string; cv?: string } = {};
    if (coverLetter.trim().length < MIN_COVER_LETTER) {
      next.coverLetter = `Write at least ${MIN_COVER_LETTER} characters — tell the school why you fit this role.`;
    }
    if (cvFiles.length === 0) next.cv = "Attach your CV to apply.";
    else if (!USE_MOCKS && !cvFile) next.cv = "Select your CV file again so it can be uploaded.";
    setErrors(next);
    if (Object.keys(next).length === 0) apply.mutate();
  };

  if (isError) {
    return (
      <PageTransition>
        <PageHeader backTo="/applicant/jobs" backLabel="Job board" title="Vacancy" />
        <EmptyState
          icon={Briefcase}
          title="Vacancy not found"
          description="It may have been removed by the school. Browse the job board for open positions."
        />
      </PageTransition>
    );
  }

  if (isLoading || !vacancy) {
    return (
      <PageTransition>
        <PageHeader backTo="/applicant/jobs" backLabel="Job board" title="Loading vacancy…" />
        <div className="grid lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2 space-y-4"><CardSkeleton /><CardSkeleton /></div>
          <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div>
        </div>
      </PageTransition>
    );
  }

  const closingSoon = vacancy.status === "OPEN" && daysUntil(vacancy.deadline) <= 5;

  return (
    <PageTransition>
      <PageHeader
        backTo="/applicant/jobs"
        backLabel="Job board"
        title={vacancy.title}
        description={`${vacancy.schoolName} · ${vacancy.district}`}
        actions={
          vacancy.status === "OPEN" && !existing ? (
            <Button icon={<Send className="size-4" />} onClick={openApply}>Apply now</Button>
          ) : undefined
        }
      />

      {vacancy.status === "CLOSED" && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-clay-soft px-4 py-3 text-[13px] text-clay-deep">
          <AlertTriangle className="size-4.5 shrink-0 mt-0.5" aria-hidden />
          <p>This vacancy is closed and no longer accepts applications.</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        {/* Main column */}
        <div className="lg:col-span-2 min-w-0 space-y-4">
          <Card>
            <div className="flex flex-wrap gap-1.5 mb-3.5">
              {vacancy.subject && <Badge variant="success">{vacancy.subject}</Badge>}
              <Badge variant={vacancy.status === "OPEN" ? "success" : "neutral"} dot>
                {vacancy.status === "OPEN" ? "Open" : "Closed"}
              </Badge>
            </div>
            <p className="text-[13.5px] text-ink leading-relaxed">{vacancy.description}</p>

            {vacancy.requirements.length > 0 && (
              <>
                <h3 className="font-display font-semibold text-[14px] text-ink mt-5 mb-2.5">Requirements</h3>
                <ul className="space-y-2">
                  {vacancy.requirements.map((r) => (
                    <li key={r} className="flex items-start gap-2 text-[12.5px] text-ink">
                      <CheckCircle2 className="size-4 text-primary-deep shrink-0 mt-px" aria-hidden />
                      {r}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          {existing && (
            <FadeIn>
              <Card>
                <CardHeader
                  title="Your application"
                  description={`Applied ${formatDate(existing.appliedAt)} with ${existing.cvFileName}.`}
                  action={<Badge variant={JOB_STAGE[existing.stage].variant} dot>{JOB_STAGE[existing.stage].label}</Badge>}
                />
                <Timeline
                  events={existing.timeline.map((e) => ({
                    title: JOB_STAGE[e.stage].label,
                    meta: formatDateTime(e.at),
                    description: e.note,
                    tone: stageTone(e.stage),
                  }))}
                />
              </Card>
            </FadeIn>
          )}
        </div>

        {/* Side column */}
        <div className="space-y-4">
          <Card padded={false} className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-3">About the school</p>
            {school ? (
              <div className="space-y-1.5 text-[12.5px]">
                <p className="font-display font-semibold text-[14px] text-ink">{school.name}</p>
                <p className="flex items-center gap-1.5 text-muted">
                  <MapPin className="size-3.5 shrink-0" aria-hidden /> {school.district} · {school.sector}
                </p>
                <p className="text-muted">{SCHOOL_TYPE_LABEL[school.type]} school</p>
                {school.satisfactionScore !== undefined && (
                  <p className="flex items-center gap-1.5 font-semibold text-gold-deep tnum">
                    <Star className="size-3.5 fill-gold text-gold" aria-hidden /> {school.satisfactionScore.toFixed(1)} parent satisfaction
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-32" />
              </div>
            )}
          </Card>

          <Card padded={false} className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-3">About this role</p>
            <dl className="grid grid-cols-2 gap-y-2 gap-x-3 text-[12.5px]">
              <dt className="text-muted">Salary</dt>
              <dd className="font-medium text-ink tnum text-right">
                {vacancy.salaryRange
                  ? `${formatRWF(vacancy.salaryRange.min)} – ${formatRWF(vacancy.salaryRange.max)}`
                  : "Not disclosed"}
              </dd>
              <dt className="text-muted">Deadline</dt>
              <dd className={cn("font-medium tnum inline-flex items-center justify-end gap-1.5", closingSoon ? "text-clay-deep" : "text-ink")}>
                <CalendarDays className="size-3.5" aria-hidden /> {formatDate(vacancy.deadline)}
              </dd>
              <dt className="text-muted">Posted</dt>
              <dd className="font-medium text-ink tnum text-right">{formatDate(vacancy.postedAt)}</dd>
              <dt className="text-muted">Applicants</dt>
              <dd className="font-medium text-ink tnum inline-flex items-center justify-end gap-1.5">
                <Users className="size-3.5" aria-hidden /> {formatNumber(vacancy.applicantsCount)}
              </dd>
            </dl>
            {vacancy.status === "OPEN" && !existing && (
              <Button className="w-full mt-4" icon={<Send className="size-4" />} onClick={openApply}>
                Apply now
              </Button>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title={`Apply — ${vacancy.title}`}
        description={`${vacancy.schoolName} · closes ${formatDate(vacancy.deadline)}`}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button icon={<Send className="size-4" />} loading={apply.isPending} onClick={submit}>
              Submit application
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Textarea
            label="Cover letter"
            required
            rows={6}
            value={coverLetter}
            error={errors.coverLetter}
            hint="A short, specific note works best — reference the role's requirements."
            placeholder={`Why are you the right fit for this role at ${vacancy.schoolName}?`}
            onChange={(e) => setCoverLetter(e.target.value)}
          />
          <div>
            <FileDrop
              label="Your CV"
              files={cvFiles}
              onChange={setCvFiles}
              onFilesChange={(picked) => setCvFile(picked[0] ?? null)}
              multiple={false}
              accept=".pdf,.doc,.docx"
              hint={
                USE_MOCKS
                  ? "One file — we prefilled the CV from your profile if you have one."
                  : "One file — PDF or Word document."
              }
            />
            {errors.cv && (
              <p className="text-[12.5px] text-clay-deep mt-1.5" role="alert">{errors.cv}</p>
            )}
          </div>
        </div>
      </Modal>
    </PageTransition>
  );
}
