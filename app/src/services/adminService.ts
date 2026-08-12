import type {
  AdminSchoolRecord,
  AuditLogEntry,
  BackendRole,
  RoleKey,
  User,
} from "@/types";
import { http } from "@/lib/api/client";
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

  // GET /api/v1/admin/schools?status=&search=
  async schools(opts: { status?: "ACTIVE" | "SUSPENDED"; search?: string } = {}): Promise<AdminSchoolRow[]> {
    const params = new URLSearchParams();
    if (opts.status) params.set("status", opts.status);
    if (opts.search) params.set("search", opts.search);
    const qs = params.toString();
    const res = await http.get<{ schools: AdminSchoolRecord[] }>(`/admin/schools${qs ? `?${qs}` : ""}`);
    return res.schools.map(mapBackendSchoolRow);
  },

  // PATCH /api/v1/admin/schools/:id/status
  async setSchoolStatus(id: string, status: "ACTIVE" | "SUSPENDED", actor: string): Promise<AdminSchoolRow> {
    const res = await http.patch<{ school: AdminSchoolRecord }>(`/admin/schools/${id}/status`, { status });
    return mapBackendSchoolRow(res.school);
  },

  // GET /api/v1/admin/users?role=&q=&status=
  async users(opts: { role?: RoleKey; q?: string; status?: string } = {}): Promise<User[]> {
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
    const res = await http.patch<{ user: { id: string; status: "ACTIVE" | "SUSPENDED" } }>(`/admin/users/${id}/status`, { status });
    return res.user;
  },

  // GET /api/v1/admin/audit?q=&action=
  async auditLog(q?: string): Promise<AuditLogEntry[]> {
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
    return http.post<{ user: Pick<User, "id" | "firstName" | "lastName" | "email" | "phone"> }>("/admin/ministry-accounts", input);
  },

  // GET /api/v1/admin/ministry-accounts
  async listMinistryAccounts(): Promise<User[]> {
    const res = await http.get<{ accounts: BackendAdminUser[] }>("/admin/ministry-accounts");
    return res.accounts.map(mapBackendAdminUser);
  },

  /** National broadcast → creates a `Notification` for every matching account. POST /api/v1/admin/broadcast */
  async sendBroadcast(input: BroadcastInput): Promise<{ recipientCount: number }> {
    return http.post<{ recipientCount: number }>("/admin/broadcast", {
      title: input.title,
      message: input.message,
      audience: input.audience,
    });
  },
};
