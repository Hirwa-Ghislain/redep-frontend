import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, Pencil, Plus, School, UserRound, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { Can } from "@/components/auth/guards";
import { useAuth, usePermission } from "@/hooks/useAuth";
import { academicService } from "@/services/academicService";
import { schoolService } from "@/services/schoolService";
import { toast } from "@/stores/uiStore";
import { formatNumber, percent } from "@/lib/format";
import { LEVEL_LABEL } from "@/lib/status";
import { P } from "@/config/permissions";
import type { ApiError } from "@/lib/api/client";
import type { SchoolClass, SchoolLevel } from "@/types";

interface ClassForm {
  id?: string;
  name: string;
  level: SchoolLevel;
  capacity: string;
}

const EMPTY_FORM: ClassForm = { name: "", level: "PRIMARY", capacity: "40" };

export default function ClassesPage() {
  const { user } = useAuth();
  const { has } = usePermission();
  const qc = useQueryClient();
  const schoolId = user!.schoolId!;

  const [form, setForm] = useState<ClassForm | null>(null);

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn: () => schoolService.classes(schoolId),
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers", schoolId],
    queryFn: () => academicService.teachersBySchool(schoolId),
  });

  const teacherName = (id?: string) => teachers.find((t) => t.id === id)?.name;

  const editing = form?.id ? classes.find((c) => c.id === form.id) : undefined;
  const capacityNum = form ? Number(form.capacity) : 0;
  const capacityError =
    form && form.capacity !== "" && (!Number.isFinite(capacityNum) || capacityNum < 1)
      ? "Capacity must be at least 1."
      : editing && capacityNum < editing.enrolled
        ? `Capacity cannot be below the ${editing.enrolled} students already enrolled.`
        : undefined;

  const save = useMutation({
    mutationFn: () =>
      schoolService.saveClass({
        id: form!.id,
        schoolId,
        name: form!.name.trim(),
        level: form!.level,
        capacity: capacityNum,
        enrolled: editing?.enrolled ?? 0,
        homeroomTeacherId: editing?.homeroomTeacherId,
      }),
    onSuccess: (_cls, _vars) => {
      const created = !form?.id;
      setForm(null);
      void qc.invalidateQueries({ queryKey: ["classes"] });
      toast({ title: created ? "Class created" : "Class updated", variant: "success" });
    },
    onError: (e) =>
      toast({ title: "Could not save class", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const totalCapacity = classes.reduce((s, c) => s + c.capacity, 0);
  const totalEnrolled = classes.reduce((s, c) => s + c.enrolled, 0);
  const avgOccupancy = classes.length
    ? classes.reduce((s, c) => s + (c.capacity ? c.enrolled / c.capacity : 0), 0) / classes.length
    : 0;

  return (
    <PageTransition>
      <PageHeader
        title="Classes"
        description="Class groups, homeroom teachers and seat capacity across the school."
        actions={
          <Can permission={P.CLASSES_MANAGE}>
            <Button icon={<Plus className="size-4" />} onClick={() => setForm({ ...EMPTY_FORM })}>
              Add class
            </Button>
          </Can>
        }
      />

      {/* KPI strip */}
      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StaggerItem>
          <StatCard label="Total classes" value={isLoading ? "…" : String(classes.length)} icon={LayoutGrid} tone="primary" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Total capacity" value={isLoading ? "…" : formatNumber(totalCapacity)} icon={School} tone="sky" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Total enrolled" value={isLoading ? "…" : formatNumber(totalEnrolled)} icon={Users} tone="gold" />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Average occupancy"
            value={isLoading ? "…" : percent(avgOccupancy)}
            icon={UserRound}
            tone={avgOccupancy >= 0.95 ? "clay" : "default"}
          />
        </StaggerItem>
      </Stagger>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : classes.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No classes yet"
          description="Create your first class to start placing admitted students."
          action={
            has(P.CLASSES_MANAGE) ? (
              <Button icon={<Plus className="size-4" />} onClick={() => setForm({ ...EMPTY_FORM })}>
                Add class
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Stagger className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {classes.map((cls: SchoolClass) => {
            const seatsLeft = Math.max(0, cls.capacity - cls.enrolled);
            const homeroom = teacherName(cls.homeroomTeacherId);
            return (
              <StaggerItem key={cls.id}>
                <Card padded={false} className="p-4 h-full">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-display font-bold text-[14px] text-ink truncate">{cls.name}</p>
                      <Badge variant="ink">{LEVEL_LABEL[cls.level]}</Badge>
                    </div>
                    <Can permission={P.CLASSES_MANAGE}>
                      <button
                        aria-label={`Edit ${cls.name}`}
                        onClick={() =>
                          setForm({ id: cls.id, name: cls.name, level: cls.level, capacity: String(cls.capacity) })
                        }
                        className="p-1 -m-1 shrink-0 rounded-md text-muted hover:bg-ink/5 hover:text-ink transition-colors"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </Can>
                  </div>
                  <p className="text-[12px] text-muted mt-1 flex items-center gap-1.5 truncate">
                    <UserRound className="size-3 shrink-0" aria-hidden />
                    {homeroom ?? "No homeroom teacher"}
                  </p>

                  <div className="mt-3">
                    <ProgressBar
                      value={cls.capacity ? cls.enrolled / cls.capacity : 0}
                      capacity
                      label={`${cls.name} occupancy`}
                    />
                    <div className="flex items-baseline justify-between text-[12px] mt-1.5">
                      <span className="text-muted">
                        <span className="font-semibold text-ink tnum">{formatNumber(cls.enrolled)}</span> / {formatNumber(cls.capacity)} enrolled
                      </span>
                      <span className={seatsLeft === 0 ? "font-semibold text-clay-deep tnum" : "font-semibold text-primary-deep tnum"}>
                        {seatsLeft === 0 ? "Full" : `${formatNumber(seatsLeft)} seats left`}
                      </span>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      {/* Create / edit modal */}
      <Modal
        open={Boolean(form)}
        onClose={() => !save.isPending && setForm(null)}
        title={form?.id ? "Edit class" : "Add class"}
        description={form?.id ? "Rename the class or adjust its level and capacity." : "Create a new class group."}
        footer={
          <>
            <Button variant="ghost" onClick={() => setForm(null)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button
              loading={save.isPending}
              disabled={!form || !form.name.trim() || form.capacity === "" || Boolean(capacityError)}
              onClick={() => save.mutate()}
            >
              {form?.id ? "Save changes" : "Create class"}
            </Button>
          </>
        }
      >
        {form && (
          <div className="space-y-3.5">
            <Input
              label="Class name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. P4 B"
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Level"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value as SchoolLevel })}
              >
                {Object.entries(LEVEL_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Input
                label="Capacity"
                type="number"
                min={1}
                required
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                error={capacityError}
              />
            </div>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
