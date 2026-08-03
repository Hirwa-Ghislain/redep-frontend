import { Badge } from "./Badge";
import type { User } from "@/types";

/**
 * Renders a `User.status`. Mock-mode accounts are always "ACTIVE"/"SUSPENDED"; live accounts can
 * also be "PENDING_VERIFICATION" (OTP not yet confirmed) or "DEACTIVATED" (self-closed).
 */
export function UserStatusBadge({ status }: { status: User["status"] }) {
  if (status === "SUSPENDED") return <Badge variant="danger" dot>Suspended</Badge>;
  if (status === "PENDING_VERIFICATION") return <Badge variant="warning" dot>Pending verification</Badge>;
  if (status === "DEACTIVATED") return <Badge variant="neutral" dot>Deactivated</Badge>;
  return <Badge variant="success" dot>Active</Badge>;
}
