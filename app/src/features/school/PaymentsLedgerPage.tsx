import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PenLine, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { Can } from "@/components/auth/guards";
import { useAuth } from "@/hooks/useAuth";
import { academicService } from "@/services/academicService";
import { feeService } from "@/services/feeService";
import { paymentService } from "@/services/paymentService";
import { studentService } from "@/services/studentService";
import { toast } from "@/stores/uiStore";
import { formatDateTime, formatRWF, fullName } from "@/lib/format";
import { CHANNEL_LABEL, FEE_CATEGORY_LABEL, PAYMENT_STATUS } from "@/lib/status";
import { P } from "@/config/permissions";
import type { ApiError } from "@/lib/api/client";
import type { FeeCategory, Payment, PaymentChannelType, PaymentStatus } from "@/types";

type LedgerRow = Payment & { studentName: string };

interface OfflineForm {
  studentId: string;
  feeStructureId: string;
  channelType: PaymentChannelType;
}

const EMPTY_OFFLINE: OfflineForm = { studentId: "", feeStructureId: "", channelType: "BANK" };

export default function PaymentsLedgerPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const schoolId = user!.schoolId!;

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "">("");
  const [category, setCategory] = useState<FeeCategory | "">("");
  const [offline, setOffline] = useState<OfflineForm | null>(null);

  const { data: term } = useQuery({ queryKey: ["current-term"], queryFn: () => academicService.currentTerm() });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments", schoolId, q, status, category],
    queryFn: () =>
      paymentService.listBySchool(schoolId, {
        q: q || undefined,
        status: status || undefined,
        category: category || undefined,
      }),
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students", schoolId, "enrolled-picker"],
    queryFn: () => studentService.listBySchool(schoolId, { status: "ENROLLED" }),
    enabled: Boolean(offline),
  });

  const { data: fees = [] } = useQuery({
    queryKey: ["fees", schoolId, term?.id],
    queryFn: () => feeService.structures(schoolId, term!.id),
    enabled: Boolean(offline) && Boolean(term),
  });

  const selectedFee = fees.find((f) => f.id === offline?.feeStructureId);

  const record = useMutation({
    mutationFn: () =>
      paymentService.recordOffline({
        studentId: offline!.studentId,
        feeStructureId: offline!.feeStructureId,
        amount: selectedFee!.amount,
        channelType: offline!.channelType,
        recordedBy: fullName(user!),
      }),
    onSuccess: (payment) => {
      setOffline(null);
      void qc.invalidateQueries({ queryKey: ["payments"] });
      void qc.invalidateQueries({ queryKey: ["receipts"] });
      void qc.invalidateQueries({ queryKey: ["accounting-summary"] });
      toast({
        title: "Payment recorded",
        description: `Receipt ${payment.reference} was issued to the family.`,
        variant: "success",
      });
    },
    onError: (e) =>
      toast({ title: "Could not record payment", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const hasFilters = Boolean(q || status || category);

  return (
    <PageTransition>
      <PageHeader
        title="Payments ledger"
        description="Every MoMo, bank and manually recorded payment for this school."
        actions={
          <Can permission={P.PAYMENTS_RECORD}>
            <Button icon={<PenLine className="size-4" />} onClick={() => setOffline({ ...EMPTY_OFFLINE })}>
              Record offline payment
            </Button>
          </Can>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="Search student or reference…" className="w-full sm:w-60" />
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value as PaymentStatus | "")}
          className="w-36"
        >
          <option value="">All statuses</option>
          {Object.entries(PAYMENT_STATUS).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by category"
          value={category}
          onChange={(e) => setCategory(e.target.value as FeeCategory | "")}
          className="w-40"
        >
          <option value="">All categories</option>
          {Object.entries(FEE_CATEGORY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {!isLoading && payments.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={hasFilters ? "No payments match your filters" : "No payments yet"}
          description={
            hasFilters
              ? "Try a different reference, status or category."
              : "Payments appear here as parents pay online or staff record offline payments."
          }
        />
      ) : (
        <DataTable<LedgerRow>
          loading={isLoading}
          columns={[
            {
              key: "paidAt",
              header: "Date",
              render: (p) => <span className="tnum whitespace-nowrap">{formatDateTime(p.paidAt)}</span>,
            },
            { key: "reference", header: "Reference", render: (p) => <span className="tnum font-medium">{p.reference}</span> },
            { key: "studentName", header: "Student", render: (p) => <span className="font-medium text-ink">{p.studentName}</span> },
            { key: "category", header: "Category", render: (p) => FEE_CATEGORY_LABEL[p.category] },
            { key: "channelType", header: "Channel", render: (p) => CHANNEL_LABEL[p.channelType] },
            {
              key: "recordedBy",
              header: "Recorded",
              render: (p) =>
                p.recordedBy ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[11.5px] font-medium text-gold-deep whitespace-nowrap">
                    Manual · {p.recordedBy}
                  </span>
                ) : (
                  <span className="text-muted">Online</span>
                ),
            },
            {
              key: "amount",
              header: "Amount",
              align: "right",
              render: (p) => <span className="tnum font-semibold">{formatRWF(p.amount)}</span>,
            },
            {
              key: "status",
              header: "Status",
              render: (p) => {
                const meta = PAYMENT_STATUS[p.status];
                return <Badge variant={meta.variant} dot>{meta.label}</Badge>;
              },
            },
          ]}
          rows={payments}
          keyField={(p) => p.id}
          pageSize={12}
          empty="No payments found."
        />
      )}

      {/* Record offline payment */}
      <Modal
        open={Boolean(offline)}
        onClose={() => !record.isPending && setOffline(null)}
        title="Record offline payment"
        description="Cash or bank-slip payment received at the school office. A receipt is issued immediately."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOffline(null)} disabled={record.isPending}>
              Cancel
            </Button>
            <Button
              loading={record.isPending}
              disabled={!offline?.studentId || !selectedFee}
              onClick={() => record.mutate()}
            >
              {record.isPending
                ? "Recording…"
                : selectedFee
                  ? `Record ${formatRWF(selectedFee.amount)}`
                  : "Record payment"}
            </Button>
          </>
        }
      >
        {offline && (
          <div className="space-y-3.5">
            <Select
              label="Student"
              required
              value={offline.studentId}
              onChange={(e) => setOffline({ ...offline, studentId: e.target.value })}
            >
              <option value="">Select a student…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {fullName(s)} — {s.className}
                </option>
              ))}
            </Select>
            <Select
              label={`Fee${term ? ` — ${term.label}` : ""}`}
              required
              hint={fees.length === 0 ? "No fee structures exist for the current term." : undefined}
              value={offline.feeStructureId}
              onChange={(e) => setOffline({ ...offline, feeStructureId: e.target.value })}
            >
              <option value="">Select a fee…</option>
              {fees.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} — {formatRWF(f.amount)}
                </option>
              ))}
            </Select>
            <Select
              label="Channel"
              value={offline.channelType}
              onChange={(e) => setOffline({ ...offline, channelType: e.target.value as PaymentChannelType })}
            >
              {Object.entries(CHANNEL_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            {selectedFee && (
              <div className="rounded-(--radius-card) bg-paper/70 border border-line px-4 py-3 flex items-center justify-between">
                <span className="text-[13.5px] text-muted">Amount to record</span>
                <span className="font-display text-[20px] font-bold text-ink tnum">{formatRWF(selectedFee.amount)}</span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
