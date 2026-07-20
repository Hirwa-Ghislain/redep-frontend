import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { academicService } from "@/services/academicService";
import { fullName } from "@/lib/format";
import { LEVEL_LABEL } from "@/lib/status";
import type { SchoolClass, Student } from "@/types";

type ClassWithRoster = SchoolClass & { students: Student[] };

export default function MyClassesPage() {
  const { user } = useAuth();
  const [rosterClass, setRosterClass] = useState<ClassWithRoster | null>(null);

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["teacher-classes", user?.id],
    queryFn: () => academicService.teacherClasses(user!.id),
    enabled: Boolean(user),
  });

  return (
    <PageTransition>
      <PageHeader
        title="My classes"
        description="The classes you teach this year, with their rosters and seat usage."
      />

      {isLoading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : classes.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={GraduationCap}
            title="No classes assigned yet"
            description="Your school admin assigns classes to teachers. Once assigned, they will appear here."
          />
        </Card>
      ) : (
        <Stagger className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {classes.map((c) => {
            const preview = c.students.slice(0, 6);
            const extra = c.students.length - preview.length;
            return (
              <StaggerItem key={c.id}>
                <Card hover padded={false} className="flex h-full flex-col p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display font-bold text-[14px] text-ink truncate">{c.name}</h3>
                    <Badge variant="neutral">{LEVEL_LABEL[c.level]}</Badge>
                  </div>
                  <p className="text-[12px] text-muted mt-0.5">
                    <span className="tnum">{c.students.length}</span> students on the roster
                  </p>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span className="text-muted">Seats filled</span>
                      <span className="text-ink font-medium tnum">
                        {c.enrolled}/{c.capacity}
                      </span>
                    </div>
                    <ProgressBar
                      value={c.capacity ? c.enrolled / c.capacity : 0}
                      capacity
                      label={`${c.name} seats filled`}
                    />
                  </div>

                  <div className="mt-3 flex items-center">
                    <div className="flex -space-x-1.5">
                      {preview.map((s) => (
                        <Avatar
                          key={s.id}
                          name={fullName(s)}
                          size="sm"
                          className="size-6! text-[10px]! ring-2 ring-surface"
                        />
                      ))}
                    </div>
                    {extra > 0 && (
                      <span className="ml-2 text-[12px] text-muted tnum">+{extra} more</span>
                    )}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Users className="size-3.5" />}
                    className="mt-3.5 w-full"
                    onClick={() => setRosterClass(c)}
                  >
                    View roster
                  </Button>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      <Drawer
        open={Boolean(rosterClass)}
        onClose={() => setRosterClass(null)}
        title={rosterClass?.name ?? ""}
        description={
          rosterClass ? `${LEVEL_LABEL[rosterClass.level]} · ${rosterClass.students.length} enrolled students` : undefined
        }
        wide
      >
        {rosterClass && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">Enrolled students</p>
            <DataTable<Student>
            columns={[
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
              {
                key: "gender",
                header: "Gender",
                render: (s) => <Badge variant="neutral">{s.gender === "F" ? "Female" : "Male"}</Badge>,
              },
            ]}
              rows={rosterClass.students}
              keyField={(s) => s.id}
              dense
              empty="No students enrolled in this class yet."
            />
          </div>
        )}
      </Drawer>
    </PageTransition>
  );
}
