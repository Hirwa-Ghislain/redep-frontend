import type { TooltipProps } from "recharts";

/**
 * Shared tooltip: dark panel, text in text-tokens, series identity carried by a
 * small color chip beside the label (never by coloring the text itself).
 */
export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: TooltipProps<number, string> & { formatter?: (value: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ink-mist bg-ink px-3 py-2 shadow-(--shadow-pop)">
      {label !== undefined && <p className="text-[11.5px] font-semibold text-paper/60 mb-1">{label}</p>}
      <div className="space-y-0.5">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center gap-2 text-[12.5px]">
            <span className="size-2 rounded-[3px] shrink-0" style={{ background: entry.color }} aria-hidden />
            <span className="text-paper/75">{entry.name}</span>
            <span className="ml-auto pl-3 font-semibold text-paper tnum">
              {formatter ? formatter(Number(entry.value)) : Number(entry.value).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
