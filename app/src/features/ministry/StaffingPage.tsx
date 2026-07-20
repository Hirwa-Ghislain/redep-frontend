import { useQuery } from "@tanstack/react-query";
import { Briefcase, MapPinned, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Skeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { BarsChart } from "@/components/charts/BarsChart";
import { ministryService } from "@/services/ministryService";
import { formatDate, formatNumber } from "@/lib/format";
import type { DistrictStat, EmploymentType, Vacancy } from "@/types";
import { cn } from "@/lib/utils";

const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
};

/** "HEAD_TEACHER" → "Head teacher" */
function titleCase(position: string): string {
  const words = position.toLowerCase().split("_");
  return words.map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");
}

export default function StaffingPage() {
  const { data: staffing, isLoading: loadingStaffing } = useQuery({
    queryKey: ["ministry-staffing"],
    queryFn: () => ministryService.staffing(),
  });

  const { data: districts = [], isLoading: loadingDistricts } = useQuery({
    queryKey: ["ministry-districts"],
    queryFn: () => ministryService.districtStats(),
  });

  const vacancies = staffing?.vacancies ?? [];
  const byPosition = (staffing?.byPosition ?? [])
    .map((p) => ({ position: titleCase(p.position), count: p.count }))
    .sort((a, b) => b.count - a.count);

  const nationalGap = districts.reduce((s, d) => s + d.teacherGap, 0);
  const highGapCount = districts.filter((d) => d.teacherGap > 150).length;
  const gapRows = [...districts].sort((a, b) => b.teacherGap - a.teacherGap);

  const vacancyColumns: Column<Vacancy>[] = [
    { key: "title", header: "Position", render: (v) => <span className="font-medium text-ink">{v.title}</span> },
    { key: "schoolName", header: "School" },
    { key: "district", header: "District" },
    { key: "employmentType", header: "Employment", render: (v) => EMPLOYMENT_LABEL[v.employmentType] },
    { key: "deadline", header: "Deadline", render: (v) => <span className="tnum">{formatDate(v.deadline)}</span> },
    {
      key: "applicantsCount",
      header: "Applicants",
      align: "right",
      render: (v) => <span className="tnum font-semibold text-ink">{formatNumber(v.applicantsCount)}</span>,
    },
  ];

  const gapColumns: Column<DistrictStat>[] = [
    { key: "district", header: "District", render: (d) => <span className="font-medium text-ink">{d.district}</span> },
    { key: "schools", header: "Schools", align: "right", render: (d) => <span className="tnum">{formatNumber(d.schools)}</span> },
    {
      key: "teacherGap",
      header: "Teacher gap",
      align: "right",
      render: (d) => (
        <span className={cn("tnum font-semibold", d.teacherGap > 150 ? "text-clay-deep" : "text-ink")}>
          {formatNumber(d.teacherGap)}
        </span>
      ),
    },
  ];

  return (
    <PageTransition>
      <PageHeader
        title="Staffing"
        description="Open vacancies across all schools and the teacher shortfall reported by each district."
      />

      {/* KPI strip */}
      {loadingStaffing || loadingDistricts ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <Stagger className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StaggerItem>
            <StatCard label="Open vacancies" value={formatNumber(vacancies.length)} icon={Briefcase} tone="primary" />
          </StaggerItem>
          <StaggerItem>
            <StatCard label="National teacher gap" value={formatNumber(nationalGap)} icon={UsersRound} tone="clay" />
          </StaggerItem>
          <StaggerItem>
            <StatCard label="Districts above 150 gap" value={formatNumber(highGapCount)} icon={MapPinned} tone="gold" />
          </StaggerItem>
        </Stagger>
      )}

      <div className="grid lg:grid-cols-5 gap-4 mt-4 items-start">
        <FadeIn className="lg:col-span-2">
          <Card>
            <CardHeader title="Open vacancies by position" description="Live postings across all schools." />
            {loadingStaffing ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <BarsChart
                data={byPosition}
                xKey="position"
                series={[{ key: "count", name: "Open vacancies" }]}
                horizontal
                formatter={formatNumber}
                height={260}
              />
            )}
          </Card>
        </FadeIn>

        <FadeIn delay={0.05} className="lg:col-span-3">
          <div>
            <h2 className="font-display font-semibold text-[14px] text-ink mb-2.5">Open vacancies</h2>
            <DataTable
              columns={vacancyColumns}
              rows={vacancies}
              keyField={(v) => v.id}
              loading={loadingStaffing}
              empty="No open vacancies right now."
              pageSize={8}
            />
          </div>
        </FadeIn>
      </div>

      <div className="mt-6 mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display font-semibold text-[14px] text-ink">Teacher gap by district</h2>
        <p className="text-[12.5px] text-muted">
          Reported shortfall of qualified teachers — districts over 150 are flagged for priority deployment.
        </p>
      </div>
      <DataTable
        columns={gapColumns}
        rows={gapRows}
        keyField={(d) => d.district}
        loading={loadingDistricts}
        empty="No district statistics reported yet."
      />
    </PageTransition>
  );
}
