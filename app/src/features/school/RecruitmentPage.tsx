import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Briefcase, CalendarDays, Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Can } from "@/components/auth/guards";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { P } from "@/config/permissions";
import { recruitmentService } from "@/services/recruitmentService";
import { toast } from "@/stores/uiStore";
import { formatDate } from "@/lib/format";
import { VACANCY_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/lib/api/client";
import type { Vacancy } from "@/types";

interface VacancyForm {
  title: string;
  deadline: string;
  description: string;
  requirements: string;
}

const EMPTY_FORM: VacancyForm = { title: "", deadline: "", description: "", requirements: "" };

export default function RecruitmentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const schoolId = user!.schoolId!;
  const [postOpen, setPostOpen] = useState(false);
  const [form, setForm] = useState<VacancyForm>(EMPTY_FORM);
  const [closeTarget, setCloseTarget] = useState<Vacancy | null>(null);

  const { data: vacancies = [], isLoading } = useQuery({
    queryKey: ["vacancies", schoolId],
    queryFn: () => recruitmentService.vacanciesBySchool(schoolId),
  });

  const openCount = vacancies.filter((v) => v.status === "OPEN").length;
  const totalApplicants = vacancies.reduce((s, v) => s + v.applicantsCount, 0);
  const closedCount = vacancies.filter((v) => v.status === "CLOSED").length;

  const post = useMutation({
    mutationFn: () =>
      recruitmentService.saveVacancy({
        schoolId, schoolName: "", district: "",
        title: form.title.trim(), positionType: "OTHER", employmentType: "FULL_TIME",
        deadline: form.deadline, description: form.description.trim(),
        requirements: form.requirements.split("\n").map((r) => r.trim()).filter(Boolean),
      }),
    onSuccess: (v) => {
      setPostOpen(false);
      setForm(EMPTY_FORM);
      void qc.invalidateQueries({ queryKey: ["vacancies"] });
      toast({ title: "Vacancy posted", description: `"${v.title}" is now visible to job seekers.`, variant: "success" });
    },
    onError: (e) => toast({ title: "Could not post vacancy", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const close = useMutation({
    mutationFn: (id: string) => recruitmentService.closeVacancy(schoolId, id),
    onSuccess: (v) => {
      setCloseTarget(null);
      void qc.invalidateQueries({ queryKey: ["vacancies"] });
      toast({ title: "Vacancy closed", description: `"${v.title}" no longer accepts applications.`, variant: "success" });
    },
    onError: (e) => toast({ title: "Could not close", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  return (
    <PageTransition>
      <PageHeader
        title="Recruitment"
        description="Post vacancies and track every applicant through the hiring pipeline."
        actions={
          <Can permission={P.RECRUITMENT_MANAGE}>
            <Button icon={<Plus className="size-4" />} onClick={() => { setForm(EMPTY_FORM); setPostOpen(true); }}>
              Post vacancy
            </Button>
          </Can>
        }
      />

      <Stagger className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StaggerItem><StatCard label="Open vacancies" value={String(openCount)} icon={Briefcase} tone="primary" /></StaggerItem>
        <StaggerItem><StatCard label="Total applicants" value={String(totalApplicants)} icon={Users} tone="sky" /></StaggerItem>
        <StaggerItem><StatCard label="Closed" value={String(closedCount)} icon={Archive} tone="gold" /></StaggerItem>
      </Stagger>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-3.5 mt-4"><CardSkeleton /><CardSkeleton /></div>
      ) : vacancies.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No vacancies yet"
          description="Post your first vacancy — teachers and other candidates across Rwanda can apply directly."
          className="mt-4"
          action={
            <Can permission={P.RECRUITMENT_MANAGE}>
              <Button icon={<Plus className="size-4" />} onClick={() => { setForm(EMPTY_FORM); setPostOpen(true); }}>Post vacancy</Button>
            </Can>
          }
        />
      ) : (
        <Stagger className="grid md:grid-cols-2 gap-3.5 mt-4">
          {vacancies.map((v) => {
            const meta = VACANCY_STATUS[v.status];
            const pastDeadline = new Date(v.deadline).getTime() < Date.now();
            return (
              <StaggerItem key={v.id} className="h-full">
                <Card hover padded={false} className="p-4 cursor-pointer h-full flex flex-col" onClick={() => navigate(`/school/recruitment/${v.id}`)}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display font-bold text-[14px] text-ink">{v.title}</h3>
                    <Badge variant={meta.variant} dot>{meta.label}</Badge>
                  </div>
                  <p className="text-[12.5px] text-muted line-clamp-2 mt-2 flex-1">{v.description}</p>
                  <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 mt-3 pt-3 border-t border-line text-[12px]">
                    <span className={cn("inline-flex items-center gap-1.5", pastDeadline && v.status === "OPEN" ? "text-clay-deep font-medium" : "text-muted")}>
                      <CalendarDays className="size-3.5" aria-hidden />
                      <span className="tnum">{formatDate(v.deadline)}</span>
                      {pastDeadline && v.status === "OPEN" && " · past deadline"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-muted">
                      <Users className="size-3.5" aria-hidden />
                      <span className="tnum">{v.applicantsCount}</span> applicant{v.applicantsCount === 1 ? "" : "s"}
                    </span>
                    {v.status === "OPEN" && (
                      <Can permission={P.RECRUITMENT_MANAGE}>
                        <Button variant="secondary" size="sm" className="ml-auto" onClick={(e) => { e.stopPropagation(); setCloseTarget(v); }}>
                          Close
                        </Button>
                      </Can>
                    )}
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      <Modal
        open={postOpen}
        onClose={() => !post.isPending && setPostOpen(false)}
        title="Post a vacancy"
        description="Published to the national job board immediately."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPostOpen(false)} disabled={post.isPending}>Cancel</Button>
            <Button loading={post.isPending} disabled={!form.title.trim() || !form.deadline || !form.description.trim()} onClick={() => post.mutate()}>
              Publish vacancy
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Input label="Title" placeholder="E.g. Mathematics teacher — upper secondary" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          <Input label="Deadline" type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} required />
          <Textarea label="Description" rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
          <Textarea
            label="Requirements" hint="One requirement per line." rows={4}
            value={form.requirements}
            onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))}
            placeholder={"Bachelor's degree in Education\n3+ years teaching experience"}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(closeTarget)}
        onClose={() => !close.isPending && setCloseTarget(null)}
        title="Close vacancy?"
        description={closeTarget ? `"${closeTarget.title}" will stop accepting new applications.` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCloseTarget(null)} disabled={close.isPending}>Cancel</Button>
            <Button variant="danger" loading={close.isPending} onClick={() => closeTarget && close.mutate(closeTarget.id)}>Close vacancy</Button>
          </>
        }
      >
        <p className="text-[13.5px] text-muted">Candidates already in the pipeline keep their place.</p>
      </Modal>
    </PageTransition>
  );
}
