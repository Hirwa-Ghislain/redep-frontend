import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition } from "@/components/motion";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Skeleton } from "@/components/ui/Skeleton";
import { BarsChart } from "@/components/charts/BarsChart";
import { ministryService } from "@/services/ministryService";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TransferRow {
  district: string;
  out: number;
  in: number;
}

export default function TransferTrendsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["ministry-transfers"],
    queryFn: () => ministryService.transferTrends(),
  });

  const rows = data?.byDistrict ?? [];
  const sorted = [...rows].sort((a, b) => (b.in - b.out) - (a.in - a.out));

  const columns: Column<TransferRow>[] = [
    { key: "district", header: "District", render: (r) => <span className="font-medium text-ink">{r.district}</span> },
    { key: "out", header: "Out", align: "right", render: (r) => <span className="tnum">{formatNumber(r.out)}</span> },
    { key: "in", header: "In", align: "right", render: (r) => <span className="tnum">{formatNumber(r.in)}</span> },
    {
      key: "net",
      header: "Net",
      align: "right",
      render: (r) => {
        const net = r.in - r.out;
        return (
          <span
            className={cn(
              "tnum font-semibold",
              net > 0 ? "text-primary-deep" : net < 0 ? "text-clay-deep" : "text-muted",
            )}
          >
            {net > 0 ? "+" : net < 0 ? "−" : ""}
            {formatNumber(Math.abs(net))}
          </span>
        );
      },
    },
  ];

  return (
    <PageTransition>
      <PageHeader
        title="Transfer trends"
        description="Student movement between districts — where learners are leaving and where they are arriving."
      />

      <div className="grid lg:grid-cols-5 gap-4 items-start">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Transfers by district"
            description="Outgoing vs incoming confirmed transfers this academic year."
          />
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <BarsChart
              data={rows}
              xKey="district"
              series={[
                { key: "out", name: "Out" },
                { key: "in", name: "In" },
              ]}
              formatter={formatNumber}
              height={300}
            />
          )}
        </Card>

        <FadeIn className="lg:col-span-2">
          <h2 className="font-display font-semibold text-[14px] text-ink mb-2.5">Net movement</h2>
          <DataTable
            columns={columns}
            rows={sorted}
            keyField={(r) => r.district}
            loading={isLoading}
            empty="No transfer data reported yet."
          />
        </FadeIn>
      </div>

      <FadeIn delay={0.05}>
        <Card padded={false} className="mt-4 p-4">
          <div className="flex items-start gap-2.5">
            <Info className="size-4 shrink-0 mt-0.5 text-sky-deep" aria-hidden />
            <p className="text-[12.5px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">Methodology.</span> Counts cover the current academic year and
              include confirmed transfers only — pending and rejected requests are excluded. A positive net means the
              district gained learners from other districts.
            </p>
          </div>
        </Card>
      </FadeIn>
    </PageTransition>
  );
}
