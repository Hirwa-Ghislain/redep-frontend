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

export const commsService = {
  /**
   * Announcements visible to a user: their schools' posts (audience-matched)
   * plus national posts. GET /api/v1/announcements?scope=…
   */
  async announcementsFor(opts: { schoolIds: string[]; audience: RoleKey }): Promise<Announcement[]> {
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
  },

  // GET /api/v1/schools/:id/announcements  (management view — everything the school posted)
  async announcementsBySchool(schoolId: string): Promise<Announcement[]> {
    return simulate(
      snapshot(
        db.announcements
          .filter((a) => a.schoolId === schoolId)
          .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
      ),
    );
  },

  // POST /api/v1/announcements
  async publishAnnouncement(input: {
    schoolId: string | null;
    title: string;
    body: string;
    category: AnnouncementCategory;
    audience: Announcement["audience"];
    authorName: string;
    pinned?: boolean;
  }): Promise<Announcement> {
    const ann: Announcement = { ...input, id: uid("ann"), pinned: input.pinned ?? false, publishedAt: nowIso() };
    db.announcements.unshift(ann);
    return simulate(snapshot(ann));
  },

  // DELETE /api/v1/announcements/:id
  async removeAnnouncement(id: string): Promise<void> {
    const i = db.announcements.findIndex((a) => a.id === id);
    if (i >= 0) db.announcements.splice(i, 1);
    return simulate(undefined);
  },

  // GET /api/v1/users/:id/threads
  async threadsFor(userId: string): Promise<MessageThread[]> {
    return simulate(
      snapshot(
        db.threads
          .filter((t) => t.participants.some((p) => p.id === userId))
          .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
      ),
    );
  },

  /** School-office inbox: all threads that include any school-side participant. */
  async threadsForSchool(schoolId: string): Promise<MessageThread[]> {
    return simulate(
      snapshot(
        db.threads.filter((t) => t.schoolId === schoolId).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
      ),
    );
  },

  // GET /api/v1/threads/:id/messages
  async messages(threadId: string): Promise<Message[]> {
    return simulate(
      snapshot(db.messages.filter((m) => m.threadId === threadId).sort((a, b) => a.sentAt.localeCompare(b.sentAt))),
      250,
    );
  },

  // POST /api/v1/threads/:id/messages
  async send(input: { threadId: string; senderId: string; senderName: string; senderRole: RoleKey; body: string }): Promise<Message> {
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
  },

  // POST /api/v1/threads
  async startThread(input: {
    subject: string;
    schoolId: string;
    studentId?: string;
    studentName?: string;
    participants: ThreadParticipant[];
    firstMessage: { senderId: string; senderName: string; senderRole: RoleKey; body: string };
  }): Promise<MessageThread> {
    const thread: MessageThread = {
      id: uid("th"), subject: input.subject, schoolId: input.schoolId,
      studentId: input.studentId, studentName: input.studentName,
      participants: input.participants, lastMessageAt: nowIso(),
      lastMessagePreview: input.firstMessage.body.slice(0, 80), unreadCount: 0,
    };
    db.threads.unshift(thread);
    await this.send({ threadId: thread.id, ...input.firstMessage });
    return simulate(snapshot(db.threads.find((t) => t.id === thread.id)!));
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
