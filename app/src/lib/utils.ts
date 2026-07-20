/** Join class names, skipping falsy values. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Stable pseudo-random reference codes for payments/receipts. */
export function refCode(prefix: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${out}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function groupBy<T, K extends string | number>(items: T[], key: (item: T) => K): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const k = key(item);
      (acc[k] ??= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}
