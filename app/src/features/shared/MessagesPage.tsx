import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { UnderDevelopment } from "@/components/ui/UnderDevelopment";
import { useAuth } from "@/hooks/useAuth";
import { commsService } from "@/services/commsService";
import { fullName, timeAgo, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Shared threaded-messaging screen (parent ⇄ teacher ⇄ school office).
 * Thread scope depends on the active role: school users see the school inbox,
 * everyone else sees threads they participate in.
 *
 * The real messaging backend only supports parent ⇄ school-administration threads
 * (see messaging.service.ts) — a TEACHER isn't a party to any thread there, so in live
 * mode the teacher portal gets an honest "not available" state instead of an empty inbox.
 */
export default function MessagesPage() {
  const { user, role } = useAuth();

  if (role === "TEACHER") {
    return (
      <PageTransition>
        <PageHeader title="Messages" description="Direct conversations — every thread stays linked to a student." />
        <UnderDevelopment
          title="Direct messages"
          description="Teacher messaging isn't available yet — parents currently message the school office directly."
        />
      </PageTransition>
    );
  }

  return <MessagesThreadView user={user} role={role} />;
}

function MessagesThreadView({ user, role }: { user: ReturnType<typeof useAuth>["user"]; role: ReturnType<typeof useAuth>["role"] }) {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const isSchoolSide = role === "SCHOOL_ADMIN" || role === "SCHOOL_STAFF";

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["threads", isSchoolSide ? user?.schoolId : user?.id],
    queryFn: () =>
      isSchoolSide ? commsService.threadsForSchool(user!.schoolId!) : commsService.threadsFor(user!.id),
    enabled: Boolean(user),
  });

  const active = threads.find((t) => t.id === activeId) ?? threads[0] ?? null;

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["messages", active?.id],
    queryFn: () => commsService.messages(active!.id),
    enabled: Boolean(active),
  });

  const send = useMutation({
    mutationFn: (body: string) =>
      commsService.send({
        threadId: active!.id,
        senderId: user!.id,
        senderName: isSchoolSide ? "School office" : fullName(user!),
        senderRole: role!,
        body,
      }),
    onSuccess: () => {
      setDraft("");
      void qc.invalidateQueries({ queryKey: ["messages", active?.id] });
      void qc.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (draft.trim()) send.mutate(draft.trim());
  };

  return (
    <PageTransition>
      <PageHeader title="Messages" description="Direct conversations — every thread stays linked to a student." />

      {isLoading ? (
        <div className="grid lg:grid-cols-[340px_1fr] gap-4">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : threads.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No conversations yet"
          description="Threads with teachers and the school office will appear here."
        />
      ) : (
        <div className="grid lg:grid-cols-[340px_1fr] gap-4 items-stretch lg:h-[calc(100dvh-185px)]">
          {/* Thread list */}
          <div className="rounded-(--radius-card) border border-line bg-surface overflow-hidden shadow-(--shadow-card) lg:overflow-y-auto">
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-line last:border-0 px-4 py-3 text-left transition-colors",
                  active?.id === t.id ? "bg-primary-soft/50" : "hover:bg-paper/70",
                )}
              >
                <Avatar name={t.participants.find((p) => p.id !== user?.id)?.name ?? t.subject} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold text-ink">{t.subject}</span>
                    <span className="shrink-0 text-[11px] text-faint tnum">{timeAgo(t.lastMessageAt)}</span>
                  </span>
                  {t.studentName && (
                    <Badge variant="neutral" className="mt-0.5">{t.studentName}</Badge>
                  )}
                  <span className="block truncate text-[12px] text-muted mt-0.5">{t.lastMessagePreview}</span>
                </span>
              </button>
            ))}
          </div>

          {/* Conversation */}
          {active && (
            <div className="rounded-(--radius-card) border border-line bg-surface shadow-(--shadow-card) flex flex-col min-h-[480px] lg:min-h-0 lg:h-full">
              <div className="border-b border-line px-5 py-3">
                <p className="font-display font-semibold text-[14px] text-ink">{active.subject}</p>
                <p className="text-[12px] text-muted mt-0.5">
                  {active.participants.map((p) => p.name).join(" · ")}
                  {active.studentName ? ` — about ${active.studentName}` : ""}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {loadingMessages ? (
                  <>
                    <Skeleton className="h-16 w-3/4" />
                    <Skeleton className="h-16 w-2/3 ml-auto" />
                  </>
                ) : (
                  messages.map((m) => {
                    const mine = m.senderId === user?.id || (isSchoolSide && m.senderRole === role);
                    return (
                      <div key={m.id} className={cn("flex flex-col max-w-[70%]", mine ? "ml-auto items-end" : "items-start")}>
                        <div
                          className={cn(
                            "rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed",
                            mine ? "bg-primary text-white rounded-br-md" : "bg-paper border border-line text-ink rounded-bl-md",
                          )}
                        >
                          {m.body}
                        </div>
                        <span className="text-[11px] text-faint mt-1 px-1">
                          {mine ? "You" : m.senderName} · {formatDateTime(m.sentAt)}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-line px-4 py-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (draft.trim()) send.mutate(draft.trim());
                    }
                  }}
                  rows={1}
                  placeholder="Write a message…"
                  aria-label="Message"
                  className="flex-1 resize-none rounded-(--radius-ctl) border border-line-strong bg-surface px-3 py-2 text-[13px] placeholder:text-faint focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 max-h-32"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || send.isPending}
                  aria-label="Send"
                  className="flex size-9 shrink-0 items-center justify-center rounded-(--radius-ctl) bg-primary text-white hover:bg-primary-deep disabled:opacity-50 transition-colors"
                >
                  <Send className="size-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </PageTransition>
  );
}
