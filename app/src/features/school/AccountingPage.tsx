import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Hourglass, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { TrendChart } from "@/components/charts/TrendChart";
import { useAuth } from "@/hooks/useAuth";
import { paymentService, type RealStudentBalance } from "@/services/paymentService";
import { formatNumber, formatRWF } from "@/lib/format";

export default function AccountingPage() {
  const { user } = useAuth();
  const schoolId = user!.schoolId!;

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ["real-overview", schoolId],
    queryFn: () => paymentService.realOverview(schoolId),
  });

  const { data: balances = [], isLoading: loadingBalances } = useQuery({
    queryKey: ["real-balances", schoolId],
    queryFn: () => paymentService.realStudentBalances(schoolId),
  });

  return (
    <PageTransition>
      <PageHeader title="Accounting" description="Collections, outstanding balances and revenue trends." />

      <Stagger className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StaggerItem>
          <StatCard label="Total revenue" value={loadingOverview || !overview ? "…" : formatRWF(overview.summary.totalSchoolRevenue)} icon={Wallet} tone="primary" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Outstanding" value={loadingOverview || !overview ? "…" : formatRWF(overview.summary.totalUnpaid)} icon={Hourglass} tone={overview && overview.summary.totalUnpaid > 0 ? "gold" : "default"} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Active students" value={loadingOverview || !overview ? "…" : formatNumber(overview.summary.activeStudents)} icon={Users} tone="sky" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Overdue installments" value={loadingOverview || !overview ? "…" : String(overview.summary.overdueInstallments)} icon={AlertTriangle} tone={overview && overview.summary.overdueInstallments > 0 ? "clay" : "default"} />
        </StaggerItem>
      </Stagger>

      <div className="grid lg:grid-cols-2 gap-4 mt-4 items-start">
        <FadeIn>
          <Card>
            <CardHeader title="Monthly revenue" description="Completed payments over the last 12 months." />
            {loadingOverview || !overview ? (
              <Skeleton className="h-[240px] w-full" />
            ) : overview.charts.monthlyRevenue.length === 0 ? (
              <p className="py-16 text-center text-[13px] text-muted">No revenue history yet.</p>
            ) : (
              <TrendChart data={overview.charts.monthlyRevenue} xKey="month" series={[{ key: "revenue", name: "Revenue" }]} height={240} formatter={formatRWF} />
            )}
          </Card>
        </FadeIn>
        <FadeIn delay={0.05}>
          <Card>
            <CardHeader title="Outstanding by class" description="Classes with the most unpaid balances." />
            {loadingOverview || !overview ? (
              <Skeleton className="h-[220px] w-full" />
            ) : overview.charts.classesByUnpaid.length === 0 ? (
              <p className="py-16 text-center text-[13px] text-muted">Nothing outstanding.</p>
            ) : (
              <TrendChart
                data={overview.charts.classesByUnpaid.slice(0, 8)}
                xKey="className"
                series={[{ key: "unpaid", name: "Outstanding" }]}
                height={220}
                formatter={formatRWF}
              />
            )}
          </Card>
        </FadeIn>
      </div>

      <h2 className="font-display font-semibold text-[15px] text-ink mt-7 mb-3">Student balances</h2>
      <DataTable<RealStudentBalance>
        loading={loadingBalances}
        columns={[
          { key: "student", header: "Student", render: (b) => <span className="font-medium text-ink">{b.student.firstName} {b.student.lastName}</span> },
          { key: "class", header: "Class", render: (b) => b.class?.name ?? "—" },
          { key: "totalDue", header: "Billed", align: "right", render: (b) => <span className="tnum">{formatRWF(b.totalDue)}</span> },
          { key: "totalPaid", header: "Paid", align: "right", render: (b) => <span className="tnum">{formatRWF(b.totalPaid)}</span> },
          { key: "outstanding", header: "Outstanding", align: "right", render: (b) => <span className="tnum font-semibold">{formatRWF(b.outstanding)}</span> },
        ]}
        rows={balances}
        keyField={(b) => b.student.id}
        pageSize={12}
        empty="No student balances yet."
      />
    </PageTransition>
  );
}
