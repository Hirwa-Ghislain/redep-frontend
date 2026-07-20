import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Megaphone, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import { adminService } from "@/services/adminService";
import { toast } from "@/stores/uiStore";
import { formatDateTime, fullName } from "@/lib/format";

type Audience = "ALL" | "PARENTS" | "TEACHERS" | "SCHOOLS";

const AUDIENCE_LABEL: Record<Audience, string> = {
  ALL: "Everyone",
  PARENTS: "Parents",
  TEACHERS: "Teachers",
  SCHOOLS: "Schools",
};

const AUDIENCE_REACH: Record<Audience, string> = {
  ALL: "This will notify every account on the platform — parents, teachers, staff and school administrators.",
  PARENTS: "This will notify every parent account.",
  TEACHERS: "This will notify every teacher account.",
  SCHOOLS: "This will notify every school administrator and staff account.",
};

interface SentItem {
  id: number;
  title: string;
  audience: Audience;
  at: string;
}

export default function BroadcastPage() {
  const { user } = useAuth();
  const actor = user ? fullName(user) : "System admin";

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("ALL");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sent, setSent] = useState<SentItem[]>([]);

  const send = useMutation({
    mutationFn: () => adminService.broadcast({ title: title.trim(), body: body.trim(), audience, actor }),
    onSuccess: () => {
      setSent((s) => [{ id: Date.now(), title: title.trim(), audience, at: new Date().toISOString() }, ...s]);
      setConfirmOpen(false);
      setTitle("");
      setBody("");
      setAudience("ALL");
      toast({ title: "Broadcast sent", description: "Recipients see it in their announcements feed.", variant: "success" });
    },
    onError: () => toast({ title: "Broadcast failed", description: "Nothing was sent — try again.", variant: "error" }),
  });

  const canSend = Boolean(title.trim() && body.trim());

  return (
    <PageTransition>
      <PageHeader
        title="National broadcast"
        description="Publish a platform-wide announcement — use sparingly and only when it concerns the whole audience."
      />

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {/* Compose */}
        <Card>
          <CardHeader title="Compose" description="The message is published under the REDEP Platform identity." />
          <div className="space-y-4">
            <Input
              label="Title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scheduled maintenance on Saturday night"
            />
            <Textarea
              label="Message"
              required
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Keep it short, factual and actionable."
            />
            <Select
              label="Audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value as Audience)}
              hint={AUDIENCE_REACH[audience]}
            >
              {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((a) => (
                <option key={a} value={a}>{AUDIENCE_LABEL[a]}</option>
              ))}
            </Select>
            <div className="flex justify-end">
              <Button icon={<Send className="size-4" />} disabled={!canSend} onClick={() => setConfirmOpen(true)}>
                Send broadcast
              </Button>
            </div>
          </div>
        </Card>

        {/* Preview + session history */}
        <div className="space-y-4">
          <FadeIn>
            <Card padded={false}>
              <CardHeader className="px-4 pt-4" title="Live preview" description="How the announcement renders for recipients." />
              <div className="px-4 pb-4">
                <div className="rounded-(--radius-card) border border-line overflow-hidden">
                  <div className="flex items-center gap-2 bg-gold-soft px-4 py-2.5 border-b border-line">
                    <Megaphone className="size-4 text-gold-deep shrink-0" aria-hidden />
                    <span className="text-[11.5px] font-semibold uppercase tracking-wide text-gold-deep">
                      REDEP Platform · Circular
                    </span>
                  </div>
                  <div className="px-4 py-3.5">
                    <p className="font-display font-semibold text-[14px] text-ink">
                      {title.trim() || "Your title appears here"}
                    </p>
                    <p className="text-[13px] text-muted mt-1.5 whitespace-pre-line">
                      {body.trim() || "Your message body appears here exactly as recipients will read it."}
                    </p>
                    <div className="mt-2.5">
                      <Badge variant="gold">{AUDIENCE_LABEL[audience]}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </FadeIn>

          <Card padded={false}>
            <CardHeader className="px-4 pt-4" title="Sent this session" description="Broadcasts you published since opening this page." />
            {sent.length === 0 ? (
              <p className="px-4 pb-5 text-[13px] text-muted">Nothing sent yet.</p>
            ) : (
              <div className="divide-y divide-line">
                {sent.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Megaphone className="size-4 text-gold-deep shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink truncate">{s.title}</p>
                      <p className="text-[12px] text-muted tnum">{formatDateTime(s.at)}</p>
                    </div>
                    <Badge variant="neutral">{AUDIENCE_LABEL[s.audience]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Guidance */}
          <FadeIn delay={0.05}>
            <Card padded={false} className="p-4">
              <CardHeader
                className="mb-3"
                title="Responsible broadcasting"
                description="A national push interrupts a lot of people."
              />
              <ul className="space-y-2 text-[12.5px] text-muted">
                <li className="flex items-start gap-2.5">
                  <AlertTriangle className="size-4 text-gold-deep shrink-0 mt-0.5" aria-hidden />
                  Reserve <span className="font-medium text-ink">Everyone</span> for emergencies, platform downtime, or national policy changes.
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 text-primary-deep shrink-0 mt-0.5" aria-hidden />
                  School-specific news belongs to the school's own announcements — never broadcast it nationally.
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 text-primary-deep shrink-0 mt-0.5" aria-hidden />
                  Lead with what recipients must do and by when; every broadcast is recorded in the audit log.
                </li>
              </ul>
            </Card>
          </FadeIn>
        </div>
      </div>

      {/* Confirm */}
      <Modal
        open={confirmOpen}
        onClose={() => !send.isPending && setConfirmOpen(false)}
        title="Send this broadcast?"
        description={title.trim() || undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={send.isPending}>
              Cancel
            </Button>
            <Button loading={send.isPending} onClick={() => send.mutate()}>
              {send.isPending ? "Sending…" : "Send now"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-[13.5px] text-ink font-medium">{AUDIENCE_REACH[audience]}</p>
          <p className="text-[13px] text-muted">
            It cannot be recalled once sent, and the action is recorded in the audit log under your name.
          </p>
        </div>
      </Modal>
    </PageTransition>
  );
}
