import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition } from "@/components/motion";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { DonutChart } from "@/components/charts/DonutChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { ministryService } from "@/services/ministryService";
import { formatCompact, formatNumber, percent } from "@/lib/format";
import type { DistrictStat } from "@/types";

export default function EnrollmentPage() {
  const { data: trends = [], isLoading: loadingTrends } = useQuery({
    queryKey: ["ministry-trends"],
    queryFn: () => ministryService.enrollmentTrends(),
  });

  const { data: districts = [], isLoading: loadingDistricts } = useQuery({
    queryKey: ["ministry-districts"],
    queryFn: () => ministryService.districtStats(),
  });

  const byEnrolled = [...districts].sort((a, b) => b.enrolled - a.enrolled);
  const totalEnrolled = districts.reduce((s, d) => s + d.enrolled, 0);
  // No satisfaction-survey system in the real backend — the column below only renders when
  // the field is present on every row (mock mode).
  const hasSatisfaction = districts.length > 0 && districts.every((d) => d.satisfaction !== undefined);
  const hasApplicationsSeries = trends.some((t) => t.applications !== undefined);
  const hasCapacitySeries = trends.some((t) => t.capacity !== undefined);

  // Top 3 districts by enrollment; everything else folds into "Other" (donut ≤ 4 slices).
  const top3 = byEnrolled.slice(0, 3);
  const otherEnrolled = totalEnrolled - top3.reduce((s, d) => s + d.enrolled, 0);
  const donutData = [
    ...top3.map((d) => ({ name: d.district, value: d.enrolled })),
    ...(otherEnrolled > 0 ? [{ name: "Other", value: otherEnrolled }] : []),
  ];

  const columns: Column<DistrictStat>[] = [
    { key: "district", header: "District", render: (d) => <span className="font-medium text-ink">{d.district}</span> },
    { key: "schools", header: "Schools", align: "right", render: (d) => <span className="tnum">{formatNumber(d.schools)}</span> },
    {
      key: "enrolled",
      header: "Enrolled",
      align: "right",
      render: (d) => <span className="tnum font-semibold text-ink">{formatNumber(d.enrolled)}</span>,
    },
    { key: "capacity", header: "Capacity", align: "right", render: (d) => <span className="tnum">{formatNumber(d.capacity)}</span> },
    {
      key: "utilization",
      header: "Utilization",
      render: (d) => {
        const u = d.capacity ? d.enrolled / d.capacity : 0;
        return (
          <div className="flex items-center gap-2.5">
            <span className="tnum w-10">{percent(u)}</span>
            <ProgressBar value={u} capacity className="w-28" label={`${d.district} capacity utilization`} />
          </div>
        );
      },
    },
    ...(hasSatisfaction
      ? [
          {
            key: "satisfaction",
            header: "Satisfaction",
            align: "right",
            render: (d) => <span className="tnum font-semibold text-gold-deep">★ {d.satisfaction!.toFixed(1)}</span>,
          } satisfies Column<DistrictStat>,
        ]
      : []),
  ];

  return (
    <PageTransition>
      <PageHeader
        title="Enrollment"
        description="National enrollment against seat capacity and application demand, term by term."
      />

      <div className="grid lg:grid-cols-5 gap-4 items-start">
        <Card className="lg:col-span-3">
          <CardHeader
            title="National trend"
            description={
              hasApplicationsSeries || hasCapacitySeries
                ? "Learners enrolled, applications received and seat capacity over six terms."
                : "Learners enrolled, month by month."
            }
          />
          {loadingTrends ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <TrendChart
              data={trends.map((t) => ({ ...t }))}
              xKey="period"
              series={[
                { key: "enrolled", name: "Enrolled" },
                ...(hasApplicationsSeries ? [{ key: "applications", name: "Applications" }] : []),
                ...(hasCapacitySeries ? [{ key: "capacity", name: "Capacity" }] : []),
              ]}
              formatter={formatCompact}
              height={280}
            />
          )}
        </Card>

        <FadeIn className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Enrollment share — top districts"
              description="Share of national enrollment held by the three largest districts."
            />
            {loadingDistricts ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <DonutChart
                data={donutData}
                formatter={formatCompact}
                centerValue={formatCompact(totalEnrolled)}
                centerLabel="learners"
              />
            )}
          </Card>
        </FadeIn>
      </div>

      <FadeIn delay={0.05}>
        <h2 className="font-display font-semibold text-[14px] text-ink mt-6 mb-2.5">Districts by enrollment</h2>
        <DataTable
          columns={columns}
          rows={byEnrolled}
          keyField={(d) => d.district}
          loading={loadingDistricts}
          empty="No district statistics reported yet."
        />
      </FadeIn>
    </PageTransition>
  );
}
