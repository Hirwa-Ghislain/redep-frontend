import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompact } from "@/lib/format";
import { AXIS_TICK, CHART_ANIMATION, CHART_COLORS, GRID_STROKE } from "./theme";
import { ChartTooltip } from "./ChartTooltip";

export interface BarsSeries {
  key: string;
  name: string;
}

export interface BarsChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  series: BarsSeries[];
  height?: number;
  horizontal?: boolean;
  formatter?: (value: number) => string;
}

/** Bars with 4px rounded data-ends, surface gaps and per-mark hover tooltip. */
export function BarsChart({ data, xKey, series, height = 260, horizontal, formatter }: BarsChartProps) {
  const layoutProps = horizontal
    ? ({ layout: "vertical" } as const)
    : ({ layout: "horizontal" } as const);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%" {...layoutProps}>
        <CartesianGrid stroke={GRID_STROKE} vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatCompact(v)} />
            <YAxis type="category" dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={false} width={92} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={false} dy={6} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => formatCompact(v)} />
          </>
        )}
        <Tooltip content={<ChartTooltip formatter={formatter} />} cursor={{ fill: "rgba(16,25,21,0.04)" }} />
        {series.length > 1 && (
          <Legend
            verticalAlign="top"
            align="right"
            height={30}
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => <span className="text-[12.5px] text-muted">{value}</span>}
          />
        )}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            maxBarSize={horizontal ? 18 : 36}
            stroke="#FFFFFF"
            strokeWidth={1}
            isAnimationActive={CHART_ANIMATION}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
