import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, GraduationCap, Layers, Mail, Phone, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Checkbox } from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { useAuth, usePermission } from "@/hooks/useAuth";
import { P } from "@/config/permissions";
import { academicService } from "@/services/academicService";
import { schoolService } from "@/services/schoolService";
import { toast } from "@/stores/uiStore";
import { formatDate } from "@/lib/format";
import { LEVEL_LABEL } from "@/lib/status";
import type { ApiError } from "@/lib/api/client";
import type { TeacherProfile } from "@/types";

export default function TeachersPage() {
  const { user } = useAuth();
  const { has } = usePermission();
  const qc = useQueryClient();
  const canManage = has(P.TEACHERS_MANAGE);

  const [selected, setSelected] = useState<TeacherProfile | null>(null);
  const [draftClassIds, setDraftClassIds] = useState<string[]>([]);

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ["teachers", user?.schoolId],
    queryFn: () => academicService.teachersBySchool(user!.schoolId!),
    enabled: Boolean(user?.schoolId),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes", user?.schoolId],
    queryFn: () => schoolService.classes(user!.schoolId!),
    enabled: Boolean(user?.schoolId),
  });

  const subjectsCovered = useMemo(() => new Set(teachers.flatMap((t) => t.subjects)).size, [teachers]);
  const avgClasses = teachers.length
    ? (teachers.reduce((s, t) => s + t.classIds.length, 0) / teachers.length).toFixed(1)
    : "0";

  const openTeacher = (t: TeacherProfile) => {
    setSelected(t);
    setDraftClassIds(t.classIds);
  };

  const saveAssignments = useMutation({
    mutationFn: () => academicService.updateTeacher(selected!.id, { classIds: draftClassIds }),
    onSuccess: (updated) => {
      setSelected(updated);
      void qc.invalidateQueries({ queryKey: ["teachers"] });
      toast({
        title: "Assignments saved",
        description: `${updated.name} now teaches ${updated.classIds.length} ${updated.classIds.length === 1 ? "class" : "classes"}.`,
        variant: "success",
      });
    },
    onError: (e) => toast({ title: "Could not save", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const dirty =
    selected !== null &&
    [...draftClassIds].sort().join(",") !== [...selected.classIds].sort().join(",");

  const className = (id: string) => classes.find((c) => c.id === id)?.name ?? "—";

  return (
    <PageTransition>
      <PageHeader
        title="Teachers"
        description="The teaching roster — subjects, class assignments and contact details."
      />

      {/* KPI strip */}
      <Stagger className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StaggerItem>
          <StatCard label="Teachers" value={String(teachers.length)} icon={Users} tone="primary" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Subjects covered" value={String(subjectsCovered)} icon={BookOpen} tone="sky" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Avg classes per teacher" value={avgClasses} icon={Layers} tone="gold" />
        </StaggerItem>
      </Stagger>

      {isLoading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3.5 mt-4">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      ) : teachers.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No teachers yet"
          description="Hired teachers appear here once their accounts are linked to the school."
          className="mt-4"
        />
      ) : (
        <Stagger className="grid md:grid-cols-2 xl:grid-cols-3 gap-3.5 mt-4">
          {teachers.map((t) => (
            <StaggerItem key={t.id} className="h-full">
              <Card hover padded={false} className="p-4 cursor-pointer h-full" onClick={() => openTeacher(t)}>
                <div className="flex items-start gap-2.5">
                  <Avatar name={t.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold text-[14px] text-ink truncate">{t.name}</p>
                    <p className="text-[12px] text-muted">Hired {formatDate(t.hiredAt)}</p>
                  </div>
                  <Badge variant="neutral" className="tnum">
                    {t.classIds.length} {t.classIds.length === 1 ? "class" : "classes"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {t.subjects.map((s) => (
                    <Badge key={s} variant="info">{s}</Badge>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-line space-y-1 text-[12px] text-muted">
                  <p className="flex items-center gap-1.5 truncate">
                    <Mail className="size-3.5 shrink-0" aria-hidden /> {t.email}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0" aria-hidden /> <span className="tnum">{t.phone}</span>
                  </p>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {/* Teacher drawer */}
      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        description={selected ? `Hired ${formatDate(selected.hiredAt)}` : undefined}
        footer={
          canManage && selected ? (
            <>
              <Button variant="ghost" onClick={() => setSelected(null)} disabled={saveAssignments.isPending}>
                Close
              </Button>
              <Button loading={saveAssignments.isPending} disabled={!dirty} onClick={() => saveAssignments.mutate()}>
                Save assignments
              </Button>
            </>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="space-y-2 text-[13.5px] text-ink">
              <p className="flex items-center gap-2">
                <Mail className="size-4 text-muted shrink-0" aria-hidden /> {selected.email}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="size-4 text-muted shrink-0" aria-hidden /> <span className="tnum">{selected.phone}</span>
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint mb-2">Subjects</p>
              <div className="flex flex-wrap gap-1.5">
                {selected.subjects.map((s) => (
                  <Badge key={s} variant="info">{s}</Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint mb-2">
                Class assignments
              </p>
              {canManage ? (
                <div className="space-y-2.5">
                  {classes.map((c) => (
                    <Checkbox
                      key={c.id}
                      label={c.name}
                      description={`${LEVEL_LABEL[c.level]} · ${c.enrolled}/${c.capacity} students`}
                      checked={draftClassIds.includes(c.id)}
                      onChange={(e) =>
                        setDraftClassIds((ids) =>
                          e.target.checked ? [...ids, c.id] : ids.filter((id) => id !== c.id),
                        )
                      }
                    />
                  ))}
                  {classes.length === 0 && (
                    <p className="text-[13px] text-muted">No classes configured yet.</p>
                  )}
                </div>
              ) : selected.classIds.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selected.classIds.map((id) => (
                    <Badge key={id} variant="neutral">{className(id)}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-muted">No classes assigned.</p>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </PageTransition>
  );
}
