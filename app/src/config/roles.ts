import type { RoleKey } from "@/types";
import {
  ALL_MINISTRY_PERMISSIONS,
  ALL_PLATFORM_PERMISSIONS,
  ALL_SCHOOL_PERMISSIONS,
} from "./permissions";

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
