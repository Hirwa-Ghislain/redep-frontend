import { useQuery } from "@tanstack/react-query";
import { Megaphone, Pin } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { commsService } from "@/services/commsService";
import { studentService } from "@/services/studentService";
import { schoolService } from "@/services/schoolService";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnnouncementCategory } from "@/types";

const CATEGORY_META: Record<AnnouncementCategory, { label: string; variant: BadgeVariant }> = {
  GENERAL: { label: "General", variant: "neutral" },
  MEETING: { label: "Meeting", variant: "info" },
  CLOSURE: { label: "Closure", variant: "warning" },
  EMERGENCY: { label: "Emergency", variant: "danger" },
  EVENT: { label: "Event", variant: "success" },
  CIRCULAR: { label: "National circular", variant: "gold" },
};

/** Read-only announcements feed for parents and teachers. */
export default function AnnouncementsFeedPage() {
  const { user, role } = useAuth();

  // Parents: announcements from every school their children attend. Teachers: their school.
  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ["children", user?.id],
    queryFn: () => studentService.listByParent(user!.id),
    enabled: Boolean(user) && role === "PARENT",
  });

  const schoolIds =
    role === "PARENT" ? [...new Set(children.map((c) => c.schoolId))] : user?.schoolId ? [user.schoolId] : [];

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["announcements-feed", role, schoolIds.join(",")],
    queryFn: () => commsService.announcementsFor({ schoolIds, audience: role! }),
    enabled: Boolean(user) && (role !== "PARENT" || !childrenLoading),
  });

  const { data: schools = [] } = useQuery({
    queryKey: ["schools-all"],
    queryFn: () => schoolService.list(),
  });
  const schoolName = (id: string | null) => (id === null ? "National" : (schools.find((s) => s.id === id)?.name ?? "School"));

  return (
    <PageTransition>
      <PageHeader
        title="Announcements"
        description="Notices from your schools and national circulars, newest first."
      />
      {isLoading ? (
        <div className="space-y-3">
          <CardSkeleton /> <CardSkeleton /> <CardSkeleton />
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements"
          description="When your school publishes a notice, it will show up here."
        />
      ) : (
        <Stagger className="space-y-3 max-w-2xl">
          {announcements.map((a) => {
            const meta = CATEGORY_META[a.category];
            return (
              <StaggerItem key={a.id}>
                <Card padded={false} className={cn("p-4", a.pinned && "border-gold/60")}>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    <Badge variant="neutral">{schoolName(a.schoolId)}</Badge>
                    {a.pinned && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gold-deep">
                        <Pin className="size-3" /> Pinned
                      </span>
                    )}
                    <span className="ml-auto text-[11px] text-faint tnum">{formatDate(a.publishedAt)}</span>
                  </div>
                  <h3 className="font-display font-semibold text-[14.5px] text-ink leading-snug">{a.title}</h3>
                  <p className="text-[13px] text-muted leading-relaxed mt-1 whitespace-pre-line">{a.body}</p>
                  <p className="text-[11px] text-faint mt-2.5">— {a.authorName}</p>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </PageTransition>
  );
}
