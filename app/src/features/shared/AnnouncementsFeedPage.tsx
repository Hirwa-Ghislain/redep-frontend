import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, Pin } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Input";
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

/** Read-only announcements feed for parents and teachers, with client-side filters. */
export default function AnnouncementsFeedPage() {
  const { user, role } = useAuth();
  const [category, setCategory] = useState<AnnouncementCategory | "ALL">("ALL");
  const [schoolFilter, setSchoolFilter] = useState<string>("ALL");

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

  const { data: schools = [] } = useQuery({ queryKey: ["schools-all"], queryFn: () => schoolService.list() });
  const schoolName = (id: string | null) => (id === null ? "National" : (schools.find((s) => s.id === id)?.name ?? "School"));

  const presentCategories = useMemo(
    () => [...new Set(announcements.map((a) => a.category))],
    [announcements],
  );
  const presentSources = useMemo(
    () => [...new Set(announcements.map((a) => a.schoolId ?? "national"))],
    [announcements],
  );

  const filtered = announcements.filter(
    (a) =>
      (category === "ALL" || a.category === category) &&
      (schoolFilter === "ALL" || (a.schoolId ?? "national") === schoolFilter),
  );
  const pinned = announcements.filter((a) => a.pinned);

  return (
    <PageTransition>
      <PageHeader
        title="Announcements"
        description="Notices from your schools and national circulars, newest first."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px] items-start">
        {/* Feed */}
        <div className="min-w-0">
          {isLoading ? (
            <div className="space-y-3">
              <CardSkeleton /> <CardSkeleton /> <CardSkeleton />
            </div>
          ) : filtered.length === 0 ? (
            <Card padded={false}>
              <EmptyState
                icon={Megaphone}
                title={announcements.length === 0 ? "No announcements" : "Nothing matches these filters"}
                description={
                  announcements.length === 0
                    ? "When your school publishes a notice, it will show up here."
                    : "Try clearing the category or school filter."
                }
              />
            </Card>
          ) : (
            <Stagger className="space-y-3">
              {filtered.map((a) => {
                const meta = CATEGORY_META[a.category];
                return (
                  <StaggerItem key={a.id}>
                    <Card padded={false} className={cn("p-4 sm:p-5", a.pinned && "border-gold/60")}>
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
                      <h3 className="font-display font-semibold text-[15px] text-ink leading-snug">{a.title}</h3>
                      <p className="text-[13px] text-muted leading-relaxed mt-1.5 whitespace-pre-line max-w-3xl">{a.body}</p>
                      <p className="text-[11px] text-faint mt-2.5">— {a.authorName}</p>
                    </Card>
                  </StaggerItem>
                );
              })}
            </Stagger>
          )}
        </div>

        {/* Filter rail */}
        <aside className="space-y-4 lg:sticky lg:top-[72px]">
          <Card>
            <CardHeader title="Filter" description="Narrow the feed down." />
            <p className="text-[11px] font-bold uppercase tracking-wide text-faint mb-1.5">Category</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategory("ALL")}
                aria-pressed={category === "ALL"}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11.5px] font-semibold border transition-colors",
                  category === "ALL"
                    ? "bg-ink text-paper border-ink"
                    : "bg-surface text-muted border-line hover:border-line-strong",
                )}
              >
                All
              </button>
              {presentCategories.map((c) => {
                const meta = CATEGORY_META[c];
                const active = category === c;
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(active ? "ALL" : c)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11.5px] font-semibold border transition-colors",
                      active
                        ? "bg-ink text-paper border-ink"
                        : "bg-surface text-muted border-line hover:border-line-strong",
                    )}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
            {presentSources.length > 1 && (
              <>
                <p className="text-[11px] font-bold uppercase tracking-wide text-faint mt-4 mb-1.5">Source</p>
                <Select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)} aria-label="Filter by school">
                  <option value="ALL">All schools</option>
                  {presentSources.map((id) => (
                    <option key={id} value={id}>
                      {id === "national" ? "National" : schoolName(id)}
                    </option>
                  ))}
                </Select>
              </>
            )}
          </Card>

          {pinned.length > 0 && (
            <Card>
              <CardHeader title="Pinned" />
              <ul className="space-y-2.5">
                {pinned.map((a) => (
                  <li key={a.id} className="flex items-start gap-2.5">
                    <Pin className="size-3.5 text-gold-deep shrink-0 mt-0.5" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-ink leading-snug">{a.title}</p>
                      <p className="text-[11px] text-faint tnum mt-0.5">
                        {schoolName(a.schoolId)} · {formatDate(a.publishedAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="bg-sky-soft/50 border-sky/25">
            <p className="text-[12.5px] text-sky-deep leading-relaxed">
              Emergency notices also reach you by email{role === "PARENT" ? " — and by SMS once the gateway launches" : ""}.
              Manage channels in <span className="font-semibold">Settings → Notifications</span>.
            </p>
          </Card>
        </aside>
      </div>
    </PageTransition>
  );
}
