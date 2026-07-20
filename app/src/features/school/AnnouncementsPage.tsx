import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Megaphone, Pin, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Can } from "@/components/auth/guards";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { P } from "@/config/permissions";
import { commsService } from "@/services/commsService";
import { toast } from "@/stores/uiStore";
import { formatDate, fullName } from "@/lib/format";
import type { ApiError } from "@/lib/api/client";
import type { Announcement, AnnouncementCategory } from "@/types";

const CATEGORY_META: Record<AnnouncementCategory, { label: string; variant: BadgeVariant }> = {
  GENERAL: { label: "General", variant: "neutral" },
  MEETING: { label: "Meeting", variant: "info" },
  CLOSURE: { label: "Closure", variant: "warning" },
  EMERGENCY: { label: "Emergency", variant: "danger" },
  EVENT: { label: "Event", variant: "success" },
  CIRCULAR: { label: "National circular", variant: "gold" },
};

const AUDIENCE_LABEL: Record<Announcement["audience"], string> = {
  ALL: "Everyone",
  PARENTS: "Parents",
  TEACHERS: "Teachers",
  STAFF: "Staff",
  SCHOOLS: "Schools",
};

interface AnnouncementForm {
  title: string;
  body: string;
  category: AnnouncementCategory;
  audience: Announcement["audience"];
  pinned: boolean;
}

const EMPTY_FORM: AnnouncementForm = { title: "", body: "", category: "GENERAL", audience: "ALL", pinned: false };

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [composerOpen, setComposerOpen] = useState(false);
  const [form, setForm] = useState<AnnouncementForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["announcements", user?.schoolId],
    queryFn: () => commsService.announcementsBySchool(user!.schoolId!),
    enabled: Boolean(user?.schoolId),
  });

  const publish = useMutation({
    mutationFn: () =>
      commsService.publishAnnouncement({
        schoolId: user!.schoolId!,
        authorName: fullName(user!),
        title: form.title.trim(),
        body: form.body.trim(),
        category: form.category,
        audience: form.audience,
        pinned: form.pinned,
      }),
    onSuccess: () => {
      setComposerOpen(false);
      setForm(EMPTY_FORM);
      void qc.invalidateQueries({ queryKey: ["announcements"] });
      toast({ title: "Announcement published", description: `Visible to ${AUDIENCE_LABEL[form.audience].toLowerCase()}.`, variant: "success" });
    },
    onError: (e) => toast({ title: "Could not publish", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => commsService.removeAnnouncement(id),
    onSuccess: () => {
      setDeleteTarget(null);
      void qc.invalidateQueries({ queryKey: ["announcements"] });
      toast({ title: "Announcement deleted", variant: "success" });
    },
    onError: (e) => toast({ title: "Could not delete", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  return (
    <PageTransition>
      <PageHeader
        title="Announcements"
        description="Everything the school has published — parents, teachers and staff see what's addressed to them."
        actions={
          <Can permission={P.ANNOUNCEMENTS_PUBLISH}>
            <Button icon={<Plus className="size-4" />} onClick={() => { setForm(EMPTY_FORM); setComposerOpen(true); }}>
              New announcement
            </Button>
          </Can>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px] items-start">
      {/* Feed */}
      <div className="min-w-0">
      {isLoading ? (
        <div className="space-y-3"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
      ) : announcements.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={Megaphone}
            title="Nothing published yet"
            description="Announcements reach parents, teachers and staff in their portals the moment you publish."
            action={
              <Can permission={P.ANNOUNCEMENTS_PUBLISH}>
                <Button icon={<Plus className="size-4" />} onClick={() => { setForm(EMPTY_FORM); setComposerOpen(true); }}>
                  New announcement
                </Button>
              </Can>
            }
          />
        </Card>
      ) : (
        <Stagger className="space-y-3">
          {announcements.map((a) => {
            const meta = CATEGORY_META[a.category];
            return (
              <StaggerItem key={a.id}>
                <Card padded={false} className={a.pinned ? "p-4 border-gold/60" : "p-4"}>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    <Badge variant="neutral">{AUDIENCE_LABEL[a.audience]}</Badge>
                    {a.pinned && (
                      <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-gold-deep">
                        <Pin className="size-3" /> Pinned
                      </span>
                    )}
                    <span className="ml-auto text-[11.5px] text-faint tnum">{formatDate(a.publishedAt)}</span>
                    <Can permission={P.ANNOUNCEMENTS_PUBLISH}>
                      <button
                        onClick={() => setDeleteTarget(a)}
                        aria-label={`Delete announcement "${a.title}"`}
                        className="p-1 -my-1 rounded-md text-faint hover:text-clay-deep hover:bg-clay-soft transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </Can>
                  </div>
                  <h3 className="font-display font-bold text-[14px] text-ink">{a.title}</h3>
                  <p className="text-[13px] text-muted leading-relaxed mt-1 whitespace-pre-line">{a.body}</p>
                  <p className="text-[11.5px] text-faint mt-2.5">— {a.authorName}</p>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
      </div>

      {/* Side rail */}
      <aside className="space-y-4">
        {announcements.some((a) => a.pinned) && (
          <Card>
            <CardHeader title="Pinned" description="Held at the top of every recipient's feed." />
            <ul className="space-y-2.5">
              {announcements.filter((a) => a.pinned).map((a) => (
                <li key={a.id} className="flex items-start gap-2.5">
                  <Pin className="size-3.5 text-gold-deep shrink-0 mt-0.5" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink leading-snug">{a.title}</p>
                    <p className="text-[11.5px] text-muted tnum mt-0.5">
                      {formatDate(a.publishedAt)} · {AUDIENCE_LABEL[a.audience]}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <CardHeader title="Reaching the right people" />
          <ul className="space-y-2 text-[12.5px] text-muted">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="size-4 text-primary-deep shrink-0 mt-0.5" aria-hidden />
              Notices publish immediately to the audience you pick — parents, teachers, staff or everyone.
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="size-4 text-primary-deep shrink-0 mt-0.5" aria-hidden />
              Use categories consistently — <span className="font-medium text-ink">Emergency</span> and{" "}
              <span className="font-medium text-ink">Closure</span> stand out in every feed.
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="size-4 text-primary-deep shrink-0 mt-0.5" aria-hidden />
              Pin sparingly — pinned notices stay first until you delete or replace them.
            </li>
          </ul>
        </Card>
      </aside>
      </div>

      {/* Composer */}
      <Modal
        open={composerOpen}
        onClose={() => !publish.isPending && setComposerOpen(false)}
        title="New announcement"
        description="Published immediately to the audience you pick."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setComposerOpen(false)} disabled={publish.isPending}>Cancel</Button>
            <Button
              loading={publish.isPending}
              disabled={!form.title.trim() || !form.body.trim()}
              onClick={() => publish.mutate()}
            >
              Publish
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Input
            label="Title"
            placeholder="E.g. Term 2 parents' meeting"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
          <Textarea
            label="Message"
            placeholder="Write the full notice…"
            rows={5}
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            required
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as AnnouncementCategory }))}
            >
              <option value="GENERAL">General</option>
              <option value="MEETING">Meeting</option>
              <option value="CLOSURE">Closure</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="EVENT">Event</option>
            </Select>
            <Select
              label="Audience"
              value={form.audience}
              onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value as Announcement["audience"] }))}
            >
              <option value="ALL">Everyone</option>
              <option value="PARENTS">Parents</option>
              <option value="TEACHERS">Teachers</option>
              <option value="STAFF">Staff</option>
            </Select>
          </div>
          <Checkbox
            label="Pin this announcement"
            description="Pinned notices stay at the top of every feed."
            checked={form.pinned}
            onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
          />
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !remove.isPending && setDeleteTarget(null)}
        title="Delete announcement?"
        description={deleteTarget ? `"${deleteTarget.title}" will disappear from every feed immediately.` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={remove.isPending}>Cancel</Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => deleteTarget && remove.mutate(deleteTarget.id)}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] text-muted">This cannot be undone.</p>
      </Modal>
    </PageTransition>
  );
}
