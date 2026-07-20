import {
  Area,
  AreaChart,
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

export interface TrendSeries {
  key: string;
  name: string;
}

export interface TrendChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  series: TrendSeries[]; // colors assigned by index from the validated order
  height?: number;
  formatter?: (value: number) => string;
}

/** Line/area trend with crosshair tooltip. Single series gets a soft area fill. */
export function TrendChart({ data, xKey, series, height = 260, formatter }: TrendChartProps) {
  const single = series.length === 1;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={false} dy={6} />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v: number) => formatCompact(v)}
        />
        <Tooltip
          content={<ChartTooltip formatter={formatter} />}
          cursor={{ stroke: "#CFC9B8", strokeWidth: 1 }}
        />
        {!single && (
          <Legend
            verticalAlign="top"
            align="right"
            height={30}
            iconType="plainline"
            formatter={(value: string) => <span className="text-[12.5px] text-muted">{value}</span>}
          />
        )}
        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            fillOpacity={single ? 0.09 : 0}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#FFFFFF" }}
            isAnimationActive={CHART_ANIMATION}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
