import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { Tabs } from "@/components/ui/Tabs";
import { useAuth } from "@/hooks/useAuth";
import { schoolService } from "@/services/schoolService";
import { studentService, type RealStudentRow } from "@/services/studentService";
import { formatDate } from "@/lib/format";

const STATUS_META: Record<RealStudentRow["status"], { label: string; variant: "success" | "warning" | "neutral" }> = {
  ACTIVE: { label: "Active", variant: "success" },
  RESIGNATION_PENDING: { label: "Resignation pending", variant: "warning" },
  RESIGNED: { label: "Resigned", variant: "neutral" },
};

type TabValue = "ACTIVE" | "OTHER";

export default function StudentsPage() {
  const { user } = useAuth();
  const schoolId = user!.schoolId!;

  const [tab, setTab] = useState<TabValue>("ACTIVE");
  const [q, setQ] = useState("");
  const [classId, setClassId] = useState("");
  const [selected, setSelected] = useState<RealStudentRow | null>(null);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["real-students", schoolId, classId, q],
    queryFn: () => studentService.listRealBySchool(schoolId, { classId: classId || undefined, q: q || undefined }),
  });

  const { data: school } = useQuery({
    queryKey: ["school", schoolId],
    queryFn: () => schoolService.get(schoolId),
  });
  const classes = school?.classes ?? [];

  const active = useMemo(() => students.filter((s) => s.status === "ACTIVE"), [students]);
  const other = useMemo(() => students.filter((s) => s.status !== "ACTIVE"), [students]);
  const rows = tab === "ACTIVE" ? active : other;

  const columns: Column<RealStudentRow>[] = [
    {
      key: "name",
      header: "Student",
      render: (s) => (
        <span className="flex items-center gap-2.5">
          <Avatar name={`${s.firstName} ${s.lastName}`} size="sm" />
          <span className="font-medium text-ink">{s.firstName} {s.lastName}</span>
        </span>
      ),
    },
    { key: "className", header: "Class", render: (s) => s.className },
    {
      key: "dateOfBirth",
      header: "Date of birth",
      render: (s) => <span className="tnum">{formatDate(s.dateOfBirth)}</span>,
    },
    {
      key: "enrolledAt",
      header: "Enrolled",
      render: (s) => <span className="tnum">{formatDate(s.enrolledAt)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (s) => {
        const meta = STATUS_META[s.status];
        return <Badge variant={meta.variant} dot>{meta.label}</Badge>;
      },
    },
  ];

  return (
    <PageTransition>
      <PageHeader title="Students" description="Directory of every enrolled and formerly enrolled student." />

      <Tabs
        className="mb-4"
        items={[
          { value: "ACTIVE", label: "Active", count: active.length },
          { value: "OTHER", label: "Resigning / resigned", count: other.length },
        ]}
        value={tab}
        onChange={(v) => setTab(v as TabValue)}
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="Search students…" className="w-full sm:w-60" />
        <Select aria-label="Filter by class" value={classId} onChange={(e) => setClassId(e.target.value)} className="w-40">
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </div>

      {!isLoading && rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q || classId ? "No students match your filters" : "No students"}
          description={
            q || classId
              ? "Try a different name or clear the class filter."
              : "Students appear here once admissions are automatically completed."
          }
        />
      ) : (
        <DataTable<RealStudentRow>
          loading={isLoading}
          columns={columns}
          rows={rows}
          keyField={(s) => s.enrollmentId}
          onRowClick={setSelected}
          pageSize={12}
          empty="No students found."
        />
      )}

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.firstName} ${selected.lastName}` : ""}
        description={selected ? selected.className : undefined}
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar name={`${selected.firstName} ${selected.lastName}`} size="lg" />
              <div>
                <p className="font-display font-semibold text-[16px] text-ink">{selected.firstName} {selected.lastName}</p>
                <Badge variant={STATUS_META[selected.status].variant} dot>{STATUS_META[selected.status].label}</Badge>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px]">
              <div>
                <dt className="text-[11.5px] text-faint">Class</dt>
                <dd className="font-medium text-ink">{selected.className}</dd>
              </div>
              <div>
                <dt className="text-[11.5px] text-faint">Date of birth</dt>
                <dd className="font-medium text-ink tnum">{formatDate(selected.dateOfBirth)}</dd>
              </div>
              <div>
                <dt className="text-[11.5px] text-faint">Enrolled</dt>
                <dd className="font-medium text-ink tnum">{formatDate(selected.enrolledAt)}</dd>
              </div>
            </dl>
            <p className="text-[12.5px] text-muted">
              Moving a student between classes and editing enrollment records isn't available yet — the backend has
              no endpoint for it.
            </p>
          </div>
        )}
      </Drawer>
    </PageTransition>
  );
}
