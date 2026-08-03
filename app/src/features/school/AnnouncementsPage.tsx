import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Megaphone, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Can } from "@/components/auth/guards";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { P } from "@/config/permissions";
import { commsService } from "@/services/commsService";
import { schoolService } from "@/services/schoolService";
import { toast } from "@/stores/uiStore";
import { formatDate, fullName } from "@/lib/format";
import type { ApiError } from "@/lib/api/client";

interface AnnouncementForm {
  title: string;
  body: string;
  classId: string;
}

const EMPTY_FORM: AnnouncementForm = { title: "", body: "", classId: "" };

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const schoolId = user!.schoolId!;
  const [composerOpen, setComposerOpen] = useState(false);
  const [form, setForm] = useState<AnnouncementForm>(EMPTY_FORM);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["announcements", schoolId],
    queryFn: () => commsService.announcementsBySchool(schoolId),
  });

  const { data: school } = useQuery({
    queryKey: ["school", schoolId],
    queryFn: () => schoolService.get(schoolId),
  });
  const classes = school?.classes ?? [];

  const publish = useMutation({
    mutationFn: () =>
      commsService.publishAnnouncement({
        schoolId, authorName: fullName(user!),
        title: form.title.trim(), body: form.body.trim(),
        category: "GENERAL", audience: form.classId ? "PARENTS" : "ALL",
        classId: form.classId || null,
      }),
    onSuccess: () => {
      setComposerOpen(false);
      setForm(EMPTY_FORM);
      void qc.invalidateQueries({ queryKey: ["announcements"] });
      toast({ title: "Announcement published", description: "Parents of the targeted students were notified.", variant: "success" });
    },
    onError: (e) => toast({ title: "Could not publish", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  return (
    <PageTransition>
      <PageHeader
        title="Announcements"
        description="Publish notices to parents — school-wide or targeted to one class."
        actions={
          <Can permission={P.ANNOUNCEMENTS_PUBLISH}>
            <Button icon={<Plus className="size-4" />} onClick={() => { setForm(EMPTY_FORM); setComposerOpen(true); }}>
              New announcement
            </Button>
          </Can>
        }
      />

      <div className="mb-4 flex items-start gap-2.5 rounded-(--radius-card) border border-line bg-sky-soft/60 px-4 py-3 text-[13px] text-sky-deep">
        <Info className="size-4 shrink-0 mt-0.5" aria-hidden />
        <span>
          The backend has no history endpoint for a school's own announcements yet — only publishing. The list
          below only shows what was published in this browser session.
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3"><CardSkeleton /><CardSkeleton /></div>
      ) : announcements.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={Megaphone}
            title="Nothing published this session"
            description="Announcements reach parents' feeds the moment you publish."
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
          {announcements.map((a) => (
            <StaggerItem key={a.id}>
              <Card padded={false} className="p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant={a.audience === "PARENTS" ? "info" : "neutral"}>{a.audience === "PARENTS" ? "One class" : "Everyone"}</Badge>
                  <span className="ml-auto text-[11.5px] text-faint tnum">{formatDate(a.publishedAt)}</span>
                </div>
                <h3 className="font-display font-bold text-[14px] text-ink">{a.title}</h3>
                <p className="text-[13px] text-muted leading-relaxed mt-1 whitespace-pre-line">{a.body}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <Modal
        open={composerOpen}
        onClose={() => !publish.isPending && setComposerOpen(false)}
        title="New announcement"
        description="Published immediately to the parents of every enrolled student in scope."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setComposerOpen(false)} disabled={publish.isPending}>Cancel</Button>
            <Button loading={publish.isPending} disabled={!form.title.trim() || !form.body.trim()} onClick={() => publish.mutate()}>
              Publish
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Input label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          <Textarea label="Message" rows={5} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} required />
          <Select label="Audience" hint="Leave as 'entire school' or target one class." value={form.classId} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}>
            <option value="">Entire school</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} only</option>)}
          </Select>
        </div>
      </Modal>
    </PageTransition>
  );
}
