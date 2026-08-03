import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookPlus, GraduationCap, LayoutGrid, Plus, School, Sliders, UserRound, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { Can } from "@/components/auth/guards";
import { useAuth, usePermission } from "@/hooks/useAuth";
import { schoolService } from "@/services/schoolService";
import { toast } from "@/stores/uiStore";
import { formatNumber, percent } from "@/lib/format";
import { P } from "@/config/permissions";
import type { ApiError } from "@/lib/api/client";
import type { PublicSchoolClass } from "@/types";

export default function ClassesPage() {
  const { user } = useAuth();
  const { has } = usePermission();
  const qc = useQueryClient();
  const schoolId = user!.schoolId!;

  const [createOpen, setCreateOpen] = useState(false);
  const [newClass, setNewClass] = useState({ name: "", capacity: "40" });
  const [manage, setManage] = useState<PublicSchoolClass | null>(null);
  const [teacherId, setTeacherId] = useState("");
  const [criteria, setCriteria] = useState({ minimumEntryGrade: "50", minimumConductGrade: "50" });
  const [course, setCourse] = useState({ name: "", teacherId: "" });

  const { data: school, isLoading } = useQuery({
    queryKey: ["school", schoolId],
    queryFn: () => schoolService.get(schoolId),
  });
  const classes = school?.classes ?? [];

  const { data: teachers = [] } = useQuery({
    queryKey: ["real-teachers", schoolId],
    queryFn: () => schoolService.teachersReal(schoolId),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["school"] });
  };

  const createClass = useMutation({
    mutationFn: () => schoolService.createRealClass(schoolId, { name: newClass.name.trim(), capacity: Number(newClass.capacity) }),
    onSuccess: () => {
      setCreateOpen(false);
      setNewClass({ name: "", capacity: "40" });
      invalidate();
      toast({ title: "Class created", variant: "success" });
    },
    onError: (e) => toast({ title: "Could not create class", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const assignTeacher = useMutation({
    mutationFn: () => schoolService.assignClassTeacher(schoolId, manage!.id, teacherId),
    onSuccess: () => {
      invalidate();
      void qc.invalidateQueries({ queryKey: ["real-teachers"] });
      toast({ title: "Homeroom teacher assigned", variant: "success" });
    },
    onError: (e) => toast({ title: "Could not assign teacher", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const saveCriteria = useMutation({
    mutationFn: () => schoolService.setAdmissionCriteria(schoolId, manage!.id, {
      minimumEntryGrade: Number(criteria.minimumEntryGrade), minimumConductGrade: Number(criteria.minimumConductGrade),
    }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Admission criteria saved", description: "Automatic admission will use these thresholds.", variant: "success" });
    },
    onError: (e) => toast({ title: "Could not save criteria", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const addCourse = useMutation({
    mutationFn: () => schoolService.addCourse(schoolId, manage!.id, { name: course.name.trim(), teacherId: course.teacherId }),
    onSuccess: () => {
      setCourse({ name: "", teacherId: "" });
      toast({ title: "Course added", variant: "success" });
    },
    onError: (e) => toast({ title: "Could not add course", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const totalCapacity = classes.reduce((s, c) => s + c.capacity, 0);
  const totalEnrolled = classes.reduce((s, c) => s + c.currentEnrollment, 0);
  const avgOccupancy = classes.length
    ? classes.reduce((s, c) => s + (c.capacity ? c.currentEnrollment / c.capacity : 0), 0) / classes.length
    : 0;

  const homeroomName = (classId: string) => {
    const t = teachers.find((t) => t.homeroomClasses.some((c) => c.id === classId));
    return t ? `${t.firstName} ${t.lastName}` : undefined;
  };

  const openManage = (cls: PublicSchoolClass) => {
    setManage(cls);
    setTeacherId("");
    setCriteria({
      minimumEntryGrade: cls.minimumEntryGrade !== null ? String(cls.minimumEntryGrade) : "50",
      minimumConductGrade: cls.minimumConductGrade !== null ? String(cls.minimumConductGrade) : "50",
    });
    setCourse({ name: "", teacherId: "" });
  };

  return (
    <PageTransition>
      <PageHeader
        title="Classes"
        description="Class groups, seat capacity, homeroom teachers and admission criteria."
        actions={
          <Can permission={P.CLASSES_MANAGE}>
            <Button icon={<Plus className="size-4" />} onClick={() => setCreateOpen(true)}>Add class</Button>
          </Can>
        }
      />

      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StaggerItem><StatCard label="Total classes" value={isLoading ? "…" : String(classes.length)} icon={LayoutGrid} tone="primary" /></StaggerItem>
        <StaggerItem><StatCard label="Total capacity" value={isLoading ? "…" : formatNumber(totalCapacity)} icon={School} tone="sky" /></StaggerItem>
        <StaggerItem><StatCard label="Total enrolled" value={isLoading ? "…" : formatNumber(totalEnrolled)} icon={Users} tone="gold" /></StaggerItem>
        <StaggerItem><StatCard label="Average occupancy" value={isLoading ? "…" : percent(avgOccupancy)} icon={UserRound} tone={avgOccupancy >= 0.95 ? "clay" : "default"} /></StaggerItem>
      </Stagger>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3.5"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
      ) : classes.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No classes yet"
          description="Create your first class — automatic admissions need at least one class with entry criteria."
          action={has(P.CLASSES_MANAGE) ? <Button icon={<Plus className="size-4" />} onClick={() => setCreateOpen(true)}>Add class</Button> : undefined}
        />
      ) : (
        <Stagger className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {classes.map((cls) => {
            const seatsLeft = cls.availableSpots;
            const homeroom = homeroomName(cls.id);
            return (
              <StaggerItem key={cls.id}>
                <Card padded={false} className="p-4 h-full">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display font-bold text-[14px] text-ink truncate">{cls.name}</p>
                    <Can permission={P.CLASSES_MANAGE}>
                      <button
                        aria-label={`Manage ${cls.name}`}
                        onClick={() => openManage(cls)}
                        className="p-1 -m-1 shrink-0 rounded-md text-muted hover:bg-ink/5 hover:text-ink transition-colors"
                      >
                        <Sliders className="size-3.5" />
                      </button>
                    </Can>
                  </div>
                  <p className="text-[12px] text-muted mt-1 flex items-center gap-1.5 truncate">
                    <UserRound className="size-3 shrink-0" aria-hidden />
                    {homeroom ?? "No homeroom teacher"}
                  </p>
                  {(cls.minimumEntryGrade !== null || cls.minimumConductGrade !== null) && (
                    <p className="text-[11.5px] text-faint mt-1">
                      Entry ≥ {cls.minimumEntryGrade ?? "—"} · Conduct ≥ {cls.minimumConductGrade ?? "—"}
                    </p>
                  )}
                  <div className="mt-3">
                    <ProgressBar value={cls.capacity ? cls.currentEnrollment / cls.capacity : 0} capacity label={`${cls.name} occupancy`} />
                    <div className="flex items-baseline justify-between text-[12px] mt-1.5">
                      <span className="text-muted">
                        <span className="font-semibold text-ink tnum">{formatNumber(cls.currentEnrollment)}</span> / {formatNumber(cls.capacity)} enrolled
                      </span>
                      <span className={seatsLeft === 0 ? "font-semibold text-clay-deep tnum" : "font-semibold text-primary-deep tnum"}>
                        {cls.isFull ? "Full" : `${formatNumber(seatsLeft)} seats left`}
                      </span>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      {/* Create class */}
      <Modal
        open={createOpen}
        onClose={() => !createClass.isPending && setCreateOpen(false)}
        title="Add class"
        description="Only a name and capacity can be set at creation — homeroom teacher, courses and admission criteria are managed afterwards."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={createClass.isPending}>Cancel</Button>
            <Button loading={createClass.isPending} disabled={!newClass.name.trim() || !Number(newClass.capacity)} onClick={() => createClass.mutate()}>
              Create class
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Input label="Class name" required value={newClass.name} onChange={(e) => setNewClass({ ...newClass, name: e.target.value })} placeholder="e.g. P4 B" />
          <Input label="Capacity" type="number" min={1} required value={newClass.capacity} onChange={(e) => setNewClass({ ...newClass, capacity: e.target.value })} />
        </div>
      </Modal>

      {/* Manage class */}
      <Drawer
        open={Boolean(manage)}
        onClose={() => setManage(null)}
        title={manage?.name ?? ""}
        description="Assign a homeroom teacher, set automatic-admission criteria, and add courses."
      >
        {manage && (
          <div className="space-y-6">
            <section className="space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Homeroom teacher</p>
              <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                <option value="">Select a teacher…</option>
                {teachers.map((t) => (
                  <option key={t.userId} value={t.userId}>{t.firstName} {t.lastName}</option>
                ))}
              </Select>
              <Button size="sm" icon={<UserRound className="size-3.5" />} loading={assignTeacher.isPending} disabled={!teacherId} onClick={() => assignTeacher.mutate()}>
                Assign teacher
              </Button>
            </section>

            <section className="space-y-2.5 border-t border-line pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                Automatic-admission criteria
              </p>
              <p className="text-[12px] text-muted">
                Applications with an OCR-extracted grade/conduct below these thresholds are not auto-validated.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Minimum entry grade" type="number" min={0} max={100} value={criteria.minimumEntryGrade} onChange={(e) => setCriteria({ ...criteria, minimumEntryGrade: e.target.value })} />
                <Input label="Minimum conduct grade" type="number" min={0} max={100} value={criteria.minimumConductGrade} onChange={(e) => setCriteria({ ...criteria, minimumConductGrade: e.target.value })} />
              </div>
              <Button size="sm" icon={<GraduationCap className="size-3.5" />} loading={saveCriteria.isPending} onClick={() => saveCriteria.mutate()}>
                Save criteria
              </Button>
            </section>

            <section className="space-y-2.5 border-t border-line pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Add a course</p>
              <Input label="Course name" value={course.name} onChange={(e) => setCourse({ ...course, name: e.target.value })} placeholder="e.g. Mathematics" />
              <Select label="Teacher" value={course.teacherId} onChange={(e) => setCourse({ ...course, teacherId: e.target.value })}>
                <option value="">Select a teacher…</option>
                {teachers.map((t) => (
                  <option key={t.userId} value={t.userId}>{t.firstName} {t.lastName}</option>
                ))}
              </Select>
              <Button size="sm" icon={<BookPlus className="size-3.5" />} loading={addCourse.isPending} disabled={!course.name.trim() || !course.teacherId} onClick={() => addCourse.mutate()}>
                Add course
              </Button>
            </section>
          </div>
        )}
      </Drawer>
    </PageTransition>
  );
}
