import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Plus, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition } from "@/components/motion";
import { Can } from "@/components/auth/guards";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useAuth, usePermission } from "@/hooks/useAuth";
import { P } from "@/config/permissions";
import { schoolService } from "@/services/schoolService";
import { toast } from "@/stores/uiStore";
import type { ApiError } from "@/lib/api/client";

export default function SchoolProfileEditorPage() {
  const { user } = useAuth();
  const { has } = usePermission();
  const qc = useQueryClient();
  const schoolId = user!.schoolId!;
  const canEdit = has(P.SCHOOL_PROFILE_EDIT);

  const { data: school, isLoading } = useQuery({
    queryKey: ["school", schoolId],
    queryFn: () => schoolService.get(schoolId),
  });

  const [achievement, setAchievement] = useState({ title: "", description: "" });

  const sync = useMutation({
    mutationFn: () => schoolService.syncNesaProfile(schoolId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["school"] });
      toast({ title: "Profile re-synced", description: "Ownership, boarding type and accredited levels were refreshed from NESA.", variant: "success" });
    },
    onError: (e) => toast({ title: "Could not sync", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const addAchievement = useMutation({
    mutationFn: () => schoolService.addAchievement(schoolId, { title: achievement.title.trim(), description: achievement.description.trim() || undefined }),
    onSuccess: () => {
      setAchievement({ title: "", description: "" });
      void qc.invalidateQueries({ queryKey: ["school"] });
      toast({ title: "Achievement added", variant: "success" });
    },
    onError: (e) => toast({ title: "Could not add achievement", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  if (isLoading || !school) {
    return (
      <PageTransition>
        <PageHeader title="Public profile" description="How your school appears to parents in Discover." />
        <div className="grid lg:grid-cols-2 gap-4"><CardSkeleton /><CardSkeleton /></div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        title="Public profile"
        description="Most identity fields come from your accredited NESA registration and can only be corrected by re-syncing — the school admin can't freely edit them here."
        actions={
          <Can permission={P.SCHOOL_PROFILE_EDIT}>
            <Button icon={<RefreshCw className="size-4" />} loading={sync.isPending} onClick={() => sync.mutate()}>
              Re-sync from NESA
            </Button>
          </Can>
        }
      />

      {!canEdit && (
        <FadeIn>
          <div className="mb-4 flex items-center gap-2.5 rounded-(--radius-card) border border-line bg-sky-soft/60 px-4 py-3 text-[13px] text-sky-deep">
            <Info className="size-4 shrink-0" aria-hidden />
            You have view-only access — ask an administrator for the "Edit public profile" permission to make changes.
          </div>
        </FadeIn>
      )}

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <Card>
          <CardHeader title="NESA-sourced identity" description="Not editable here — accurate only via re-sync." />
          <dl className="divide-y divide-line text-[13px]">
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-muted">Name</dt>
              <dd className="font-medium text-ink text-right">{school.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-muted">Location</dt>
              <dd className="font-medium text-ink text-right">{school.district} · {school.sector}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-muted">Ownership</dt>
              <dd><Badge variant="ink">{school.type}</Badge></dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-muted">Boarding</dt>
              <dd className="font-medium text-ink text-right">{school.boardingAvailable ? "Boarding available" : "Day school"}</dd>
            </div>
          </dl>
          <div className="mt-3 space-y-3">
            <Input label="Contact email" value={school.contactEmail} disabled hint="Sourced from NESA — not editable here." />
            <Input label="Contact phone" value={school.contactPhone} disabled hint="Sourced from NESA — not editable here." />
            <Textarea label="Description" value={school.description} disabled hint="Set only at school-creation time — no edit endpoint exists yet." rows={3} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Achievements" description="Add achievements — these appear on your Discover listing." />
          <Can permission={P.SCHOOL_PROFILE_EDIT}>
            <div className="space-y-3 mb-4">
              <Input label="Title" value={achievement.title} onChange={(e) => setAchievement({ ...achievement, title: e.target.value })} placeholder="e.g. Top 10 national exams 2025" />
              <Textarea label="Description (optional)" rows={2} value={achievement.description} onChange={(e) => setAchievement({ ...achievement, description: e.target.value })} />
              <Button size="sm" icon={<Plus className="size-4" />} loading={addAchievement.isPending} disabled={!achievement.title.trim()} onClick={() => addAchievement.mutate()}>
                Add achievement
              </Button>
            </div>
          </Can>
          {school.achievements.length === 0 ? (
            <p className="text-[13px] text-muted">No achievements added yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {school.achievements.map((a, i) => (
                <li key={i} className="rounded-(--radius-ctl) border border-line px-3 py-2 text-[13px] text-ink">{a}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PageTransition>
  );
}
