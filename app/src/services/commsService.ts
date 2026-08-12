import type {
  Announcement,
  AnnouncementCategory,
  AppNotification,
  Message,
  MessageThread,
  NotificationType,
  RoleKey,
  ThreadParticipant,
} from "@/types";
import { http } from "@/lib/api/client";

interface BackendCommunication {
  id: string;
  schoolId: string;
  classId: string | null;
  title: string;
  message: string;
  createdAt: string;
  school: { id: string; name: string };
  schoolClass: { id: string; name: string } | null;
  audience: "SCHOOL" | "CLASS";
}

/* ------------------------------------------------------------------------ */
/* Real messaging backend shapes — POST/GET /api/v1/messaging/* (parent ⇄    */
/* school-administration only; see messaging.service.ts on the backend).    */
/* ------------------------------------------------------------------------ */

interface BackendThreadSummary {
  id: string;
  subject: string;
  schoolId: string;
  schoolName: string;
  parentId: string;
  parentName: string;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  unreadCount: number;
}

interface BackendThreadMessage {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
}

interface BackendThreadDetail extends Omit<BackendThreadSummary, "lastMessageAt" | "lastMessagePreview" | "unreadCount"> {
  createdAt: string;
  updatedAt: string;
  messages: BackendThreadMessage[];
}

interface BackendNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

function notificationFromBackend(n: BackendNotification): AppNotification {
  const link = typeof n.metadata?.link === "string" ? n.metadata.link : undefined;
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    body: n.message,
    read: n.readAt !== null,
    createdAt: n.createdAt,
    link,
  };
}

function threadFromBackend(t: BackendThreadSummary): MessageThread {
  return {
    id: t.id,
    subject: t.subject,
    schoolId: t.schoolId,
    participants: [
      { id: t.parentId, name: t.parentName, role: "PARENT" },
      { id: t.schoolId, name: t.schoolName, role: "SCHOOL_ADMIN" },
    ],
    lastMessageAt: t.lastMessageAt,
    lastMessagePreview: t.lastMessagePreview ?? "",
    unreadCount: t.unreadCount,
  };
}

export const commsService = {
  /**
   * Announcements visible to a user: their schools' posts (audience-matched)
   * plus national posts. GET /api/v1/announcements?scope=…
   *
   * Live backend: only `GET /parents/communications` exists (school + class notices for a
   * parent's enrolled children — see `parentCommunications` in parent.service.ts). There is no
   * equivalent read endpoint for teachers/ministry/admin, so those roles get an empty feed
   * here rather than a fabricated one — the pages that render a full feed for those roles show
   * an explicit "under development" state instead of calling this at all.
   */
  async announcementsFor(opts: { schoolIds: string[]; audience: RoleKey }): Promise<Announcement[]> {
    if (opts.audience !== "PARENT") return [];
    const res = await http.get<{ communications: BackendCommunication[] }>("/parents/communications");
    return res.communications.map((c) => ({
      id: c.id,
      schoolId: c.schoolId,
      title: c.title,
      body: c.message,
      category: "GENERAL",
      audience: "PARENTS",
      authorName: c.school.name + (c.schoolClass ? ` — ${c.schoolClass.name}` : ""),
      publishedAt: c.createdAt,
      pinned: false,
    }));
  },

  /**
   * GET /api/v1/schools/:id/announcements (management view — everything the school posted).
   * Live backend gap: `school.routes.ts` only exposes `POST /schools/:schoolId/communications`
   * (publish) — there is no matching GET for the school's own communication history, so this
   * always returns an empty list in live mode. `AnnouncementsPage` shows the compose form as
   * fully live and marks the history list underneath as limited rather than faking entries.
   */
  async announcementsBySchool(schoolId: string): Promise<Announcement[]> {
    return [];
  },

  // POST /api/v1/announcements  |  live: POST /schools/:schoolId/communications
  // Real payload only accepts { title, message, classId? } — no category/audience/pinned fields
  // exist on the backend, so those are mock-only conveniences (AnnouncementsPage drops the
  // controls in live mode instead of pretending they do something).
  async publishAnnouncement(input: {
    schoolId: string | null;
    title: string;
    body: string;
    category: AnnouncementCategory;
    audience: Announcement["audience"];
    authorName: string;
    pinned?: boolean;
    classId?: string | null;
  }): Promise<Announcement> {
    if (!input.schoolId) throw { code: "VALIDATION", message: "A school is required.", status: 400 };
    const res = await http.post<{ communication: { id: string; title: string; message: string; audience: "SCHOOL" | "CLASS"; createdAt: string; recipientParents: number } }>(
      `/schools/${input.schoolId}/communications`,
      { title: input.title, message: input.body, ...(input.classId ? { classId: input.classId } : {}) },
    );
    return {
      id: res.communication.id,
      schoolId: input.schoolId,
      title: res.communication.title,
      body: res.communication.message,
      category: "GENERAL",
      audience: res.communication.audience === "CLASS" ? "PARENTS" : "ALL",
      authorName: input.authorName,
      publishedAt: res.communication.createdAt,
      pinned: false,
    };
  },

  // GET /api/v1/users/:id/threads  |  live: GET /api/v1/messaging/threads (auth-scoped)
  async threadsFor(userId: string): Promise<MessageThread[]> {
    const res = await http.get<{ threads: BackendThreadSummary[] }>("/messaging/threads");
    return res.threads.map(threadFromBackend);
  },

  /** School-office inbox: all threads that include any school-side participant. */
  async threadsForSchool(schoolId: string): Promise<MessageThread[]> {
    // Live: the backend scopes /messaging/threads to the caller's own school via
    // administratorId/staff membership — no explicit schoolId filter needed or accepted.
    const res = await http.get<{ threads: BackendThreadSummary[] }>("/messaging/threads");
    return res.threads.map(threadFromBackend);
  },

  // GET /api/v1/threads/:id/messages  |  live: GET /api/v1/messaging/threads/:id
  async messages(threadId: string): Promise<Message[]> {
    const res = await http.get<{ thread: BackendThreadDetail }>(`/messaging/threads/${threadId}`);
    return res.thread.messages.map((m) => ({
      id: m.id,
      threadId,
      senderId: m.senderId,
      senderName: m.senderName,
      senderRole: m.senderId === res.thread.parentId ? "PARENT" : "SCHOOL_ADMIN",
      body: m.body,
      sentAt: m.createdAt,
    }));
  },

  // POST /api/v1/threads/:id/messages  |  live: POST /api/v1/messaging/threads/:id/messages
  async send(input: { threadId: string; senderId: string; senderName: string; senderRole: RoleKey; body: string }): Promise<Message> {
    const res = await http.post<{ message: BackendThreadMessage }>(`/messaging/threads/${input.threadId}/messages`, {
      message: input.body,
    });
    return {
      id: res.message.id,
      threadId: input.threadId,
      senderId: res.message.senderId,
      senderName: res.message.senderName,
      senderRole: input.senderRole,
      body: res.message.body,
      sentAt: res.message.createdAt,
    };
  },

  // POST /api/v1/threads  |  live: POST /api/v1/messaging/threads (PARENT only)
  async startThread(input: {
    subject: string;
    schoolId: string;
    studentId?: string;
    studentName?: string;
    participants: ThreadParticipant[];
    firstMessage: { senderId: string; senderName: string; senderRole: RoleKey; body: string };
  }): Promise<MessageThread> {
    const res = await http.post<{ thread: BackendThreadDetail }>("/messaging/threads", {
      schoolId: input.schoolId,
      subject: input.subject,
      message: input.firstMessage.body,
    });
    return threadFromBackend({
      id: res.thread.id,
      subject: res.thread.subject,
      schoolId: res.thread.schoolId,
      schoolName: res.thread.schoolName,
      parentId: res.thread.parentId,
      parentName: res.thread.parentName,
      lastMessageAt: res.thread.updatedAt,
      lastMessagePreview: res.thread.messages.at(-1)?.body ?? null,
      unreadCount: 0,
    });
  },

  // GET /api/v1/notifications — auth-scoped, no userId param needed server-side.
  async notifications(): Promise<AppNotification[]> {
    const res = await http.get<{ notifications: BackendNotification[] }>("/notifications");
    return res.notifications.map(notificationFromBackend);
  },

  // PATCH /api/v1/notifications/read-all | PATCH /api/v1/notifications/:id/read
  async markNotificationsRead(ids?: string[]): Promise<void> {
    if (!ids || ids.length === 0) {
      await http.patch("/notifications/read-all");
      return;
    }
    await Promise.all(ids.map((id) => http.patch(`/notifications/${id}/read`)));
  },
};
