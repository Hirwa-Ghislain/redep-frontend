import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_ANIMATION, CHART_COLORS } from "./theme";
import { ChartTooltip } from "./ChartTooltip";

export interface DonutDatum {
  name: string;
  value: number;
}

export interface DonutChartProps {
  data: DonutDatum[]; // keep ≤ 4 slices; fold the tail into "Other" before passing
  height?: number;
  formatter?: (value: number) => string;
  centerLabel?: string;
  centerValue?: string;
}

/** Composition donut — 2px surface gaps between segments, legend at the side. */
export function DonutChart({ data, height = 220, formatter, centerLabel, centerValue }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip formatter={formatter} />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="66%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="#FFFFFF"
              strokeWidth={2}
              isAnimationActive={CHART_ANIMATION}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {centerValue && <span className="font-display font-bold text-lg text-ink tnum">{centerValue}</span>}
            {centerLabel && <span className="text-[11.5px] text-muted">{centerLabel}</span>}
          </div>
        )}
      </div>
      <ul className="flex flex-col gap-2 min-w-0">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 text-[13px]">
            <span className="size-2.5 rounded-[3px] shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} aria-hidden />
            <span className="text-muted truncate">{d.name}</span>
            <span className="ml-auto pl-3 font-semibold text-ink tnum">
              {total ? `${Math.round((d.value / total) * 100)}%` : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
