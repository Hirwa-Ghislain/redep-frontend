import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, MapPin, Plus, Save, Star, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition } from "@/components/motion";
import { Can } from "@/components/auth/guards";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Switch, Textarea } from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useAuth, usePermission } from "@/hooks/useAuth";
import { P } from "@/config/permissions";
import { schoolService } from "@/services/schoolService";
import { toast } from "@/stores/uiStore";
import { formatRWF } from "@/lib/format";
import { LEVEL_LABEL, SCHOOL_TYPE_LABEL } from "@/lib/status";
import type { ApiError } from "@/lib/api/client";

interface ProfileForm {
  description: string;
  motto: string;
  foundedYear: string;
  capacity: string;
  feesMin: string;
  feesMax: string;
  boardingAvailable: boolean;
  contactEmail: string;
  contactPhone: string;
  facilities: string[];
  achievements: string[];
}

/** Chip list with add/remove — used for facilities and achievements. */
function ChipEditor({
  label,
  hint,
  values,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || values.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    onChange([...values, v]);
    setDraft("");
  };
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-ink">{label}</span>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {values.map((v) => (
            <Badge key={v} variant="neutral" className="pr-1">
              {v}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(values.filter((x) => x !== v))}
                  aria-label={`Remove ${v}`}
                  className="p-0.5 rounded-full hover:bg-ink/10 transition-colors"
                >
                  <X className="size-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
      {!disabled && (
        <div className="flex gap-2">
          <Input
            placeholder={placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            className="flex-1"
            aria-label={`Add ${label.toLowerCase()}`}
          />
          <Button type="button" variant="secondary" icon={<Plus className="size-4" />} disabled={!draft.trim()} onClick={add}>
            Add
          </Button>
        </div>
      )}
      {hint && <p className="text-[12.5px] text-muted">{hint}</p>}
    </div>
  );
}

export default function SchoolProfileEditorPage() {
  const { user } = useAuth();
  const { has } = usePermission();
  const qc = useQueryClient();
  const canEdit = has(P.SCHOOL_PROFILE_EDIT);

  const { data: school, isLoading } = useQuery({
    queryKey: ["school", user?.schoolId],
    queryFn: () => schoolService.get(user!.schoolId!),
    enabled: Boolean(user?.schoolId),
  });

  const [form, setForm] = useState<ProfileForm | null>(null);

  useEffect(() => {
    if (school && !form) {
      setForm({
        description: school.description,
        motto: school.motto ?? "",
        foundedYear: String(school.foundedYear),
        capacity: String(school.capacity),
        feesMin: String(school.feesRange.min),
        feesMax: String(school.feesRange.max),
        boardingAvailable: school.boardingAvailable,
        contactEmail: school.contactEmail,
        contactPhone: school.contactPhone,
        facilities: school.facilities,
        achievements: school.achievements,
      });
    }
  }, [school, form]);

  const save = useMutation({
    mutationFn: () =>
      schoolService.updateProfile(user!.schoolId!, {
        description: form!.description.trim(),
        motto: form!.motto.trim() || undefined,
        foundedYear: Number(form!.foundedYear) || school!.foundedYear,
        capacity: Number(form!.capacity) || school!.capacity,
        feesRange: {
          min: Number(form!.feesMin) || 0,
          max: Number(form!.feesMax) || 0,
        },
        boardingAvailable: form!.boardingAvailable,
        contactEmail: form!.contactEmail.trim(),
        contactPhone: form!.contactPhone.trim(),
        facilities: form!.facilities,
        achievements: form!.achievements,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["school"] });
      toast({ title: "Profile updated", description: "Parents see the new listing in Discover immediately.", variant: "success" });
    },
    onError: (e) => toast({ title: "Could not save", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  if (isLoading || !school || !form) {
    return (
      <PageTransition>
        <PageHeader title="Public profile" description="How your school appears to parents in Discover." />
        <div className="grid lg:grid-cols-3 gap-4"><CardSkeleton className="lg:col-span-2" /><CardSkeleton /></div>
      </PageTransition>
    );
  }

  const previewMin = Number(form.feesMin) || 0;
  const previewMax = Number(form.feesMax) || 0;

  return (
    <PageTransition>
      <PageHeader
        title="Public profile"
        description="How your school appears to parents in Discover — changes go live on save."
        actions={
          <Can permission={P.SCHOOL_PROFILE_EDIT}>
            <Button icon={<Save className="size-4" />} loading={save.isPending} onClick={() => save.mutate()}>
              Save changes
            </Button>
          </Can>
        }
      />

      {!canEdit && (
        <FadeIn>
          <div className="mb-4 flex items-center gap-2.5 rounded-(--radius-card) border border-line bg-sky-soft/60 px-4 py-3 text-[13px] text-sky-deep">
            <Eye className="size-4 shrink-0" aria-hidden />
            You have view-only access — ask an administrator for the “Edit public profile” permission to make changes.
          </div>
        </FadeIn>
      )}

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        {/* Editor */}
        <div className="lg:col-span-2 min-w-0 space-y-3.5">
          <Card>
            <CardHeader title="About the school" description="The story parents read first." />
            <div className="space-y-3.5">
              <Textarea
                label="Description"
                rows={5}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                disabled={!canEdit}
                required
              />
              <div className="grid sm:grid-cols-3 gap-3">
                <Input
                  label="Motto"
                  placeholder="Optional"
                  value={form.motto}
                  onChange={(e) => set("motto", e.target.value)}
                  disabled={!canEdit}
                  className="sm:col-span-1"
                />
                <Input
                  label="Founded"
                  type="number"
                  min={1900}
                  max={new Date().getFullYear()}
                  value={form.foundedYear}
                  onChange={(e) => set("foundedYear", e.target.value)}
                  disabled={!canEdit}
                />
                <Input
                  label="Capacity (students)"
                  type="number"
                  min={0}
                  value={form.capacity}
                  onChange={(e) => set("capacity", e.target.value)}
                  disabled={!canEdit}
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Fees & boarding" description="Shown as a per-term range on your discovery card." />
            <div className="space-y-3.5">
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  label="Fees from (RWF / term)"
                  type="number"
                  min={0}
                  value={form.feesMin}
                  onChange={(e) => set("feesMin", e.target.value)}
                  disabled={!canEdit}
                />
                <Input
                  label="Fees to (RWF / term)"
                  type="number"
                  min={0}
                  value={form.feesMax}
                  onChange={(e) => set("feesMax", e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-(--radius-ctl) border border-line px-3.5 py-2.5">
                <div>
                  <p className="text-[13px] font-medium text-ink">Boarding available</p>
                  <p className="text-[12px] text-muted">Parents can filter Discover by boarding schools.</p>
                </div>
                <Switch
                  checked={form.boardingAvailable}
                  onChange={(v) => set("boardingAvailable", v)}
                  label="Boarding available"
                  disabled={!canEdit}
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Contact" description="Where parents reach the school office." />
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label="Contact email"
                type="email"
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
                disabled={!canEdit}
              />
              <Input
                label="Contact phone"
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Facilities & achievements" description="Highlights that set the school apart." />
            <div className="space-y-5">
              <ChipEditor
                label="Facilities"
                placeholder="E.g. Science laboratory"
                values={form.facilities}
                onChange={(v) => set("facilities", v)}
                disabled={!canEdit}
              />
              <ChipEditor
                label="Achievements"
                placeholder="E.g. Top 10 national exams 2025"
                values={form.achievements}
                onChange={(v) => set("achievements", v)}
                disabled={!canEdit}
              />
            </div>
          </Card>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-20">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-faint mb-2 flex items-center gap-1.5">
            <Eye className="size-3.5" aria-hidden /> Public preview
          </p>
          <Card hover>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display font-semibold text-[16px] text-ink">{school.name}</h3>
                <p className="flex items-center gap-1 text-[12.5px] text-muted mt-0.5">
                  <MapPin className="size-3.5" aria-hidden /> {school.district} · {school.sector}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-gold-deep tnum">
                <Star className="size-3.5 fill-current" aria-hidden /> {school.satisfactionScore.toFixed(1)}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <Badge variant="ink">{SCHOOL_TYPE_LABEL[school.type]}</Badge>
              {school.levels.map((l) => (
                <Badge key={l} variant="neutral">{LEVEL_LABEL[l]}</Badge>
              ))}
              {form.boardingAvailable && <Badge variant="info">Boarding</Badge>}
            </div>
            {form.motto.trim() && (
              <p className="text-[13px] italic text-muted mt-3">“{form.motto.trim()}”</p>
            )}
            <p className="text-[13px] text-muted leading-relaxed line-clamp-4 mt-2">
              {form.description.trim() || "No description yet."}
            </p>
            <div className="mt-4 pt-3.5 border-t border-line flex items-center justify-between gap-2">
              <span className="text-[12px] text-muted">Fees per term</span>
              <span className="text-[13px] font-semibold text-ink tnum">
                {formatRWF(previewMin)} – {formatRWF(previewMax)}
              </span>
            </div>
            {form.facilities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {form.facilities.slice(0, 4).map((f) => (
                  <Badge key={f} variant="success">{f}</Badge>
                ))}
                {form.facilities.length > 4 && (
                  <Badge variant="neutral" className="tnum">+{form.facilities.length - 4} more</Badge>
                )}
              </div>
            )}
          </Card>
          <p className="text-[12px] text-faint mt-2">
            Live preview — updates as you type. Founded {form.foundedYear || school.foundedYear}.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
