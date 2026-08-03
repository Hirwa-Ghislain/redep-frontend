import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Megaphone, Pin, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Can } from "@/components/auth/guards";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { UnderDevelopment } from "@/components/ui/UnderDevelopment";
import { P } from "@/config/permissions";
import { USE_MOCKS } from "@/lib/api/client";
import { commsService } from "@/services/commsService";
import { formatDate } from "@/lib/format";
import { toast } from "@/stores/uiStore";
import type { ApiError } from "@/lib/api/client";
import type { Announcement } from "@/types";

/**
 * National circular broadcast is a SUPER_ADMIN-only capability (`POST /admin/broadcast`, a
 * different portal) — the real backend has no education-authority-facing endpoint for
 * publishing national circulars. Mock mode keeps the full compose/publish demo below; live
 * mode shows an honest "not available" state instead of a broken/fake compose flow.
 */
export default function CircularsPage() {
  if (!USE_MOCKS) {
    return (
      <PageTransition>
        <PageHeader
          title="Circulars"
          description="National notices published by the ministry to schools across the platform."
        />
        <UnderDevelopment
          title="National circulars aren't available yet"
          description="Publishing national circulars from an education-authority account isn't supported by the backend yet — national broadcasts are currently a platform-administrator capability. Contact a platform administrator if you need to send an urgent notice."
        />
      </PageTransition>
    );
  }
  return <CircularsPageMock />;
}

const AUDIENCE_LABEL: Record<Announcement["audience"], string> = {
  ALL: "Everyone",
  PARENTS: "Parents",
  TEACHERS: "Teachers",
  STAFF: "Staff",
  SCHOOLS: "Schools",
};

const CATEGORY_LABEL: Record<Announcement["category"], string> = {
  GENERAL: "General",
  MEETING: "Meeting",
  CLOSURE: "Closure",
  EMERGENCY: "Emergency",
  EVENT: "Event",
  CIRCULAR: "Circular",
};

function CircularsPageMock() {
  const qc = useQueryClient();
  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"SCHOOLS" | "ALL">("SCHOOLS");
  const [pinned, setPinned] = useState(false);

  const { data: circulars = [], isLoading } = useQuery({
    queryKey: ["ministry-circulars"],
    queryFn: async () => {
      const all = await commsService.announcementsFor({ schoolIds: [], audience: "MINISTRY_ADMIN" });
      return all.filter((a) => a.schoolId === null);
    },
  });

  const resetForm = () => {
    setTitle("");
    setBody("");
    setAudience("SCHOOLS");
    setPinned(false);
  };

  const publish = useMutation({
    mutationFn: () =>
      commsService.publishAnnouncement({
        schoolId: null,
        category: "CIRCULAR",
        authorName: "Ministry of Education",
        title: title.trim(),
        body: body.trim(),
        audience,
        pinned,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ministry-circulars"] });
      void qc.invalidateQueries({ queryKey: ["announcements-feed"] });
      toast({ title: "Circular published", variant: "success" });
      setComposeOpen(false);
      resetForm();
    },
    onError: (e) =>
      toast({ title: "Publish failed", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const canSubmit = title.trim().length > 0 && body.trim().length > 0;

  return (
    <PageTransition>
      <PageHeader
        title="Circulars"
        description="National notices published by the ministry to schools across the platform."
        actions={
          <Can permission={P.MINISTRY_ANNOUNCE}>
            <Button icon={<Plus className="size-4" />} onClick={() => setComposeOpen(true)}>
              Publish circular
            </Button>
          </Can>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px] items-start">
        {/* Feed */}
        <div className="min-w-0">
          {isLoading ? (
            <div className="space-y-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : circulars.length === 0 ? (
            <Card padded={false}>
              <EmptyState
                icon={Megaphone}
                title="No circulars yet"
                description="National circulars published by the ministry will appear here."
                action={
                  <Can permission={P.MINISTRY_ANNOUNCE}>
                    <Button icon={<Plus className="size-4" />} onClick={() => setComposeOpen(true)}>
                      Publish the first circular
                    </Button>
                  </Can>
                }
              />
            </Card>
          ) : (
            <Stagger className="space-y-3">
              {circulars.map((c) => (
                <StaggerItem key={c.id}>
                  <Card padded={false} className="p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2 text-[11px]">
                      <Badge variant={c.category === "CIRCULAR" ? "gold" : "neutral"}>{CATEGORY_LABEL[c.category]}</Badge>
                      <Badge variant="info">{AUDIENCE_LABEL[c.audience]}</Badge>
                      {c.pinned && (
                        <Badge variant="ink" className="inline-flex items-center gap-1">
                          <Pin className="size-3" aria-hidden /> Pinned
                        </Badge>
                      )}
                      <span className="ml-auto text-faint tnum">{formatDate(c.publishedAt)}</span>
                    </div>
                    <h3 className="font-display font-semibold text-[14px] text-ink leading-snug">{c.title}</h3>
                    <p className="text-[13px] text-muted leading-relaxed mt-1 whitespace-pre-line">{c.body}</p>
                    <p className="text-[11px] text-faint mt-2.5">— {c.authorName}</p>
                  </Card>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </div>

        {/* Side rail */}
        <aside className="space-y-4">
          {circulars.some((c) => c.pinned) && (
            <Card>
              <CardHeader title="Pinned circulars" description="Held at the top of every school's feed." />
              <ul className="space-y-2.5">
                {circulars.filter((c) => c.pinned).map((c) => (
                  <li key={c.id} className="flex items-start gap-2.5">
                    <Pin className="size-3.5 text-gold-deep shrink-0 mt-0.5" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ink leading-snug">{c.title}</p>
                      <p className="text-[11.5px] text-muted tnum mt-0.5">{formatDate(c.publishedAt)} · {AUDIENCE_LABEL[c.audience]}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader title="Publishing guidelines" />
            <ul className="space-y-2 text-[12.5px] text-muted">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-primary-deep shrink-0 mt-0.5" aria-hidden />
                Circulars go to every school on the platform the moment you publish — there is no draft state.
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-primary-deep shrink-0 mt-0.5" aria-hidden />
                Pick <span className="font-medium text-ink">Schools</span> for administrative notices; reserve{" "}
                <span className="font-medium text-ink">Everyone</span> for news parents and teachers must see.
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-primary-deep shrink-0 mt-0.5" aria-hidden />
                Pin only time-critical circulars — pinned items stay first in every feed until unpinned.
              </li>
            </ul>
          </Card>
        </aside>
      </div>

      <Modal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        title="Publish circular"
        description="Sent nationally — every school on the platform will see it."
        footer={
          <>
            <Button variant="secondary" onClick={() => setComposeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => publish.mutate()} disabled={!canSubmit} loading={publish.isPending}>
              Publish
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Term 3 examination calendar"
          />
          <Textarea
            label="Body"
            required
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write the circular content…"
          />
          <Select
            label="Audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value as "SCHOOLS" | "ALL")}
            hint="Schools reaches administrators only; Everyone also reaches parents, teachers and staff."
          >
            <option value="SCHOOLS">Schools</option>
            <option value="ALL">Everyone</option>
          </Select>
          <Checkbox
            label="Pin to the top"
            description="Pinned circulars stay first in every feed."
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
          />
        </div>
      </Modal>
    </PageTransition>
  );
}
