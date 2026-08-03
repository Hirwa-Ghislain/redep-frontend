import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, GraduationCap, Layers, Mail, Phone, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { schoolService, type RealSchoolTeacher } from "@/services/schoolService";

export default function TeachersPage() {
  const { user } = useAuth();
  const schoolId = user!.schoolId!;
  const [selected, setSelected] = useState<RealSchoolTeacher | null>(null);

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ["real-teachers", schoolId],
    queryFn: () => schoolService.teachersReal(schoolId),
  });

  const coursesCovered = useMemo(() => new Set(teachers.flatMap((t) => t.courses.map((c) => c.name))).size, [teachers]);
  const avgClasses = teachers.length
    ? (teachers.reduce((s, t) => s + t.homeroomClasses.length + t.courses.length, 0) / teachers.length).toFixed(1)
    : "0";

  return (
    <PageTransition>
      <PageHeader title="Teachers" description="The teaching roster — homeroom classes, courses and contact details." />

      <Stagger className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StaggerItem><StatCard label="Teachers" value={String(teachers.length)} icon={Users} tone="primary" /></StaggerItem>
        <StaggerItem><StatCard label="Courses covered" value={String(coursesCovered)} icon={BookOpen} tone="sky" /></StaggerItem>
        <StaggerItem><StatCard label="Avg assignments per teacher" value={avgClasses} icon={Layers} tone="gold" /></StaggerItem>
      </Stagger>

      {isLoading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3.5 mt-4"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
      ) : teachers.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No teachers yet"
          description="Invite teachers from Staff & roles — they appear here once they accept."
          className="mt-4"
        />
      ) : (
        <Stagger className="grid md:grid-cols-2 xl:grid-cols-3 gap-3.5 mt-4">
          {teachers.map((t) => (
            <StaggerItem key={t.userId} className="h-full">
              <Card hover padded={false} className="p-4 cursor-pointer h-full" onClick={() => setSelected(t)}>
                <div className="flex items-start gap-2.5">
                  <Avatar name={`${t.firstName} ${t.lastName}`} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold text-[14px] text-ink truncate">{t.firstName} {t.lastName}</p>
                    <p className="text-[12px] text-muted">{t.homeroomClasses.length} homeroom · {t.courses.length} course{t.courses.length === 1 ? "" : "s"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {t.courses.map((c) => <Badge key={c.id} variant="info">{c.name}</Badge>)}
                </div>
                <div className="mt-3 pt-3 border-t border-line space-y-1 text-[12px] text-muted">
                  <p className="flex items-center gap-1.5 truncate"><Mail className="size-3.5 shrink-0" aria-hidden /> {t.email}</p>
                  <p className="flex items-center gap-1.5"><Phone className="size-3.5 shrink-0" aria-hidden /> <span className="tnum">{t.phone ?? "—"}</span></p>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `${selected.firstName} ${selected.lastName}` : ""}>
        {selected && (
          <div className="space-y-5">
            <div className="space-y-2 text-[13.5px] text-ink">
              <p className="flex items-center gap-2"><Mail className="size-4 text-muted shrink-0" aria-hidden /> {selected.email}</p>
              <p className="flex items-center gap-2"><Phone className="size-4 text-muted shrink-0" aria-hidden /> <span className="tnum">{selected.phone ?? "—"}</span></p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint mb-2">Homeroom classes</p>
              {selected.homeroomClasses.length === 0 ? (
                <p className="text-[13px] text-muted">Not a homeroom teacher.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">{selected.homeroomClasses.map((c) => <Badge key={c.id} variant="neutral">{c.name}</Badge>)}</div>
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint mb-2">Courses</p>
              {selected.courses.length === 0 ? (
                <p className="text-[13px] text-muted">No courses assigned yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">{selected.courses.map((c) => <Badge key={c.id} variant="info">{c.name}</Badge>)}</div>
              )}
            </div>
            <p className="text-[12px] text-muted">
              Assign homeroom classes and courses from the Classes page.
            </p>
          </div>
        )}
      </Drawer>
    </PageTransition>
  );
}
