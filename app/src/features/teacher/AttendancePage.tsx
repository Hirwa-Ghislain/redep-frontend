import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, CheckCheck, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition } from "@/components/motion";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { academicService } from "@/services/academicService";
import { toast } from "@/stores/uiStore";
import { formatDate, fullName } from "@/lib/format";
import { ATTENDANCE_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/lib/api/client";
import type { AttendanceStatus } from "@/types";

const STATUSES: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

/** Selected-state styles per Badge variant used by ATTENDANCE_STATUS (mirrors Badge soft tints). */
const ACTIVE_SEGMENT: Record<string, string> = {
  success: "bg-primary-soft text-primary-deep",
  danger: "bg-clay-soft text-clay-deep",
  warning: "bg-gold-soft text-gold-deep",
  info: "bg-sky-soft text-sky-deep",
  neutral: "bg-ink/6 text-muted",
};

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = localToday();

  const [selectedClassId, setSelectedClassId] = useState("");
  const [date, setDate] = useState(today);
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});
  const [dirty, setDirty] = useState(false);

  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ["teacher-classes", user?.id],
    queryFn: () => academicService.teacherClasses(user!.id),
    enabled: Boolean(user),
  });

  const classId = selectedClassId || classes[0]?.id || "";
  const selectedClass = classes.find((c) => c.id === classId);
  const roster = useMemo(() => selectedClass?.students ?? [], [selectedClass]);

  const { data: records, isLoading: loadingRecords } = useQuery({
    queryKey: ["attendance", classId, date],
    queryFn: () => academicService.attendance(classId, date),
    enabled: Boolean(classId && date),
  });

  // Initialize the register from existing records (default PRESENT) whenever class/date data lands.
  useEffect(() => {
    if (!records) return;
    const next: Record<string, AttendanceStatus> = {};
    for (const s of roster) {
      const existing = records.find((r) => r.studentId === s.id);
      next[s.id] = existing?.status ?? "PRESENT";
    }
    setDraft(next);
    setDirty(false);
  }, [records, roster]);

  const save = useMutation({
    mutationFn: () =>
      academicService.markAttendance({
        classId,
        date,
        markedBy: user!.id,
        entries: roster.map((s) => ({ studentId: s.id, status: draft[s.id] ?? "PRESENT" })),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["attendance"] });
      setDirty(false);
      toast({
        title: "Attendance saved",
        description: `${selectedClass?.name ?? "Class"} register for ${formatDate(date)} recorded.`,
        variant: "success",
      });
    },
    onError: (e) =>
      toast({ title: "Could not save attendance", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setDraft((prev) => ({ ...prev, [studentId]: status }));
    setDirty(true);
  };

  const markAllPresent = () => {
    setDraft(Object.fromEntries(roster.map((s) => [s.id, "PRESENT" as AttendanceStatus])));
    setDirty(true);
  };

  const counts = STATUSES.map((status) => ({
    status,
    meta: ATTENDANCE_STATUS[status],
    n: roster.filter((s) => (draft[s.id] ?? "PRESENT") === status).length,
  }));

  const marked = roster.filter((s) => draft[s.id] !== undefined).length;
  const alreadyRecorded = Boolean(records && records.length > 0);
  const recordedByMe = alreadyRecorded && records!.every((r) => r.markedBy === user?.id);
  const loading = loadingClasses || loadingRecords;

  return (
    <PageTransition>
      <PageHeader
        title="Attendance"
        description="Take the daily register for your classes — every student defaults to present."
      />

      {/* Controls */}
      <Card padded={false} className="mb-4 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            aria-label="Class"
            value={classId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            disabled={loadingClasses || classes.length === 0}
            className="w-44 [&_select]:h-8 [&_select]:text-[13px]"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.students.length} students
              </option>
            ))}
          </Select>
          <Input
            aria-label="Date"
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="w-38 [&_input]:h-8 [&_input]:text-[13px]"
          />
          <Button
            variant="secondary"
            size="sm"
            icon={<ListChecks className="size-3.5" />}
            onClick={markAllPresent}
            disabled={roster.length === 0 || loading}
          >
            Mark all present
          </Button>
          <div className="flex-1" />
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {counts.map(({ status, meta, n }) => (
              <Badge key={status} variant={meta.variant} dot>
                <span className="tnum">{n}</span>&nbsp;{meta.label.toLowerCase()}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {/* Register */}
      {loading ? (
        <Card className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </Card>
      ) : !selectedClass ? (
        <Card padded={false}>
          <EmptyState
            icon={CalendarCheck}
            title="No classes to register"
            description="Once the school assigns you classes, you can take attendance here."
          />
        </Card>
      ) : roster.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={CalendarCheck}
            title="No students enrolled"
            description={`${selectedClass.name} has no enrolled students yet.`}
          />
        </Card>
      ) : (
        <Card padded={false}>
          <CardHeader
            className="px-5 pt-5"
            title={`Register — ${selectedClass.name}`}
            description={`${formatDate(date)} · ${roster.length} students`}
          />
          <div className="divide-y divide-line">
            {roster.map((s) => {
              const current = draft[s.id] ?? "PRESENT";
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-2">
                  <Avatar name={fullName(s)} size="sm" />
                  <p className="min-w-0 flex-1 text-[13px] font-medium text-ink truncate">{fullName(s)}</p>
                  <div
                    role="group"
                    aria-label={`Attendance status for ${fullName(s)}`}
                    className="inline-flex items-center gap-0.5 rounded-(--radius-ctl) border border-line bg-paper/60 p-0.5"
                  >
                    {STATUSES.map((status) => {
                      const meta = ATTENDANCE_STATUS[status];
                      const selected = current === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setStatus(s.id, status)}
                          className={cn(
                            "h-7 rounded-lg px-2 text-[11.5px] font-semibold transition-colors",
                            selected ? ACTIVE_SEGMENT[meta.variant] : "text-muted hover:bg-ink/5 hover:text-ink",
                          )}
                        >
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky save bar */}
          <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-b-(--radius-card) border-t border-line bg-surface px-5 py-3">
            <div className="flex flex-wrap items-center gap-3 text-[13px] text-muted">
              <span>
                <span className="tnum font-semibold text-ink">{marked}</span> of{" "}
                <span className="tnum">{roster.length}</span> marked
              </span>
              {alreadyRecorded && !dirty && !save.isPending && (
                <FadeIn className="inline-flex">
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] text-primary-deep">
                    <CheckCheck className="size-3.5" aria-hidden />
                    Saved ✓ — {recordedByMe ? "recorded by you" : "already recorded"}
                  </span>
                </FadeIn>
              )}
            </div>
            <Button
              size="sm"
              icon={<CalendarCheck className="size-3.5" />}
              loading={save.isPending}
              disabled={roster.length === 0 || loading}
              onClick={() => save.mutate()}
            >
              Save register
            </Button>
          </div>
        </Card>
      )}
    </PageTransition>
  );
}
