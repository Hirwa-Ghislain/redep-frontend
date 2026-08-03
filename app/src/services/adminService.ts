import type {
  AdminSchoolRecord,
  AuditLogEntry,
  BackendRole,
  RoleKey,
  SchoolOnboardingRequest,
  User,
} from "@/types";
import { db, nowIso, simulate, snapshot } from "@/mocks/db";
import { uid } from "@/lib/utils";
import { http, USE_MOCKS } from "@/lib/api/client";
import { mapBackendRoles } from "@/config/roles";

export interface PlatformKpis {
  totalUsers: number;
  parents: number;
  teachers: number;
  applicants: number;
  activeSchools: number;
  /** No onboarding-review queue on the real backend (schools self-activate) — always 0 there. */
  pendingOnboarding: number;
  /** No daily-payments aggregate exposed by `/admin/kpis` yet — always 0 there. */
  paymentsToday: number;
  /** No signup-trend analytics endpoint yet — always empty there. */
  monthlySignups: { month: string; users: number }[];
  /** Real-backend-only fields returned by `GET /admin/kpis`. */
  suspendedSchools?: number;
  totalEnrollments?: number;
  activeEnrollments?: number;
  openJobPostings?: number;
  /** Real-backend-only — full per-role headcount, used for the dashboard's "users by role" chart. */
  roleBreakdown?: { role: string; count: number }[];
}

/** A row in the admin "all schools" table. Mock and live sources expose materially different
 *  fields (see `AdminSchoolRecord`); anything the current source doesn't provide is `undefined`
 *  and rendered as "—" rather than guessed. */
export interface AdminSchoolRow {
  id: string;
  name: string;
  district: string;
  status: "ACTIVE" | "SUSPENDED";
  contactEmail: string;
  contactPhone: string;
  /** Real-backend-only. */
  administratorName?: string;
  createdAt?: string;
  /** Mock-only descriptive fields — not modeled by the real admin schools endpoint. */
  code?: string;
  type?: string;
  enrolled?: number;
  capacity?: number;
}

interface BackendKpis {
  totalSchools: number;
  activeSchools: number;
  suspendedSchools: number;
  totalUsers: number;
  usersByRole: Record<BackendRole, number>;
  totalEnrollments: number;
  activeEnrollments: number;
  openJobPostings: number;
}

const BACKEND_ROLE_LABEL: Record<BackendRole, string> = {
  SUPER_ADMIN: "System admins",
  SCHOOL_ADMIN: "School admins",
  TEACHER: "Teachers",
  ACCOUNTANT: "Accountants",
  PARENT: "Parents",
  APPLICANT: "Applicants",
  EDUCATION_AUTHORITY: "Ministry",
};

/** The frontend's `RoleKey` doesn't map 1:1 back onto the backend's `Role` enum (see
 *  `config/roles.ts`) — this is the reverse lookup, kept local to this service since it's only
 *  needed to build the `?role=` query param for `GET /admin/users`. */
const ROLE_KEY_TO_BACKEND: Partial<Record<RoleKey, BackendRole>> = {
  SYSTEM_ADMIN: "SUPER_ADMIN",
  MINISTRY_ADMIN: "EDUCATION_AUTHORITY",
  SCHOOL_ADMIN: "SCHOOL_ADMIN",
  SCHOOL_STAFF: "ACCOUNTANT",
  TEACHER: "TEACHER",
  APPLICANT: "APPLICANT",
  PARENT: "PARENT",
};

function mapBackendSchoolRow(s: AdminSchoolRecord): AdminSchoolRow {
  return {
    id: s.id,
    name: s.name,
    district: s.district,
    status: s.status,
    contactEmail: s.email ?? s.administrator?.email ?? "—",
    contactPhone: s.phone ?? "—",
    administratorName: s.administrator ? `${s.administrator.firstName} ${s.administrator.lastName}` : undefined,
    createdAt: s.createdAt,
  };
}

interface BackendAdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  createdAt: string;
  roles: BackendRole[];
}

function mapBackendAdminUser(u: BackendAdminUser): User {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: u.phone ?? "",
    roles: mapBackendRoles(u.roles),
    permissions: [],
    ...(u.roles.includes("ACCOUNTANT") ? { staffRoleName: "Accountant" } : {}),
    status: u.status,
    createdAt: u.createdAt,
  };
}

interface BackendAuditLog {
  id: string;
  action: string;
  outcome: "SUCCESS" | "FAILURE";
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  createdAt: string;
  actor: { firstName: string; lastName: string; email: string } | null;
}

function mapBackendAuditLog(entry: BackendAuditLog): AuditLogEntry {
  return {
    id: entry.id,
    actorName: entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : "System",
    actorEmail: entry.actor?.email,
    action: entry.action,
    target: entry.entityType ? `${entry.entityType}${entry.entityId ? ` #${entry.entityId.slice(0, 8)}` : ""}` : "—",
    detail: entry.outcome === "FAILURE" ? "Failed" : entry.ipAddress ? `IP ${entry.ipAddress}` : undefined,
    at: entry.createdAt,
  };
}

export interface MinistryAccountInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  nationalId: string;
  dateOfBirth: string; // yyyy-MM-dd
}

export interface BroadcastInput {
  title: string;
  message: string;
  audience: "ALL" | BackendRole;
  /** Mock-mode only — attributes the audit-log entry to the acting admin. */
  actor?: string;
}

export const adminService = {
  // GET /api/v1/admin/kpis
  async kpis(): Promise<PlatformKpis> {
    const roleCount = (role: RoleKey) => db.users.filter((u) => u.roles.includes(role)).length;
    if (USE_MOCKS) {
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
    }
    const data = await http.get<BackendKpis>("/admin/kpis");
    const roleBreakdown = (Object.entries(data.usersByRole) as [BackendRole, number][]).map(([role, count]) => ({
      role: BACKEND_ROLE_LABEL[role],
      count,
    }));
    return {
      totalUsers: data.totalUsers,
      parents: data.usersByRole.PARENT ?? 0,
      teachers: data.usersByRole.TEACHER ?? 0,
      applicants: data.usersByRole.APPLICANT ?? 0,
      activeSchools: data.activeSchools,
      pendingOnboarding: 0,
      paymentsToday: 0,
      monthlySignups: [],
      suspendedSchools: data.suspendedSchools,
      totalEnrollments: data.totalEnrollments,
      activeEnrollments: data.activeEnrollments,
      openJobPostings: data.openJobPostings,
      roleBreakdown,
    };
  },

  // GET /api/v1/admin/onboarding-requests — mock-only: the real backend has no onboarding-review
  // queue. A NESA-accredited school administrator creates their school directly via
  // `POST /schools` (see E-SHURI-backend school.service.ts `createSchool`) and it's immediately
  // active — there is no "request → admin verifies → activates" workflow to surface here.
  async onboardingRequests(): Promise<SchoolOnboardingRequest[]> {
    if (!USE_MOCKS) return [];
    return simulate(snapshot(db.onboardingRequests.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))));
  },

  /**
   * Resolve an onboarding request. Approving creates the School (PENDING profile
   * completion by its admin) and logs the action. Mock-only — see `onboardingRequests`.
   * POST /api/v1/admin/onboarding-requests/:id/resolve
   */
  async resolveOnboarding(id: string, action: "VERIFYING" | "APPROVED" | "REJECTED", actor: string): Promise<SchoolOnboardingRequest> {
    const request = db.onboardingRequests.find((r) => r.id === id);
    if (!request) throw { code: "NOT_FOUND", message: "Request not found.", status: 404 };
    request.status = action;
    if (action === "APPROVED") {
      db.schools.push({
        id: uid("sch"), name: request.schoolName, code: `NEW-${Math.floor(Math.random() * 900 + 100)}`,
        type: request.type, levels: ["PRIMARY"], district: request.district, sector: request.sector,
        description: "Profile pending completion by the school administrator.",
        foundedYear: new Date().getFullYear(), capacity: 0, enrolled: 0,
        feesRange: { min: 0, max: 0 }, facilities: [], achievements: [], photos: [],
        status: "ACTIVE", contactEmail: request.contactEmail, contactPhone: request.contactPhone,
        satisfactionScore: 0, boardingAvailable: false,
      });
    }
    db.auditLog.unshift({
      id: uid("aud"), actorName: actor, actorRole: "SYSTEM_ADMIN",
      action: `SCHOOL_${action}`, target: request.schoolName, at: nowIso(),
    });
    return simulate(snapshot(request));
  },

  // GET /api/v1/admin/schools?status=&search=
  async schools(opts: { status?: "ACTIVE" | "SUSPENDED"; search?: string } = {}): Promise<AdminSchoolRow[]> {
    if (USE_MOCKS) {
      let out = [...db.schools];
      if (opts.status) out = out.filter((s) => s.status === opts.status);
      if (opts.search) {
        const q = opts.search.toLowerCase();
        out = out.filter((s) => s.name.toLowerCase().includes(q));
      }
      return simulate(
        snapshot(out).map((s) => ({
          id: s.id, name: s.name, district: s.district,
          status: s.status === "PENDING" ? "ACTIVE" : s.status,
          contactEmail: s.contactEmail, contactPhone: s.contactPhone,
          code: s.code, type: s.type, enrolled: s.enrolled, capacity: s.capacity,
        })),
      );
    }
    const params = new URLSearchParams();
    if (opts.status) params.set("status", opts.status);
    if (opts.search) params.set("search", opts.search);
    const qs = params.toString();
    const res = await http.get<{ schools: AdminSchoolRecord[] }>(`/admin/schools${qs ? `?${qs}` : ""}`);
    return res.schools.map(mapBackendSchoolRow);
  },

  // PATCH /api/v1/admin/schools/:id/status
  async setSchoolStatus(id: string, status: "ACTIVE" | "SUSPENDED", actor: string): Promise<AdminSchoolRow> {
    if (USE_MOCKS) {
      const school = db.schools.find((s) => s.id === id);
      if (!school) throw { code: "NOT_FOUND", message: "School not found.", status: 404 };
      school.status = status;
      db.auditLog.unshift({
        id: uid("aud"), actorName: actor, actorRole: "SYSTEM_ADMIN",
        action: status === "SUSPENDED" ? "SCHOOL_SUSPENDED" : "SCHOOL_REACTIVATED", target: school.name, at: nowIso(),
      });
      return simulate({
        id: school.id, name: school.name, district: school.district, status,
        contactEmail: school.contactEmail, contactPhone: school.contactPhone,
        code: school.code, type: school.type, enrolled: school.enrolled, capacity: school.capacity,
      });
    }
    const res = await http.patch<{ school: AdminSchoolRecord }>(`/admin/schools/${id}/status`, { status });
    return mapBackendSchoolRow(res.school);
  },

  // GET /api/v1/admin/users?role=&q=&status=
  async users(opts: { role?: RoleKey; q?: string; status?: string } = {}): Promise<User[]> {
    if (USE_MOCKS) {
      let out = [...db.users];
      if (opts.role) out = out.filter((u) => u.roles.includes(opts.role!));
      if (opts.q) {
        const q = opts.q.toLowerCase();
        out = out.filter((u) => `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
      }
      return simulate(snapshot(out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
    }
    const params = new URLSearchParams();
    if (opts.role) {
      const backendRole = ROLE_KEY_TO_BACKEND[opts.role];
      if (backendRole) params.set("role", backendRole);
    }
    if (opts.q) params.set("q", opts.q);
    if (opts.status) params.set("status", opts.status);
    const qs = params.toString();
    const res = await http.get<{ users: BackendAdminUser[] }>(`/admin/users${qs ? `?${qs}` : ""}`);
    return res.users.map(mapBackendAdminUser);
  },

  // PATCH /api/v1/admin/users/:id/status
  // Returns only `{ id, status }` on the real backend — callers should use the `User` they
  // already have in hand for display text (name/email), not this method's return value.
  async setUserStatus(id: string, status: "ACTIVE" | "SUSPENDED", actor: string): Promise<{ id: string; status: "ACTIVE" | "SUSPENDED" }> {
    if (USE_MOCKS) {
      const user = db.users.find((u) => u.id === id);
      if (!user) throw { code: "NOT_FOUND", message: "User not found.", status: 404 };
      user.status = status;
      db.auditLog.unshift({
        id: uid("aud"), actorName: actor, actorRole: "SYSTEM_ADMIN",
        action: status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_REACTIVATED",
        target: user.email, at: nowIso(),
      });
      return simulate({ id: user.id, status });
    }
    const res = await http.patch<{ user: { id: string; status: "ACTIVE" | "SUSPENDED" } }>(`/admin/users/${id}/status`, { status });
    return res.user;
  },

  // GET /api/v1/admin/audit?q=&action=
  async auditLog(q?: string): Promise<AuditLogEntry[]> {
    if (USE_MOCKS) {
      let out = [...db.auditLog];
      if (q) {
        const s = q.toLowerCase();
        out = out.filter(
          (e) => e.action.toLowerCase().includes(s) || e.target.toLowerCase().includes(s) || e.actorName.toLowerCase().includes(s),
        );
      }
      return simulate(snapshot(out.sort((a, b) => b.at.localeCompare(a.at))));
    }
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const qs = params.toString();
    const res = await http.get<{ logs: BackendAuditLog[] }>(`/admin/audit${qs ? `?${qs}` : ""}`);
    return res.logs.map(mapBackendAuditLog);
  },

  // POST /api/v1/admin/ministry-accounts
  // Creates a PENDING_VERIFICATION EDUCATION_AUTHORITY account; the invitee verifies themselves
  // via the OTP sent to their email/phone (same `/auth/verify-account` flow as self-registration)
  // — this call does not return a usable session.
  async createMinistryAccount(input: MinistryAccountInput): Promise<{ user: Pick<User, "id" | "firstName" | "lastName" | "email" | "phone"> }> {
    if (USE_MOCKS) {
      const email = input.email.trim().toLowerCase();
      if (db.users.some((u) => u.email.toLowerCase() === email)) {
        await simulate(null, 400);
        throw { code: "ACCOUNT_ALREADY_EXISTS", message: "An account with the supplied information already exists.", status: 409 };
      }
      const user: User = {
        id: uid("u"), firstName: input.firstName, lastName: input.lastName, email,
        phone: input.phone, roles: ["MINISTRY_ADMIN"], permissions: [],
        status: "PENDING_VERIFICATION", createdAt: nowIso(),
      };
      db.users.push(user);
      db.auditLog.unshift({
        id: uid("aud"), actorName: "System admin", actorRole: "SYSTEM_ADMIN",
        action: "ADMIN_MINISTRY_ACCOUNT_CREATED", target: email, at: nowIso(),
      });
      return simulate({ user: snapshot(user) });
    }
    return http.post<{ user: Pick<User, "id" | "firstName" | "lastName" | "email" | "phone"> }>("/admin/ministry-accounts", input);
  },

  // GET /api/v1/admin/ministry-accounts
  async listMinistryAccounts(): Promise<User[]> {
    if (USE_MOCKS) {
      return simulate(
        snapshot(db.users.filter((u) => u.roles.includes("MINISTRY_ADMIN")).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
      );
    }
    const res = await http.get<{ accounts: BackendAdminUser[] }>("/admin/ministry-accounts");
    return res.accounts.map(mapBackendAdminUser);
  },

  /** National broadcast → creates a `Notification` for every matching account. POST /api/v1/admin/broadcast */
  async sendBroadcast(input: BroadcastInput): Promise<{ recipientCount: number }> {
    if (USE_MOCKS) {
      const roleKeys = input.audience === "ALL" ? null : mapBackendRoles([input.audience]);
      const recipients = roleKeys === null ? db.users : db.users.filter((u) => roleKeys.some((r) => u.roles.includes(r)));
      for (const u of recipients) {
        db.notifications.unshift({
          id: uid("nt"), userId: u.id, type: "ANNOUNCEMENT", title: input.title, body: input.message,
          read: false, createdAt: nowIso(),
        });
      }
      db.auditLog.unshift({
        id: uid("aud"), actorName: input.actor ?? "System admin", actorRole: "SYSTEM_ADMIN",
        action: "ADMIN_BROADCAST_SENT", target: `Audience: ${input.audience}`, detail: input.title, at: nowIso(),
      });
      return simulate({ recipientCount: recipients.length }, 500);
    }
    return http.post<{ recipientCount: number }>("/admin/broadcast", {
      title: input.title,
      message: input.message,
      audience: input.audience,
    });
  },
};
