import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition } from "@/components/motion";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { BarsChart } from "@/components/charts/BarsChart";
import { ministryService } from "@/services/ministryService";
import { formatNumber, percent } from "@/lib/format";
import type { DistrictStat } from "@/types";
import { cn } from "@/lib/utils";

export default function CapacityPage() {
  const { data: districts = [], isLoading } = useQuery({
    queryKey: ["ministry-districts"],
    queryFn: () => ministryService.districtStats(),
  });

  const utilizationData = districts
    .map((d) => ({ district: d.district, utilization: d.capacity ? Math.round((d.enrolled / d.capacity) * 100) : 0 }))
    .sort((a, b) => b.utilization - a.utilization);

  const seatRows = [...districts].sort((a, b) => (b.capacity - b.enrolled) - (a.capacity - a.enrolled));

  const overPressure = districts
    .map((d) => ({ ...d, utilization: d.capacity ? d.enrolled / d.capacity : 0 }))
    .filter((d) => d.utilization > 0.92)
    .sort((a, b) => b.utilization - a.utilization);

  const columns: Column<DistrictStat>[] = [
    { key: "district", header: "District", render: (d) => <span className="font-medium text-ink">{d.district}</span> },
    {
      key: "remaining",
      header: "Seats left",
      align: "right",
      render: (d) => {
        const remaining = d.capacity - d.enrolled;
        return (
          <span className={cn("tnum font-semibold", remaining < 3_000 ? "text-clay-deep" : "text-ink")}>
            {formatNumber(remaining)}
          </span>
        );
      },
    },
    {
      key: "utilization",
      header: "Utilization",
      render: (d) => {
        const u = d.capacity ? d.enrolled / d.capacity : 0;
        return (
          <div className="flex items-center gap-2">
            <span className="tnum w-9">{percent(u)}</span>
            <ProgressBar value={u} capacity className="w-16" label={`${d.district} capacity utilization`} />
          </div>
        );
      },
    },
    {
      key: "teacherGap",
      header: "Gap",
      align: "right",
      render: (d) => <span className="tnum">{formatNumber(d.teacherGap)}</span>,
    },
  ];

  return (
    <PageTransition>
      <PageHeader
        title="Capacity"
        description="Seat planning across districts — where classrooms are filling up, where seats remain, and where new construction or stream splitting should be prioritised before the next intake."
      />

      <div className="grid lg:grid-cols-5 gap-4 items-start">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Capacity utilization by district"
            description="Enrolled learners as a share of available seats — sorted by pressure."
          />
          {isLoading ? (
            <Skeleton className="h-[360px] w-full" />
          ) : (
            <BarsChart
              data={utilizationData}
              xKey="district"
              series={[{ key: "utilization", name: "Utilization" }]}
              horizontal
              formatter={(v) => `${v}%`}
              height={360}
            />
          )}
        </Card>

        <div className="lg:col-span-2">
          <h2 className="font-display font-semibold text-[14px] text-ink mb-2.5">Remaining seats</h2>
          <DataTable
            columns={columns}
            rows={seatRows}
            keyField={(d) => d.district}
            loading={isLoading}
            empty="No district statistics reported yet."
          />
        </div>
      </div>

      {overPressure.length > 0 && (
        <FadeIn>
          <Card padded={false} className="mt-4 border-gold bg-gold-soft p-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="size-4 shrink-0 mt-0.5 text-gold-deep" aria-hidden />
              <p className="text-[12.5px] leading-relaxed text-muted">
                <span className="font-semibold text-ink">
                  {overPressure.length} district{overPressure.length === 1 ? "" : "s"} above 92% utilization.
                </span>{" "}
                Consider new classrooms or stream splitting ahead of the next intake in{" "}
                {overPressure.map((d, i) => (
                  <span key={d.district} className="font-medium text-ink">
                    {i > 0 && <span className="font-normal text-muted"> · </span>}
                    {d.district} <span className="tnum text-gold-deep">{percent(d.utilization)}</span>
                  </span>
                ))}
                .
              </p>
            </div>
          </Card>
        </FadeIn>
      )}
    </PageTransition>
  );
}
