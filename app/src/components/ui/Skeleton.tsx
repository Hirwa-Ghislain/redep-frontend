import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-ink/8", className)} aria-hidden />;
}

/** Full-card loading placeholder for dashboard grids. */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-surface border border-line rounded-(--radius-card) p-5", className)}>
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-7 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}
