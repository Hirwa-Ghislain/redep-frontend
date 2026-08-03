import type {
  Announcement,
  AnnouncementCategory,
  AppNotification,
  Message,
  MessageThread,
  RoleKey,
  ThreadParticipant,
} from "@/types";
import { db, nowIso, simulate, snapshot } from "@/mocks/db";
import { uid } from "@/lib/utils";
import { http, USE_MOCKS } from "@/lib/api/client";

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
    if (USE_MOCKS) {
      const audienceMap: Partial<Record<RoleKey, Announcement["audience"][]>> = {
        PARENT: ["ALL", "PARENTS"],
        TEACHER: ["ALL", "TEACHERS"],
        SCHOOL_ADMIN: ["ALL", "PARENTS", "TEACHERS", "STAFF", "SCHOOLS"],
        SCHOOL_STAFF: ["ALL", "STAFF", "SCHOOLS"],
        MINISTRY_ADMIN: ["ALL", "SCHOOLS"],
        SYSTEM_ADMIN: ["ALL", "PARENTS", "TEACHERS", "STAFF", "SCHOOLS"],
      };
      const audiences = audienceMap[opts.audience] ?? ["ALL"];
      const out = db.announcements.filter((a) => {
        const inScope = a.schoolId === null || opts.schoolIds.includes(a.schoolId);
        return inScope && audiences.includes(a.audience);
      });
      return simulate(
        snapshot(out.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.publishedAt.localeCompare(a.publishedAt))),
      );
    }
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
    if (USE_MOCKS) {
      return simulate(
        snapshot(
          db.announcements
            .filter((a) => a.schoolId === schoolId)
            .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
        ),
      );
    }
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
    if (USE_MOCKS) {
      const ann: Announcement = { ...input, id: uid("ann"), pinned: input.pinned ?? false, publishedAt: nowIso() };
      db.announcements.unshift(ann);
      return simulate(snapshot(ann));
    }
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

  // DELETE /api/v1/announcements/:id
  async removeAnnouncement(id: string): Promise<void> {
    const i = db.announcements.findIndex((a) => a.id === id);
    if (i >= 0) db.announcements.splice(i, 1);
    return simulate(undefined);
  },

  // GET /api/v1/users/:id/threads  |  live: GET /api/v1/messaging/threads (auth-scoped)
  async threadsFor(userId: string): Promise<MessageThread[]> {
    if (USE_MOCKS) {
      return simulate(
        snapshot(
          db.threads
            .filter((t) => t.participants.some((p) => p.id === userId))
            .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
        ),
      );
    }
    const res = await http.get<{ threads: BackendThreadSummary[] }>("/messaging/threads");
    return res.threads.map(threadFromBackend);
  },

  /** School-office inbox: all threads that include any school-side participant. */
  async threadsForSchool(schoolId: string): Promise<MessageThread[]> {
    if (USE_MOCKS) {
      return simulate(
        snapshot(
          db.threads.filter((t) => t.schoolId === schoolId).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
        ),
      );
    }
    // Live: the backend scopes /messaging/threads to the caller's own school via
    // administratorId/staff membership — no explicit schoolId filter needed or accepted.
    const res = await http.get<{ threads: BackendThreadSummary[] }>("/messaging/threads");
    return res.threads.map(threadFromBackend);
  },

  // GET /api/v1/threads/:id/messages  |  live: GET /api/v1/messaging/threads/:id
  async messages(threadId: string): Promise<Message[]> {
    if (USE_MOCKS) {
      return simulate(
        snapshot(db.messages.filter((m) => m.threadId === threadId).sort((a, b) => a.sentAt.localeCompare(b.sentAt))),
        250,
      );
    }
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
    if (USE_MOCKS) {
      const thread = db.threads.find((t) => t.id === input.threadId);
      if (!thread) throw { code: "NOT_FOUND", message: "Thread not found.", status: 404 };
      const msg: Message = { ...input, id: uid("msg"), sentAt: nowIso() };
      db.messages.push(msg);
      thread.lastMessageAt = msg.sentAt;
      thread.lastMessagePreview = msg.body.slice(0, 80);
      for (const p of thread.participants) {
        if (p.id === input.senderId) continue;
        db.notifications.unshift({
          id: uid("nt"), userId: p.id, type: "MESSAGE",
          title: `New message from ${input.senderName}`, body: thread.subject,
          read: false, createdAt: msg.sentAt,
          link: p.role === "PARENT" ? "/parent/messages" : p.role === "TEACHER" ? "/teacher/messages" : "/school/messages",
        });
      }
      return simulate(snapshot(msg), 300);
    }
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
    if (USE_MOCKS) {
      const thread: MessageThread = {
        id: uid("th"), subject: input.subject, schoolId: input.schoolId,
        studentId: input.studentId, studentName: input.studentName,
        participants: input.participants, lastMessageAt: nowIso(),
        lastMessagePreview: input.firstMessage.body.slice(0, 80), unreadCount: 0,
      };
      db.threads.unshift(thread);
      await this.send({ threadId: thread.id, ...input.firstMessage });
      return simulate(snapshot(db.threads.find((t) => t.id === thread.id)!));
    }
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

  // GET /api/v1/users/:id/notifications
  async notifications(userId: string): Promise<AppNotification[]> {
    return simulate(
      snapshot(
        db.notifications.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      ),
      200,
    );
  },

  // POST /api/v1/notifications/mark-read
  async markNotificationsRead(userId: string, ids?: string[]): Promise<void> {
    for (const n of db.notifications) {
      if (n.userId === userId && (!ids || ids.includes(n.id))) n.read = true;
    }
    return simulate(undefined, 120);
  },
};
