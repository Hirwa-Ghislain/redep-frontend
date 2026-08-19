import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Hourglass, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { TrendChart } from "@/components/charts/TrendChart";
import { useAuth } from "@/hooks/useAuth";
import { paymentService, type RealStudentBalance } from "@/services/paymentService";
import { formatNumber, formatRWF } from "@/lib/format";

export default function AccountingPage() {
  const { user } = useAuth();
  const schoolId = user!.schoolId!;
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ["real-overview", schoolId],
    queryFn: () => paymentService.realOverview(schoolId),
  });
  const { data: balances = [], isLoading: loadingBalances } = useQuery({
    queryKey: ["real-balances", schoolId],
    queryFn: () => paymentService.realStudentBalances(schoolId),
  });

  const classes = [...new Map(
    balances.filter((balance) => balance.class).map((balance) => [balance.class!.id, balance.class!]),
  ).values()].sort((a, b) => a.name.localeCompare(b.name));
  const studentsInClass = balances
    .filter((balance) => balance.class?.id === selectedClassId)
    .sort((a, b) => `${a.student.lastName} ${a.student.firstName}`.localeCompare(`${b.student.lastName} ${b.student.firstName}`));
  const selectedStudent = studentsInClass.find((balance) => balance.student.id === selectedStudentId) ?? null;

  return (
    <PageTransition>
      <PageHeader title="Accounting" description="Collections, outstanding balances and revenue trends." />

      <Stagger className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StaggerItem><StatCard label="Total revenue" value={loadingOverview || !overview ? "…" : formatRWF(overview.summary.totalSchoolRevenue)} icon={Wallet} tone="primary" /></StaggerItem>
        <StaggerItem><StatCard label="Outstanding" value={loadingOverview || !overview ? "…" : formatRWF(overview.summary.totalUnpaid)} icon={Hourglass} tone={overview && overview.summary.totalUnpaid > 0 ? "gold" : "default"} /></StaggerItem>
        <StaggerItem><StatCard label="Active students" value={loadingOverview || !overview ? "…" : formatNumber(overview.summary.activeStudents)} icon={Users} tone="sky" /></StaggerItem>
        <StaggerItem><StatCard label="Overdue installments" value={loadingOverview || !overview ? "…" : String(overview.summary.overdueInstallments)} icon={AlertTriangle} tone={overview && overview.summary.overdueInstallments > 0 ? "clay" : "default"} /></StaggerItem>
      </Stagger>

      <div className="grid lg:grid-cols-2 gap-4 mt-4 items-start">
        <FadeIn>
          <Card>
            <CardHeader title="Monthly revenue" description="Completed payments over the last 12 months." />
            {loadingOverview || !overview ? <Skeleton className="h-[240px] w-full" /> : overview.charts.monthlyRevenue.length === 0 ? (
              <p className="py-16 text-center text-[13px] text-muted">No revenue history yet.</p>
            ) : <TrendChart data={overview.charts.monthlyRevenue} xKey="month" series={[{ key: "revenue", name: "Revenue" }]} height={240} formatter={formatRWF} />}
          </Card>
        </FadeIn>
        <FadeIn delay={0.05}>
          <Card>
            <CardHeader title="Outstanding by class" description="Classes with the most unpaid balances." />
            {loadingOverview || !overview ? <Skeleton className="h-[220px] w-full" /> : overview.charts.classesByUnpaid.length === 0 ? (
              <p className="py-16 text-center text-[13px] text-muted">Nothing outstanding.</p>
            ) : <TrendChart data={overview.charts.classesByUnpaid.slice(0, 8)} xKey="className" series={[{ key: "unpaid", name: "Outstanding" }]} height={220} formatter={formatRWF} />}
          </Card>
        </FadeIn>
      </div>

      <h2 className="font-display font-semibold text-[15px] text-ink mt-7 mb-3">Student accounting details</h2>
      <Card>
        <CardHeader title="Find a student" description="Choose a class first, then select a student to inspect their complete fee position." />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Class" value={selectedClassId} onChange={(event) => { setSelectedClassId(event.target.value); setSelectedStudentId(""); }}>
            <option value="">Select a class…</option>
            {classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}
          </Select>
          <Select label="Student" value={selectedStudentId} disabled={!selectedClassId} onChange={(event) => setSelectedStudentId(event.target.value)}>
            <option value="">{selectedClassId ? "Select a student…" : "Choose a class first"}</option>
            {studentsInClass.map((balance) => <option key={balance.student.id} value={balance.student.id}>{balance.student.firstName} {balance.student.lastName}</option>)}
          </Select>
        </div>
      </Card>

      {loadingBalances ? <Skeleton className="mt-4 h-56 w-full" /> : selectedStudent ? (
        <Card padded={false} className="mt-4 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <p className="font-display text-[17px] font-semibold text-ink">{selectedStudent.student.firstName} {selectedStudent.student.lastName}</p>
              <p className="text-[12.5px] text-muted">{selectedStudent.class?.name}</p>
            </div>
            <Badge variant={selectedStudent.paymentStatus === "PAID" ? "success" : selectedStudent.paymentStatus === "PARTIALLY_PAID" ? "warning" : "danger"}>{selectedStudent.paymentStatus.replaceAll("_", " ")}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-px bg-line border-b border-line">
            <div className="bg-surface px-4 py-3"><p className="text-[11px] uppercase tracking-wide text-muted">Billed</p><p className="mt-1 font-semibold tnum">{formatRWF(selectedStudent.totalDue)}</p></div>
            <div className="bg-surface px-4 py-3"><p className="text-[11px] uppercase tracking-wide text-muted">Paid</p><p className="mt-1 font-semibold text-primary-deep tnum">{formatRWF(selectedStudent.totalPaid)}</p></div>
            <div className="bg-surface px-4 py-3"><p className="text-[11px] uppercase tracking-wide text-muted">Outstanding</p><p className="mt-1 font-semibold text-clay-deep tnum">{formatRWF(selectedStudent.outstanding)}</p></div>
          </div>
          <DataTable<RealStudentBalance["charges"][number]>
            columns={[
              { key: "feeName", header: "Fee" },
              { key: "amountDue", header: "Billed", align: "right", render: (charge) => formatRWF(charge.amountDue) },
              { key: "amountPaid", header: "Paid", align: "right", render: (charge) => formatRWF(charge.amountPaid) },
              { key: "outstanding", header: "Due", align: "right", render: (charge) => <span className="font-semibold">{formatRWF(charge.outstanding)}</span> },
              { key: "installmentCount", header: "Installments", align: "right" },
              { key: "nextPaymentDue", header: "Next payment", render: (charge) => charge.nextPaymentDue ? new Date(charge.nextPaymentDue).toLocaleDateString() : "—" },
              { key: "status", header: "Status", render: (charge) => <Badge variant={charge.status === "PAID" ? "success" : charge.status === "PARTIALLY_PAID" ? "warning" : "danger"}>{charge.status.replaceAll("_", " ")}</Badge> },
            ]}
            rows={selectedStudent.charges}
            keyField={(charge) => charge.id}
            empty="No fees billed to this student."
          />
        </Card>
      ) : selectedClassId ? (
        <Card className="mt-4"><p className="py-8 text-center text-[13px] text-muted">Select a student to view accounting details.</p></Card>
      ) : null}
    </PageTransition>
  );
}
