import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Compass,
  FileText,
  GraduationCap,
  Megaphone,
  MessageSquare,
  Wallet,
} from "lucide-react";
import { HeroBanner } from "@/components/layout/HeroBanner";
import { FadeIn, PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { academicService } from "@/services/academicService";
import { admissionService } from "@/services/admissionService";
import { commsService } from "@/services/commsService";
import { feeService } from "@/services/feeService";
import { studentService } from "@/services/studentService";
import { formatDate, formatRWF, fullName } from "@/lib/format";
import { ADMISSION_STATUS } from "@/lib/status";

export default function ParentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: children = [], isLoading: loadingChildren } = useQuery({
    queryKey: ["children", user?.id],
    queryFn: () => studentService.listByParent(user!.id),
    enabled: Boolean(user),
  });

  const { data: term } = useQuery({ queryKey: ["current-term"], queryFn: () => academicService.currentTerm() });

  const enrolled = children.filter((c) => c.status === "ENROLLED");

  const { data: totalDue } = useQuery({
    queryKey: ["parent-due", user?.id, term?.id, enrolled.length],
    queryFn: async () => {
      const all = await Promise.all(enrolled.map((c) => feeService.balances(c.id, term!.id)));
      return all.flat().reduce((sum, b) => sum + b.due, 0);
    },
    enabled: Boolean(term) && enrolled.length > 0,
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["applications", user?.id],
    queryFn: () => admissionService.listByParent(user!.id),
    enabled: Boolean(user),
  });

  const { data: threads = [] } = useQuery({
    queryKey: ["threads", user?.id],
    queryFn: () => commsService.threadsFor(user!.id),
    enabled: Boolean(user),
  });

  const schoolIds = [...new Set(children.map((c) => c.schoolId))];
  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements-feed", "PARENT", schoolIds.join(",")],
    queryFn: () => commsService.announcementsFor({ schoolIds, audience: "PARENT" }),
    enabled: !loadingChildren,
  });

  const openApplications = applications.filter((a) => !["APPROVED", "REJECTED"].includes(a.status));
  const unread = threads.reduce((s, t) => s + t.unreadCount, 0);

  return (
    <PageTransition>
      <HeroBanner
        eyebrow={term?.label}
        title={`Muraho, ${user?.firstName} 👋`}
        subtitle="Here's what's happening across your children's schools."
        stats={[
          { label: "Children enrolled", value: String(enrolled.length) },
          { label: "Outstanding", value: formatRWF(totalDue ?? 0) },
          { label: "Unread", value: String(unread) },
        ]}
        actions={
          <Button variant="gold" icon={<Compass className="size-4" />} onClick={() => navigate("/parent/discover")}>
            Find schools
          </Button>
        }
      />

      {/* KPI row */}
      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StaggerItem>
          <StatCard label="Children enrolled" value={String(enrolled.length)} icon={GraduationCap} tone="primary" />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label={`Outstanding fees${term ? ` — ${term.label}` : ""}`}
            value={totalDue !== undefined ? formatRWF(totalDue) : "…"}
            icon={Wallet}
            tone={totalDue ? "clay" : "primary"}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Open applications" value={String(openApplications.length)} icon={FileText} tone="gold" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Unread messages" value={String(unread)} icon={MessageSquare} tone="sky" />
        </StaggerItem>
      </Stagger>

      <div className="grid lg:grid-cols-3 gap-4 mt-4 items-start">
        {/* Children */}
        <div className="lg:col-span-2 space-y-4">
          <Card padded={false}>
            <CardHeader
              className="px-5 pt-4"
              title="My children"
              description="Tap a child to see academics, teachers and fees."
              action={
                <Link to="/parent/children" className="text-[13px] font-medium text-primary-deep hover:underline">
                  View all
                </Link>
              }
            />
            {loadingChildren ? (
              <div className="px-5 pb-5 space-y-3">
                <CardSkeleton />
              </div>
            ) : (
              <div className="divide-y divide-line">
                {children.map((child) => (
                  <Link
                    key={child.id}
                    to={`/parent/children/${child.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-paper/70 transition-colors group"
                  >
                    <Avatar name={fullName(child)} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink">{fullName(child)}</p>
                      <p className="text-[12px] text-muted truncate">
                        {child.className} · {child.schoolName}
                      </p>
                    </div>
                    <Badge variant={child.status === "ENROLLED" ? "success" : "neutral"}>
                      {child.status === "ENROLLED" ? "Enrolled" : "Former"}
                    </Badge>
                    <ArrowRight className="size-4 text-faint opacity-0 group-hover:opacity-100 group-hover:text-primary-deep group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Open applications */}
          {openApplications.length > 0 && (
            <FadeIn>
              <Card padded={false}>
                <CardHeader
                  className="px-5 pt-4"
                  title="Applications in progress"
                  action={
                    <Link to="/parent/applications" className="text-[13px] font-medium text-primary-deep hover:underline">
                      All applications
                    </Link>
                  }
                />
                <div className="divide-y divide-line">
                  {openApplications.slice(0, 3).map((app) => {
                    const meta = ADMISSION_STATUS[app.status];
                    return (
                      <div key={app.id} className="flex items-center gap-3 px-5 py-2.5">
                        <FileText className="size-4 text-muted shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-ink">
                            {app.childFirstName} {app.childLastName}
                          </p>
                          <p className="text-[12px] text-muted">Submitted {formatDate(app.submittedAt)}</p>
                        </div>
                        <Badge variant={meta.variant} dot>{meta.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </FadeIn>
          )}
        </div>

        {/* Announcements preview */}
        <Card padded={false}>
          <CardHeader
            className="px-5 pt-4"
            title="Latest notices"
            action={
              <Link to="/parent/announcements" className="text-[13px] font-medium text-primary-deep hover:underline">
                All
              </Link>
            }
          />
          <div className="divide-y divide-line">
            {announcements.slice(0, 4).map((a) => (
              <div key={a.id} className="px-5 py-3">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Megaphone className="size-3 text-gold-deep shrink-0" />
                  <span className="text-[11px] text-faint tnum">{formatDate(a.publishedAt)}</span>
                </div>
                <p className="text-[12.5px] font-medium text-ink leading-snug">{a.title}</p>
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
