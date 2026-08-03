import { Construction } from "lucide-react";
import { EmptyState, type EmptyStateProps } from "./EmptyState";

export interface UnderDevelopmentProps extends Partial<Pick<EmptyStateProps, "action" | "className">> {
  /** What's not available yet, e.g. "Custom permission roles". */
  title: string;
  /** Why — the real, honest reason (no invented capability). */
  description: string;
}

/**
 * Used instead of mock/dummy data for features the E-SHURI backend doesn't support yet
 * (see PLAN.md integration notes). Never invents fake data — just says so.
 */
export function UnderDevelopment({ title, description, action, className }: UnderDevelopmentProps) {
  return (
    <EmptyState
      icon={Construction}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}
