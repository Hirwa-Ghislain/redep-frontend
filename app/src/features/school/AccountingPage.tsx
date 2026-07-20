import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Hourglass, ReceiptText, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { SearchInput } from "@/components/ui/SearchInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { DonutChart, type DonutDatum } from "@/components/charts/DonutChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { Can } from "@/components/auth/guards";
import { useAuth } from "@/hooks/useAuth";
import { academicService } from "@/services/academicService";
import { paymentService } from "@/services/paymentService";
import { toast } from "@/stores/uiStore";
import { formatCompact, formatDateTime, formatNumber, formatRWF } from "@/lib/format";
import { CHANNEL_LABEL, FEE_CATEGORY_LABEL } from "@/lib/status";
import { P } from "@/config/permissions";
import type { Receipt } from "@/types";

function csvField(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function AccountingPage() {
  const { user } = useAuth();
  const schoolId = user!.schoolId!;
  const [q, setQ] = useState("");

  const { data: term } = useQuery({ queryKey: ["current-term"], queryFn: () => academicService.currentTerm() });

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["accounting-summary", schoolId, term?.id],
    queryFn: () => paymentService.accountingSummary(schoolId, term!.id),
    enabled: Boolean(term),
  });

  const { data: receipts = [], isLoading: loadingReceipts } = useQuery({
    queryKey: ["receipts", schoolId, q],
    queryFn: () => paymentService.receiptsBySchool(schoolId, q || undefined),
  });

  // Donut: ≤4 slices — fold the smallest categories into "Other".
  const donutData: DonutDatum[] = (() => {
    if (!summary) return [];
    const named = summary.byCategory.map((c) => ({ name: FEE_CATEGORY_LABEL[c.category], value: c.amount }));
    if (named.length <= 4) return named;
    const top = named.slice(0, 3);
    const otherValue = named.slice(3).reduce((s, d) => s + d.value, 0);
    const existingOther = top.find((d) => d.name === FEE_CATEGORY_LABEL.OTHER);
    if (existingOther) {
      existingOther.value += otherValue;
      return top;
    }
    return [...top, { name: "Other", value: otherValue }];
  })();

  const exportCsv = () => {
    const header = ["Reference", "Issued at", "Student", "Parent", "Category", "Channel", "Term", "Amount (RWF)"];
    const lines = receipts.map((r) =>
      [
        r.reference,
        formatDateTime(r.issuedAt),
        r.studentName,
        r.parentName,
        FEE_CATEGORY_LABEL[r.category],
        CHANNEL_LABEL[r.channelType],
        r.termLabel,
        r.amount,
      ]
        .map(csvField)
        .join(","),
    );
    const csv = [header.map(csvField).join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipts-${term ? term.label.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "export"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({
      title: "Export ready",
      description: `${receipts.length} receipt${receipts.length === 1 ? "" : "s"} downloaded as CSV.`,
      variant: "success",
    });
  };

  return (
    <PageTransition>
      <PageHeader
        title="Accounting"
        description={term ? `Collections, pending amounts and receipts for ${term.label}.` : undefined}
        actions={
          <Can permission={P.ACCOUNTING_EXPORT}>
            <Button
              variant="secondary"
              icon={<Download className="size-4" />}
              disabled={loadingReceipts || receipts.length === 0}
              onClick={exportCsv}
            >
              Export CSV
            </Button>
          </Can>
        }
      />

      {/* KPI row */}
      <Stagger className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StaggerItem>
          <StatCard
            label={`Total collected${term ? ` — ${term.label}` : ""}`}
            value={loadingSummary || !summary ? "…" : formatRWF(summary.totalCollected)}
            icon={Wallet}
            tone="primary"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Pending"
            value={loadingSummary || !summary ? "…" : formatRWF(summary.totalPending)}
            icon={Hourglass}
            tone={summary && summary.totalPending > 0 ? "gold" : "default"}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Receipts issued"
            value={loadingSummary || !summary ? "…" : formatNumber(summary.countCompleted)}
            icon={ReceiptText}
            tone="sky"
          />
        </StaggerItem>
      </Stagger>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 mt-4 items-start">
        <FadeIn>
          <Card>
            <CardHeader title="Collections — last 8 weeks" description="Completed payments bucketed by week." />
            {loadingSummary || !summary ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <TrendChart
                data={summary.byWeek}
                xKey="week"
                series={[{ key: "amount", name: "Collected" }]}
                height={240}
                formatter={formatRWF}
              />
            )}
          </Card>
        </FadeIn>
        <FadeIn delay={0.05}>
          <Card>
            <CardHeader title="Collections by category" description="Share of completed collections this term." />
            {loadingSummary || !summary ? (
              <Skeleton className="h-[220px] w-full" />
            ) : donutData.length === 0 ? (
              <p className="py-16 text-center text-[13px] text-muted">No completed collections yet this term.</p>
            ) : (
              <DonutChart
                data={donutData}
                height={240}
                formatter={formatRWF}
                centerValue={formatCompact(summary.totalCollected)}
                centerLabel="RWF collected"
              />
            )}
          </Card>
        </FadeIn>
      </div>

      {/* Receipts */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-7 mb-3">
        <h2 className="font-display font-semibold text-[15px] text-ink">Receipts</h2>
        <SearchInput value={q} onChange={setQ} placeholder="Search reference or student…" className="w-full sm:w-60" />
      </div>
      <DataTable<Receipt>
        loading={loadingReceipts}
        columns={[
          {
            key: "issuedAt",
            header: "Issued",
            render: (r) => <span className="tnum whitespace-nowrap">{formatDateTime(r.issuedAt)}</span>,
          },
          { key: "reference", header: "Reference", render: (r) => <span className="tnum font-medium">{r.reference}</span> },
          { key: "studentName", header: "Student", render: (r) => <span className="font-medium text-ink">{r.studentName}</span> },
          { key: "category", header: "Category", render: (r) => FEE_CATEGORY_LABEL[r.category] },
          {
            key: "amount",
            header: "Amount",
            align: "right",
            render: (r) => <span className="tnum font-semibold">{formatRWF(r.amount)}</span>,
          },
        ]}
        rows={receipts}
        keyField={(r) => r.id}
        pageSize={10}
        empty={q ? "No receipts match your search." : "No receipts issued yet."}
      />
    </PageTransition>
  );
}
