import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpenCheck,
  CalendarCheck,
  GraduationCap,
  Megaphone,
  MessageSquare,
  Users,
} from "lucide-react";
import { HeroBanner } from "@/components/layout/HeroBanner";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { academicService } from "@/services/academicService";
import { commsService } from "@/services/commsService";
import { formatDate } from "@/lib/format";
import { LEVEL_LABEL } from "@/lib/status";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: teacher } = useQuery({
    queryKey: ["teacher", user?.id],
    queryFn: () => academicService.teacher(user!.id),
    enabled: Boolean(user),
  });

  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ["teacher-classes", user?.id],
    queryFn: () => academicService.teacherClasses(user!.id),
    enabled: Boolean(user),
  });

  const { data: threads = [] } = useQuery({
    queryKey: ["threads", user?.id],
    queryFn: () => commsService.threadsFor(user!.id),
    enabled: Boolean(user),
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements-feed", "TEACHER", user?.schoolId],
    queryFn: () => commsService.announcementsFor({ schoolIds: [user!.schoolId!], audience: "TEACHER" }),
    enabled: Boolean(user?.schoolId),
  });

  const totalStudents = classes.reduce((sum, c) => sum + c.students.length, 0);
  const unread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  return (
    <PageTransition>
      <HeroBanner
        title={`Muraho, ${user?.firstName ?? "teacher"}`}
        subtitle={teacher ? teacher.subjects.join(" · ") : undefined}
        stats={[
          { label: "Classes", value: loadingClasses ? "…" : String(classes.length) },
          { label: "Students", value: loadingClasses ? "…" : String(totalStudents) },
          { label: "Unread", value: String(unread) },
        ]}
        actions={
          <Button
            variant="gold"
            icon={<CalendarCheck className="size-4" />}
            onClick={() => navigate("/teacher/attendance")}
          >
            Take attendance
          </Button>
        }
      />

      {/* KPI row */}
      <Stagger className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StaggerItem>
          <StatCard
            label="My classes"
            value={loadingClasses ? "…" : String(classes.length)}
            icon={GraduationCap}
            tone="primary"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="My students" value={loadingClasses ? "…" : String(totalStudents)} icon={Users} tone="sky" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Unread messages" value={String(unread)} icon={MessageSquare} tone={unread ? "clay" : "default"} />
        </StaggerItem>
      </Stagger>

      <div className="grid lg:grid-cols-3 gap-4 mt-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          {/* My classes */}
          <Card padded={false}>
            <CardHeader
              className="px-5 pt-4"
              title="My classes"
              description="Jump straight to the register or gradebook."
              action={
                <Link to="/teacher/classes" className="text-[12.5px] font-medium text-primary-deep hover:underline">
                  View all
                </Link>
              }
            />
            {loadingClasses ? (
              <div className="px-5 pb-5">
                <CardSkeleton />
              </div>
            ) : classes.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No classes assigned"
                description="Once the school assigns you classes, they will appear here."
              />
            ) : (
              <div className="divide-y divide-line">
                {classes.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-ink">{c.name}</p>
                      <p className="text-[12px] text-muted">
                        <span className="tnum">{c.students.length}</span> students on the roster
                      </p>
                    </div>
                    <Badge variant="neutral">{c.level ? LEVEL_LABEL[c.level] : c.name}</Badge>
                    <div className="flex items-center gap-3">
                      <Link
                        to="/teacher/attendance"
                        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary-deep hover:underline"
                      >
                        <CalendarCheck className="size-3.5" aria-hidden />
                        Attendance
                      </Link>
                      <Link
                        to="/teacher/assessments"
                        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary-deep hover:underline"
                      >
                        <BookOpenCheck className="size-3.5" aria-hidden />
                        Assessments
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Staff notices */}
        <Card padded={false}>
          <CardHeader
            className="px-5 pt-4"
            title="Latest staff notices"
            action={
              <Link to="/teacher/announcements" className="text-[12.5px] font-medium text-primary-deep hover:underline">
                All
              </Link>
            }
          />
          <div className="divide-y divide-line">
            {announcements.slice(0, 3).map((a) => (
              <div key={a.id} className="px-5 py-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <Megaphone className="size-3.5 text-gold-deep shrink-0" aria-hidden />
                  <span className="text-[11px] text-faint tnum">{formatDate(a.publishedAt)}</span>
                </div>
                <p className="text-[13px] font-medium text-ink leading-snug">{a.title}</p>
                <p className="text-[12px] text-muted line-clamp-2 mt-0.5">{a.body}</p>
              </div>
            ))}
            {announcements.length === 0 && (
              <p className="px-5 py-8 text-center text-[13px] text-muted">No notices yet.</p>
            )}
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
