import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { RoleKey } from "@/types";
import { useAuth, usePermission } from "@/hooks/useAuth";

/**
 * Route guard. Unauthenticated → /login (preserving the intended destination).
 * Authenticated but with a different role → their own portal home.
 */
export function ProtectedRoute({ allow }: { allow: RoleKey[] }) {
  const { isAuthenticated, role, portalHome } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Preserve the query string so demo deep-links (`?as=…`) survive the redirect.
    return <Navigate to={{ pathname: "/login", search: location.search }} state={{ from: location.pathname }} replace />;
  }
  if (!role || !allow.includes(role)) {
    return <Navigate to={portalHome} replace />;
  }
  return <Outlet />;
}

/** Landing redirect: `/` → portal home or login. */
export function RoleRedirect() {
  const { isAuthenticated, portalHome } = useAuth();
  return <Navigate to={isAuthenticated ? portalHome : "/login"} replace />;
}

/**
 * Guards the School portal: a self-registered SCHOOL_ADMIN has an account but no `schoolId`
 * until they complete their school's profile (`POST /schools`) — send them there first instead
 * of letting every school-scoped page 404/crash on a missing school.
 */
export function RequireSchool() {
  const { user } = useAuth();
  if (user && !user.schoolId) {
    return <Navigate to="/school-onboarding" replace />;
  }
  return <Outlet />;
}

/**
 * Permission gate for UI fragments. Renders `fallback` (default: nothing)
 * when the user lacks the permission. UI-gating only — the backend re-checks.
 */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { has } = usePermission();
  return has(permission) ? <>{children}</> : <>{fallback}</>;
}
