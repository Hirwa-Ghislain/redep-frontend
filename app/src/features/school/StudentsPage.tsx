import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { Tabs } from "@/components/ui/Tabs";
import { Can } from "@/components/auth/guards";
import { useAuth } from "@/hooks/useAuth";
import { schoolService } from "@/services/schoolService";
import { studentService, type StudentWithContext } from "@/services/studentService";
import { toast } from "@/stores/uiStore";
import { formatDate, fullName } from "@/lib/format";
import { STUDENT_STATUS } from "@/lib/status";
import { P } from "@/config/permissions";
import type { ApiError } from "@/lib/api/client";
import type { Column } from "@/components/ui/DataTable";

type TabValue = "enrolled" | "former";

export default function StudentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const schoolId = user!.schoolId!;

  const [tab, setTab] = useState<TabValue>("enrolled");
  const [q, setQ] = useState("");
  const [classId, setClassId] = useState("");
  const [selected, setSelected] = useState<StudentWithContext | null>(null);
  const [moveClassId, setMoveClassId] = useState("");

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students", schoolId, classId, q],
    queryFn: () => studentService.listBySchool(schoolId, { classId: classId || undefined, q: q || undefined }),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn: () => schoolService.classes(schoolId),
  });

  const enrolled = useMemo(() => students.filter((s) => s.status === "ENROLLED"), [students]);
  const former = useMemo(() => students.filter((s) => s.status !== "ENROLLED"), [students]);
  const rows = tab === "enrolled" ? enrolled : former;

  const move = useMutation({
    mutationFn: () => studentService.update(selected!.id, { classId: moveClassId }),
    onSuccess: () => {
      setSelected(null);
      void qc.invalidateQueries({ queryKey: ["students"] });
      void qc.invalidateQueries({ queryKey: ["classes"] });
      toast({ title: "Class updated", description: "The student was moved to the new class.", variant: "success" });
    },
    onError: (e) =>
      toast({ title: "Could not move student", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const baseColumns: Column<StudentWithContext>[] = [
    {
      key: "name",
      header: "Student",
      render: (s) => (
        <span className="flex items-center gap-2.5">
          <Avatar name={fullName(s)} size="sm" />
          <span className="font-medium text-ink">{fullName(s)}</span>
        </span>
      ),
    },
    { key: "className", header: "Class", render: (s) => s.className },
    { key: "gender", header: "Gender", render: (s) => (s.gender === "F" ? "Female" : "Male") },
    {
      key: "admissionDate",
      header: "Admitted",
      render: (s) => <span className="tnum">{formatDate(s.admissionDate)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (s) => {
        const meta = STUDENT_STATUS[s.status];
        return <Badge variant={meta.variant} dot>{meta.label}</Badge>;
      },
    },
  ];

  const columns: Column<StudentWithContext>[] =
    tab === "former"
      ? [
          ...baseColumns,
          {
            key: "leftAt",
            header: "Left",
            render: (s) => <span className="tnum">{s.leftAt ? formatDate(s.leftAt) : "—"}</span>,
          },
        ]
      : baseColumns;

  return (
    <PageTransition>
      <PageHeader title="Students" description="Directory of every enrolled, former and transferred student." />

      <Tabs
        className="mb-4"
        items={[
          { value: "enrolled", label: "Enrolled", count: enrolled.length },
          { value: "former", label: "Former & transferred", count: former.length },
        ]}
        value={tab}
        onChange={(v) => setTab(v as TabValue)}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="Search students…" className="w-full sm:w-60" />
        <Select
          aria-label="Filter by class"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="w-40"
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {!isLoading && rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q || classId ? "No students match your filters" : tab === "enrolled" ? "No enrolled students" : "No former students"}
          description={
            q || classId
              ? "Try a different name or clear the class filter."
              : tab === "enrolled"
                ? "Students appear here once admissions are approved."
                : "Students who transfer out or leave will be listed here."
          }
        />
      ) : (
        <DataTable<StudentWithContext>
          loading={isLoading}
          columns={columns}
          rows={rows}
          keyField={(s) => s.id}
          onRowClick={(s) => {
            setSelected(s);
            setMoveClassId(s.classId);
          }}
          pageSize={12}
          empty="No students found."
        />
      )}

      <Drawer
        open={Boolean(selected)}
        onClose={() => !move.isPending && setSelected(null)}
        title={selected ? fullName(selected) : ""}
        description={selected ? `${selected.className} · ${selected.schoolName}` : undefined}
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar name={fullName(selected)} size="lg" />
              <div>
                <p className="font-display font-semibold text-[16px] text-ink">{fullName(selected)}</p>
                <Badge variant={STUDENT_STATUS[selected.status].variant} dot>
                  {STUDENT_STATUS[selected.status].label}
                </Badge>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px]">
              <div>
                <dt className="text-[11.5px] text-faint">Class</dt>
                <dd className="font-medium text-ink">{selected.className}</dd>
              </div>
              <div>
                <dt className="text-[11.5px] text-faint">Gender</dt>
                <dd className="font-medium text-ink">{selected.gender === "F" ? "Female" : "Male"}</dd>
              </div>
              <div>
                <dt className="text-[11.5px] text-faint">Date of birth</dt>
                <dd className="font-medium text-ink tnum">{formatDate(selected.dateOfBirth)}</dd>
              </div>
              <div>
                <dt className="text-[11.5px] text-faint">Admitted</dt>
                <dd className="font-medium text-ink tnum">{formatDate(selected.admissionDate)}</dd>
              </div>
              {selected.leftAt && (
                <div>
                  <dt className="text-[11.5px] text-faint">Left</dt>
                  <dd className="font-medium text-ink tnum">{formatDate(selected.leftAt)}</dd>
                </div>
              )}
            </dl>

            {selected.status === "ENROLLED" && (
              <Can permission={P.STUDENTS_MANAGE}>
                <div className="rounded-(--radius-card) border border-line bg-paper/50 p-4 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-faint flex items-center gap-1.5">
                    <GraduationCap className="size-3.5" aria-hidden /> Move to class
                  </p>
                  <Select
                    label="Class"
                    value={moveClassId}
                    onChange={(e) => setMoveClassId(e.target.value)}
                  >
                    {classes.map((c) => {
                      const left = c.capacity - c.enrolled;
                      return (
                        <option key={c.id} value={c.id} disabled={c.id !== selected.classId && left <= 0}>
                          {c.name} — {c.id === selected.classId ? "current" : left <= 0 ? "full" : `${left} seats left`}
                        </option>
                      );
                    })}
                  </Select>
                  <Button
                    size="sm"
                    loading={move.isPending}
                    disabled={!moveClassId || moveClassId === selected.classId}
                    onClick={() => move.mutate()}
                  >
                    Save change
                  </Button>
                </div>
              </Can>
            )}
          </div>
        )}
      </Drawer>
    </PageTransition>
  );
}
