import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Building2, FileBarChart, Gauge, GraduationCap, Star } from "lucide-react";
import { HeroBanner } from "@/components/layout/HeroBanner";
import { FadeIn, PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Card, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { BarsChart } from "@/components/charts/BarsChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { academicService } from "@/services/academicService";
import { commsService } from "@/services/commsService";
import { ministryService } from "@/services/ministryService";
import { formatCompact, formatDate, formatNumber, percent } from "@/lib/format";

export default function MinistryDashboard() {
  const { data: term } = useQuery({ queryKey: ["current-term"], queryFn: () => academicService.currentTerm() });

  const { data: kpis, isLoading: loadingKpis } = useQuery({
    queryKey: ["ministry-kpis"],
    queryFn: () => ministryService.kpis(),
  });

  const { data: trends = [], isLoading: loadingTrends } = useQuery({
    queryKey: ["ministry-trends"],
    queryFn: () => ministryService.enrollmentTrends(),
  });

  const { data: districts = [], isLoading: loadingDistricts } = useQuery({
    queryKey: ["ministry-districts"],
    queryFn: () => ministryService.districtStats(),
  });

  const { data: circulars = [], isLoading: loadingCirculars } = useQuery({
    queryKey: ["ministry-circulars"],
    queryFn: async () => {
      const all = await commsService.announcementsFor({ schoolIds: [], audience: "MINISTRY_ADMIN" });
      return all.filter((a) => a.schoolId === null);
    },
  });

  // Enrolled delta computed over the two most recent completed terms (projected term excluded).
  const completed = trends.filter((t) => !t.period.endsWith("*"));
  const prev = completed[completed.length - 2];
  const curr = completed[completed.length - 1];
  const enrolledDelta =
    prev && curr
      ? {
          value: `${curr.enrolled >= prev.enrolled ? "+" : ""}${(((curr.enrolled - prev.enrolled) / prev.enrolled) * 100).toFixed(1)}%`,
          positive: curr.enrolled >= prev.enrolled,
          label: "vs last term",
        }
      : undefined;

  // The real backend's enrollment-trends endpoint only reports enrolled counts over time
  // (no applications/capacity series) — the chart below only draws series present in the data.
  const trendData = trends.map((t) => ({ ...t }));
  const hasCapacitySeries = trends.some((t) => t.capacity !== undefined);
  const topDistricts = [...districts]
    .sort((a, b) => b.enrolled - a.enrolled)
    .slice(0, 8)
    .map((d) => ({ district: d.district, enrolled: d.enrolled }));

  const pressurePoints = districts
    .map((d) => ({ ...d, utilization: d.capacity ? d.enrolled / d.capacity : 0 }))
    .filter((d) => d.utilization >= 0.92)
    .sort((a, b) => b.utilization - a.utilization);

  return (
    <PageTransition>
      <HeroBanner
        eyebrow={`National overview${term ? ` · ${term.label}` : ""}`}
        title="Republic of Rwanda — Education at a glance"
        subtitle="Enrollment, capacity and staffing across every district, updated as schools report."
        stats={
          kpis
            ? [
                { label: "Schools", value: formatNumber(kpis.totalSchools) },
                { label: "Learners", value: formatCompact(kpis.totalStudents) },
                { label: "Utilization", value: percent(kpis.capacityUtilization) },
              ]
            : undefined
        }
        actions={
          <Link
            to="/ministry/reports"
            className="inline-flex h-8 items-center gap-1.5 rounded-(--radius-ctl) bg-gold px-3 text-[12.5px] font-semibold text-ink transition-colors hover:bg-[#d99b0e]"
          >
            <FileBarChart className="size-3.5" aria-hidden />
            Generate report
          </Link>
        }
      />

      {/* KPI row */}
      {loadingKpis ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : kpis ? (
        <Stagger className={`grid grid-cols-2 gap-3 ${kpis.avgSatisfaction !== undefined ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
          <StaggerItem>
            <StatCard label="Schools on platform" value={formatNumber(kpis.totalSchools)} icon={Building2} tone="primary" />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              label="Learners enrolled"
              value={formatCompact(kpis.totalStudents)}
              icon={GraduationCap}
              tone="sky"
              delta={enrolledDelta}
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              label="Capacity utilization"
              value={percent(kpis.capacityUtilization)}
              icon={Gauge}
              tone={kpis.capacityUtilization > 0.9 ? "gold" : "primary"}
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard label="Open vacancies" value={formatNumber(kpis.openVacancies)} icon={Briefcase} tone="clay" />
          </StaggerItem>
          {/* No satisfaction-survey system in the real backend — this card only renders when
              the field is present (mock mode). */}
          {kpis.avgSatisfaction !== undefined && (
            <StaggerItem>
              <StatCard label="Avg parent satisfaction" value={`★ ${kpis.avgSatisfaction.toFixed(1)}`} icon={Star} tone="gold" />
            </StaggerItem>
          )}
        </Stagger>
      ) : null}

      {/* Charts row */}
      <div className="grid lg:grid-cols-5 gap-4 mt-4">
        <Card className="lg:col-span-3">
          <CardHeader
            title={hasCapacitySeries ? "Enrollment vs capacity — six terms" : "Enrollment trend"}
            description={
              hasCapacitySeries
                ? "National totals per term; the newest term is a projection."
                : "National enrollment counts over recent months."
            }
          />
          {loadingTrends ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <TrendChart
              data={trendData}
              xKey="period"
              series={[
                { key: "enrolled", name: "Enrolled" },
                ...(hasCapacitySeries ? [{ key: "capacity", name: "Capacity" }] : []),
              ]}
              formatter={formatCompact}
              height={260}
            />
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Largest districts" description="Top 8 districts by learners enrolled." />
          {loadingDistricts ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <BarsChart
              data={topDistricts}
              xKey="district"
              series={[{ key: "enrolled", name: "Enrolled" }]}
              horizontal
              formatter={formatCompact}
              height={260}
            />
          )}
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-2 gap-4 mt-4 items-start">
        <FadeIn>
          <Card padded={false}>
            <CardHeader
              className="px-5 pt-4"
              title="Pressure points"
              description="Districts at or above 92% of seat capacity."
              action={
                <Link to="/ministry/capacity" className="text-[12.5px] font-medium text-primary-deep hover:underline">
                  Capacity planning
                </Link>
              }
            />
            {loadingDistricts ? (
              <div className="space-y-3 px-5 pb-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : pressurePoints.length === 0 ? (
              <p className="border-t border-line px-5 py-6 text-center text-[13px] text-muted">
                No district is above 92% utilization.
              </p>
            ) : (
              <ul className="border-t border-line divide-y divide-line">
                {pressurePoints.map((d) => (
                  <li key={d.district} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{d.district}</span>
                    <span className="whitespace-nowrap text-[11.5px] text-faint tnum">
                      {formatCompact(d.enrolled)} / {formatCompact(d.capacity)}
                    </span>
                    <ProgressBar
                      value={d.utilization}
                      capacity
                      className="w-28 shrink-0"
                      label={`${d.district} capacity utilization`}
                    />
                    <span className="w-11 shrink-0 text-right text-[12.5px] font-semibold text-ink tnum">
                      {percent(d.utilization)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </FadeIn>

        <FadeIn delay={0.05}>
          <Card padded={false}>
            <CardHeader
              className="px-5 pt-4"
              title="Latest circulars"
              description="Most recent national notices."
              action={
                <Link to="/ministry/circulars" className="text-[12.5px] font-medium text-primary-deep hover:underline">
                  All circulars
                </Link>
              }
            />
            {loadingCirculars ? (
              <div className="px-5 pb-4">
                <CardSkeleton />
              </div>
            ) : circulars.length === 0 ? (
              <p className="border-t border-line px-5 py-6 text-center text-[13px] text-muted">
                No national circulars published yet.
              </p>
            ) : (
              <div className="border-t border-line divide-y divide-line">
                {circulars.slice(0, 3).map((c) => (
                  <div key={c.id} className="px-5 py-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate text-[13px] font-medium text-ink">{c.title}</p>
                      <span className="whitespace-nowrap text-[11px] text-faint tnum">{formatDate(c.publishedAt)}</span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted line-clamp-2">{c.body}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
