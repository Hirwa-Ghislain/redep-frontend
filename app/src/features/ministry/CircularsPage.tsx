import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Pin, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Can } from "@/components/auth/guards";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { P } from "@/config/permissions";
import { commsService } from "@/services/commsService";
import { formatDate } from "@/lib/format";
import { toast } from "@/stores/uiStore";
import type { ApiError } from "@/lib/api/client";
import type { Announcement } from "@/types";

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

export default function CircularsPage() {
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

      {isLoading ? (
        <div className="space-y-4 max-w-3xl">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : circulars.length === 0 ? (
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
      ) : (
        <Stagger className="space-y-3 max-w-3xl">
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
