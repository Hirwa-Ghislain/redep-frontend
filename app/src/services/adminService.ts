import type { AuditLogEntry, RoleKey, School, SchoolOnboardingRequest, User } from "@/types";
import { db, nowIso, simulate, snapshot } from "@/mocks/db";
import { uid } from "@/lib/utils";

export interface PlatformKpis {
  totalUsers: number;
  parents: number;
  teachers: number;
  applicants: number;
  activeSchools: number;
  pendingOnboarding: number;
  paymentsToday: number;
  monthlySignups: { month: string; users: number }[];
}

export const adminService = {
  // GET /api/v1/admin/kpis
  async kpis(): Promise<PlatformKpis> {
    const roleCount = (role: RoleKey) => db.users.filter((u) => u.roles.includes(role)).length;
    return simulate({
      totalUsers: db.users.length,
      parents: roleCount("PARENT"),
      teachers: roleCount("TEACHER"),
      applicants: roleCount("APPLICANT"),
      activeSchools: db.schools.filter((s) => s.status === "ACTIVE").length,
      pendingOnboarding: db.onboardingRequests.filter((r) => r.status === "PENDING" || r.status === "VERIFYING").length,
      paymentsToday: db.payments.filter((p) => p.paidAt.slice(0, 10) === nowIso().slice(0, 10)).length,
      monthlySignups: [
        { month: "Feb", users: 1_240 }, { month: "Mar", users: 1_810 }, { month: "Apr", users: 2_260 },
        { month: "May", users: 3_020 }, { month: "Jun", users: 3_540 }, { month: "Jul", users: 2_890 },
      ],
    });
  },

  // GET /api/v1/admin/onboarding-requests
  async onboardingRequests(): Promise<SchoolOnboardingRequest[]> {
    return simulate(snapshot(db.onboardingRequests.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))));
  },

  /**
   * Resolve an onboarding request. Approving creates the School (PENDING profile
   * completion by its admin) and logs the action.
   * POST /api/v1/admin/onboarding-requests/:id/resolve
   */
  async resolveOnboarding(id: string, action: "VERIFYING" | "APPROVED" | "REJECTED", actor: string): Promise<SchoolOnboardingRequest> {
    const request = db.onboardingRequests.find((r) => r.id === id);
    if (!request) throw { code: "NOT_FOUND", message: "Request not found.", status: 404 };
    request.status = action;
    if (action === "APPROVED") {
      const school: School = {
        id: uid("sch"), name: request.schoolName, code: `NEW-${Math.floor(Math.random() * 900 + 100)}`,
        type: request.type, levels: ["PRIMARY"], district: request.district, sector: request.sector,
        description: "Profile pending completion by the school administrator.",
        foundedYear: new Date().getFullYear(), capacity: 0, enrolled: 0,
        feesRange: { min: 0, max: 0 }, facilities: [], achievements: [], photos: [],
        status: "ACTIVE", contactEmail: request.contactEmail, contactPhone: request.contactPhone,
        satisfactionScore: 0, boardingAvailable: false,
      };
      db.schools.push(school);
    }
    db.auditLog.unshift({
      id: uid("aud"), actorName: actor, actorRole: "SYSTEM_ADMIN",
      action: `SCHOOL_${action}`, target: request.schoolName, at: nowIso(),
    });
    return simulate(snapshot(request));
  },

  // GET /api/v1/admin/schools
  async schools(): Promise<School[]> {
    return simulate(snapshot(db.schools));
  },

  // POST /api/v1/admin/schools/:id/status
  async setSchoolStatus(id: string, status: School["status"], actor: string): Promise<School> {
    const school = db.schools.find((s) => s.id === id);
    if (!school) throw { code: "NOT_FOUND", message: "School not found.", status: 404 };
    school.status = status;
    db.auditLog.unshift({
      id: uid("aud"), actorName: actor, actorRole: "SYSTEM_ADMIN",
      action: status === "SUSPENDED" ? "SCHOOL_SUSPENDED" : "SCHOOL_REACTIVATED", target: school.name, at: nowIso(),
    });
    return simulate(snapshot(school));
  },

  // GET /api/v1/admin/users?role=&q=
  async users(opts: { role?: RoleKey; q?: string } = {}): Promise<User[]> {
    let out = [...db.users];
    if (opts.role) out = out.filter((u) => u.roles.includes(opts.role!));
    if (opts.q) {
      const q = opts.q.toLowerCase();
      out = out.filter((u) => `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return simulate(snapshot(out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
  },

  // POST /api/v1/admin/users/:id/status
  async setUserStatus(id: string, status: "ACTIVE" | "SUSPENDED", actor: string): Promise<User> {
    const user = db.users.find((u) => u.id === id);
    if (!user) throw { code: "NOT_FOUND", message: "User not found.", status: 404 };
    user.status = status;
    db.auditLog.unshift({
      id: uid("aud"), actorName: actor, actorRole: "SYSTEM_ADMIN",
      action: status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_REACTIVATED",
      target: user.email, at: nowIso(),
    });
    return simulate(snapshot(user));
  },

  // GET /api/v1/admin/audit?q=
  async auditLog(q?: string): Promise<AuditLogEntry[]> {
    let out = [...db.auditLog];
    if (q) {
      const s = q.toLowerCase();
      out = out.filter(
        (e) => e.action.toLowerCase().includes(s) || e.target.toLowerCase().includes(s) || e.actorName.toLowerCase().includes(s),
      );
    }
    return simulate(snapshot(out.sort((a, b) => b.at.localeCompare(a.at))));
  },

  /** National broadcast → announcement + notification fan-out. POST /api/v1/admin/broadcast */
  async broadcast(input: { title: string; body: string; audience: "ALL" | "PARENTS" | "TEACHERS" | "SCHOOLS"; actor: string }): Promise<void> {
    db.announcements.unshift({
      id: uid("ann"), schoolId: null, title: input.title, body: input.body,
      category: "GENERAL", audience: input.audience, authorName: "REDEP Platform",
      publishedAt: nowIso(), pinned: false,
    });
    db.auditLog.unshift({
      id: uid("aud"), actorName: input.actor, actorRole: "SYSTEM_ADMIN",
      action: "BROADCAST_SENT", target: `Audience: ${input.audience}`, detail: input.title, at: nowIso(),
    });
    return simulate(undefined, 600);
  },
};
