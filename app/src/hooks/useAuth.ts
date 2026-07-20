import { useAuthStore } from "@/stores/authStore";
import { primaryRole, PORTAL_HOME } from "@/config/roles";
import type { RoleKey, User } from "@/types";

export interface AuthInfo {
  user: User | null;
  /** The role context the portal renders under. */
  role: RoleKey | null;
  portalHome: string;
  isAuthenticated: boolean;
}

export function useAuth(): AuthInfo {
  const session = useAuthStore((s) => s.session);
  const activeRole = useAuthStore((s) => s.activeRole);
  const user = session?.user ?? null;
  const role = user ? (activeRole && user.roles.includes(activeRole) ? activeRole : primaryRole(user.roles)) : null;
  return {
    user,
    role,
    portalHome: role ? PORTAL_HOME[role] : "/login",
    isAuthenticated: Boolean(user),
  };
}

/** Permission gate. SYSTEM_ADMIN implicitly passes every check. */
export function usePermission() {
  const { user, role } = useAuth();
  const has = (permission?: string): boolean => {
    if (!permission) return true;
    if (!user) return false;
    if (role === "SYSTEM_ADMIN") return true;
    return user.permissions.includes(permission);
  };
  const hasAny = (...permissions: string[]) => permissions.some((p) => has(p));
  return { has, hasAny };
}
