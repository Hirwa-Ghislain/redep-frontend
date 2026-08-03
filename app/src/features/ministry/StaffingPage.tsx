import { useQuery } from "@tanstack/react-query";
import { Briefcase, MapPinned, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Skeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { BarsChart } from "@/components/charts/BarsChart";
import { ministryService } from "@/services/ministryService";
import { formatNumber } from "@/lib/format";

interface DistrictVacancyRow {
  district: string;
  count: number;
}

export default function StaffingPage() {
  const { data: staffing, isLoading: loadingStaffing } = useQuery({
    queryKey: ["ministry-staffing"],
    queryFn: () => ministryService.staffing(),
  });

  const byTitle = [...(staffing?.byTitle ?? [])].sort((a, b) => b.count - a.count);
  const byDistrict = [...(staffing?.byDistrict ?? [])].sort((a, b) => b.count - a.count);
  const topTitle = byTitle[0]?.title;

  const districtColumns: Column<DistrictVacancyRow>[] = [
    { key: "district", header: "District", render: (d) => <span className="font-medium text-ink">{d.district}</span> },
    {
      key: "count",
      header: "Open vacancies",
      align: "right",
      render: (d) => <span className="tnum font-semibold text-ink">{formatNumber(d.count)}</span>,
    },
  ];

  return (
    <PageTransition>
      <PageHeader
        title="Staffing"
        description="Open vacancies published by schools across the platform, by district and by role."
      />

      {/* KPI strip */}
      {loadingStaffing ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <Stagger className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StaggerItem>
            <StatCard label="Open vacancies" value={formatNumber(staffing?.totalOpenVacancies ?? 0)} icon={Briefcase} tone="primary" />
          </StaggerItem>
          <StaggerItem>
            <StatCard label="Districts with openings" value={formatNumber(byDistrict.length)} icon={MapPinned} tone="clay" />
          </StaggerItem>
          <StaggerItem>
            <StatCard label="Most in-demand role" value={topTitle ?? "—"} icon={Sparkles} tone="gold" />
          </StaggerItem>
        </Stagger>
      )}

      <div className="grid lg:grid-cols-5 gap-4 mt-4 items-start">
        <FadeIn className="lg:col-span-2">
          <Card>
            <CardHeader title="Open vacancies by role" description="Live postings across all schools." />
            {loadingStaffing ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <BarsChart
                data={byTitle}
                xKey="title"
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
            <h2 className="font-display font-semibold text-[14px] text-ink mb-2.5">Open vacancies by district</h2>
            <DataTable
              columns={districtColumns}
              rows={byDistrict}
              keyField={(d) => d.district}
              loading={loadingStaffing}
              empty="No open vacancies right now."
              pageSize={8}
            />
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
