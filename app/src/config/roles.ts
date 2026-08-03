import type { BackendRole, BackendUser, RoleKey, User } from "@/types";
import {
  ALL_MINISTRY_PERMISSIONS,
  ALL_PLATFORM_PERMISSIONS,
  ALL_SCHOOL_PERMISSIONS,
  P,
} from "./permissions";

/**
 * The backend's `ACCOUNTANT` role is fixed (not a composed custom role) and is only
 * authorized, server-side, for fee/payment/accounting reads and staff invitations —
 * this mirrors that exactly rather than granting the full `SCHOOL_ADMIN` permission set.
 */
const ACCOUNTANT_PERMISSIONS: PermissionKeyList = [
  P.SCHOOL_DASHBOARD_VIEW,
  P.FEES_VIEW,
  P.PAYMENTS_VIEW,
  P.ACCOUNTING_VIEW,
  P.ACCOUNTING_EXPORT,
  P.STUDENTS_VIEW,
  P.STAFF_VIEW,
];
type PermissionKeyList = Array<(typeof P)[keyof typeof P]>;

export const ROLE_LABELS: Record<RoleKey, string> = {
  SYSTEM_ADMIN: "System Administrator",
  MINISTRY_ADMIN: "Education Authority",
  SCHOOL_ADMIN: "School Administrator",
  SCHOOL_STAFF: "School Staff",
  TEACHER: "Teacher",
  APPLICANT: "Job Applicant",
  PARENT: "Parent",
};

/** Where each role lands after login (and the portal route prefix). */
export const PORTAL_HOME: Record<RoleKey, string> = {
  SYSTEM_ADMIN: "/admin",
  MINISTRY_ADMIN: "/ministry",
  SCHOOL_ADMIN: "/school",
  SCHOOL_STAFF: "/school",
  TEACHER: "/teacher",
  APPLICANT: "/applicant",
  PARENT: "/parent",
};

/** Default permission sets for the built-in roles (SCHOOL_STAFF gets a custom set per user). */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleKey, string[]> = {
  SYSTEM_ADMIN: [...ALL_PLATFORM_PERMISSIONS, ...ALL_MINISTRY_PERMISSIONS],
  MINISTRY_ADMIN: [...ALL_MINISTRY_PERMISSIONS],
  SCHOOL_ADMIN: [...ALL_SCHOOL_PERMISSIONS],
  SCHOOL_STAFF: [], // resolved from the user's custom role at login
  TEACHER: [],
  APPLICANT: [],
  PARENT: [],
};

/** Priority when a user holds multiple roles — highest wins for the default portal. */
export const ROLE_PRIORITY: RoleKey[] = [
  "SYSTEM_ADMIN",
  "MINISTRY_ADMIN",
  "SCHOOL_ADMIN",
  "SCHOOL_STAFF",
  "TEACHER",
  "PARENT",
  "APPLICANT",
];

export function primaryRole(roles: RoleKey[]): RoleKey {
  return ROLE_PRIORITY.find((r) => roles.includes(r)) ?? "PARENT";
}

/**
 * The backend's `Role` enum doesn't line up 1:1 with the frontend's `RoleKey`:
 * `SUPER_ADMIN` → `SYSTEM_ADMIN`, `EDUCATION_AUTHORITY` → `MINISTRY_ADMIN`, and
 * `ACCOUNTANT` (a fixed school-staff role) → `SCHOOL_STAFF` (the frontend's generic
 * "school staff" concept — there is no custom per-school role catalog server-side).
 */
const BACKEND_TO_FRONTEND_ROLE: Record<BackendRole, RoleKey> = {
  SUPER_ADMIN: "SYSTEM_ADMIN",
  EDUCATION_AUTHORITY: "MINISTRY_ADMIN",
  SCHOOL_ADMIN: "SCHOOL_ADMIN",
  ACCOUNTANT: "SCHOOL_STAFF",
  TEACHER: "TEACHER",
  APPLICANT: "APPLICANT",
  PARENT: "PARENT",
};

const ACCOUNTANT_STAFF_LABEL = "Accountant";

export function mapBackendRoles(roles: BackendRole[]): RoleKey[] {
  return Array.from(new Set(roles.map((role) => BACKEND_TO_FRONTEND_ROLE[role])));
}

/** Builds the frontend `User` from the backend's auth-endpoint user payload. */
export function mapBackendUser(user: BackendUser): User {
  const roles = mapBackendRoles(user.roles);
  const permissions = Array.from(
    new Set(
      roles.flatMap((role) =>
        role === "SCHOOL_STAFF" && user.roles.includes("ACCOUNTANT")
          ? ACCOUNTANT_PERMISSIONS
          : DEFAULT_ROLE_PERMISSIONS[role],
      ),
    ),
  );
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone ?? "",
    roles,
    permissions,
    ...(user.schoolId ? { schoolId: user.schoolId } : {}),
    ...(user.roles.includes("ACCOUNTANT") ? { staffRoleName: ACCOUNTANT_STAFF_LABEL } : {}),
    status: user.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
    createdAt: user.createdAt,
  };
}
