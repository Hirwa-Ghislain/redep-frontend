import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { BarsChart } from "@/components/charts/BarsChart";
import { ministryService } from "@/services/ministryService";
import { formatDate, formatNumber } from "@/lib/format";
import type { ResignationRecord, ResignationStatus } from "@/types";

const STATUS_LABEL: Record<ResignationStatus, string> = {
  PENDING: "Pending",
  PAYMENT_REQUIRED: "Payment required",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const STATUS_VARIANT: Record<ResignationStatus, "neutral" | "gold" | "info" | "danger"> = {
  PENDING: "neutral",
  PAYMENT_REQUIRED: "gold",
  APPROVED: "info",
  REJECTED: "danger",
};

interface DistrictWithdrawalRow {
  district: string;
  total: number;
  approved: number;
  [key: string]: string | number;
}

export default function TransferTrendsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["ministry-resignations"],
    queryFn: () => ministryService.resignations(),
  });

  const items = data?.items ?? [];
  const totals = data?.totalsByStatus;

  const byDistrictMap = new Map<string, DistrictWithdrawalRow>();
  for (const item of items) {
    const row = byDistrictMap.get(item.district) ?? { district: item.district, total: 0, approved: 0 };
    row.total += 1;
    if (item.status === "APPROVED") row.approved += 1;
    byDistrictMap.set(item.district, row);
  }
  const districtRows = [...byDistrictMap.values()].sort((a, b) => b.total - a.total);

  const recent = [...items].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)).slice(0, 10);

  const columns: Column<ResignationRecord>[] = [
    { key: "studentName", header: "Student", render: (r) => <span className="font-medium text-ink">{r.studentName}</span> },
    { key: "schoolName", header: "School" },
    { key: "district", header: "District" },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge variant={STATUS_VARIANT[r.status]} dot>{STATUS_LABEL[r.status]}</Badge>,
    },
    { key: "requestedAt", header: "Requested", render: (r) => <span className="tnum">{formatDate(r.requestedAt)}</span> },
  ];

  return (
    <PageTransition>
      <PageHeader
        title="Student withdrawals"
        description="Single-school withdrawal (resignation) requests reported across the platform — there is no cross-school transfer tracking in this system."
      />

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StaggerItem>
            <StatCard label="Pending" value={formatNumber(totals?.PENDING ?? 0)} tone="default" />
          </StaggerItem>
          <StaggerItem>
            <StatCard label="Payment required" value={formatNumber(totals?.PAYMENT_REQUIRED ?? 0)} tone="gold" />
          </StaggerItem>
          <StaggerItem>
            <StatCard label="Approved" value={formatNumber(totals?.APPROVED ?? 0)} tone="sky" />
          </StaggerItem>
          <StaggerItem>
            <StatCard label="Rejected" value={formatNumber(totals?.REJECTED ?? 0)} tone="clay" />
          </StaggerItem>
        </Stagger>
      )}

      <div className="grid lg:grid-cols-5 gap-4 items-start mt-4">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Withdrawal requests by district"
            description="Total requests recorded per district, all statuses."
          />
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <BarsChart
              data={districtRows}
              xKey="district"
              series={[{ key: "total", name: "Requests" }]}
              formatter={formatNumber}
              height={300}
            />
          )}
        </Card>

        <FadeIn className="lg:col-span-2">
          <h2 className="font-display font-semibold text-[14px] text-ink mb-2.5">By district</h2>
          <DataTable
            columns={[
              { key: "district", header: "District", render: (r: DistrictWithdrawalRow) => <span className="font-medium text-ink">{r.district}</span> },
              { key: "total", header: "Requests", align: "right", render: (r: DistrictWithdrawalRow) => <span className="tnum">{formatNumber(r.total)}</span> },
              { key: "approved", header: "Approved", align: "right", render: (r: DistrictWithdrawalRow) => <span className="tnum">{formatNumber(r.approved)}</span> },
            ]}
            rows={districtRows}
            keyField={(r) => r.district}
            loading={isLoading}
            empty="No withdrawal requests reported yet."
          />
        </FadeIn>
      </div>

      <FadeIn delay={0.05}>
        <h2 className="font-display font-semibold text-[14px] text-ink mt-6 mb-2.5">Most recent requests</h2>
        <DataTable
          columns={columns}
          rows={recent}
          keyField={(r) => r.id}
          loading={isLoading}
          empty="No withdrawal requests reported yet."
        />
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card padded={false} className="mt-4 p-4">
          <div className="flex items-start gap-2.5">
            <Info className="size-4 shrink-0 mt-0.5 text-sky-deep" aria-hidden />
            <p className="text-[12.5px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">About this data.</span> These are single-school withdrawal
              (resignation) requests submitted by parents — the platform has no concept of a student transferring
              directly from one school to another. A learner who wants to join a different school applies fresh
              through Discover &amp; Apply.
            </p>
          </div>
        </Card>
      </FadeIn>
    </PageTransition>
  );
}
