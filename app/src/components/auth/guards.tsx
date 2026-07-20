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
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
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
