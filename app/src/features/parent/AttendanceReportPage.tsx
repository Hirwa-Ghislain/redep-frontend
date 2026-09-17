import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Clock3 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatDateTime, fullName, percent } from "@/lib/format";
import { ATTENDANCE_STATUS } from "@/lib/status";
import { fetchParentAttendance, studentService, type ParentAttendanceSummary } from "@/services/studentService";

type AttendanceRecord = ParentAttendanceSummary["records"][number];

export default function AttendanceReportPage() {
  const { user } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [courseId, setCourseId] = useState("ALL");

  const { data: children = [], isLoading: loadingChildren } = useQuery({
    queryKey: ["children", user?.id],
    queryFn: () => studentService.listByParent(user!.id),
    enabled: Boolean(user)
  });
  const studentId = selectedStudentId || children[0]?.id || "";
  const selectedChild = children.find((child) => child.id === studentId);
  const { data: report, isLoading: loadingReport } = useQuery({
    queryKey: ["student-attendance", studentId],
    queryFn: () => fetchParentAttendance(studentId),
    enabled: Boolean(studentId)
  });

  const records = useMemo(
    () => (report?.records ?? []).filter((record) => courseId === "ALL" || record.courseId === courseId),
    [courseId, report]
  );
  const loading = loadingChildren || loadingReport;

  return (
    <PageTransition>
      <PageHeader title="Attendance reports" description="Check each child's attendance at any time, by course and exact recording time." />

      {loadingChildren ? <CardSkeleton /> : children.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="No linked children" description="Attendance appears after a child is admitted and linked to your account." />
      ) : (
        <>
          <Card className="mb-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Select label="Child" value={studentId} onChange={(event) => { setSelectedStudentId(event.target.value); setCourseId("ALL"); }}>
                {children.map((child) => <option key={child.id} value={child.id}>{fullName(child)} · {child.className}</option>)}
              </Select>
              <Select label="Course" value={courseId} onChange={(event) => setCourseId(event.target.value)}>
                <option value="ALL">All courses</option>
                {(report?.byCourse ?? []).map((course) => <option key={course.courseId} value={course.courseId}>{course.courseName}</option>)}
              </Select>
            </div>
          </Card>

          {loading ? <div className="grid gap-3 md:grid-cols-3"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div> : report && selectedChild ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5 mb-4">
                <Metric label="Attendance rate" value={percent(report.attendanceRate)} emphasis />
                <Metric label="Present" value={String(report.totals.PRESENT)} />
                <Metric label="Absent" value={String(report.totals.ABSENT)} />
                <Metric label="Late" value={String(report.totals.LATE)} />
                <Metric label="Excused" value={String(report.totals.EXCUSED)} />
              </div>

              <div className="grid gap-4 xl:grid-cols-[360px_1fr] items-start">
                <Card>
                  <CardHeader title="By course" description={`Live summary for ${fullName(selectedChild)}.`} />
                  <div className="space-y-3">
                    {report.byCourse.map((course) => (
                      <button key={course.courseId} type="button" onClick={() => setCourseId(course.courseId)} className="w-full rounded-xl border border-line p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary-soft/40">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[13px] font-semibold text-ink">{course.courseName}</span>
                          <span className="font-display text-[14px] font-bold text-primary-deep">{percent(course.attendanceRate)}</span>
                        </div>
                        <p className="mt-1 text-[11.5px] text-muted">{course.present} present · {course.absent} absent · {course.late} late · {course.totalLessons} lessons</p>
                      </button>
                    ))}
                    {report.byCourse.length === 0 && <p className="py-5 text-center text-[13px] text-muted">No course attendance has been recorded yet.</p>}
                  </div>
                </Card>

                <div>
                  <h2 className="mb-3 font-display text-[16px] font-semibold text-ink">Attendance history</h2>
                  <DataTable
                    rows={records}
                    keyField={(record) => record.id}
                    pageSize={12}
                    empty="No attendance records match this course."
                    columns={[
                      { key: "date", header: "Lesson date", render: (record: AttendanceRecord) => formatDate(record.date) },
                      { key: "courseName", header: "Course" },
                      { key: "status", header: "Status", render: (record: AttendanceRecord) => { const meta = ATTENDANCE_STATUS[record.status]; return <Badge variant={meta.variant}>{meta.label}</Badge>; } },
                      { key: "recordedAt", header: "Recorded", render: (record: AttendanceRecord) => <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Clock3 className="size-3.5 text-faint" />{formatDateTime(record.recordedAt)}</span> },
                      { key: "recordedBy", header: "Teacher" },
                      { key: "note", header: "Note", render: (record: AttendanceRecord) => record.note || "—" }
                    ]}
                  />
                </div>
              </div>
            </>
          ) : null}
        </>
      )}
    </PageTransition>
  );
}

function Metric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <Card className={emphasis ? "border-primary/30 bg-primary-soft/35" : undefined}><p className="text-[11px] font-semibold uppercase tracking-wide text-faint">{label}</p><p className={`mt-1 font-display text-[22px] font-bold ${emphasis ? "text-primary-deep" : "text-ink"}`}>{value}</p></Card>;
}
