import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleDollarSign, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { Can } from "@/components/auth/guards";
import { useAuth } from "@/hooks/useAuth";
import { feeService } from "@/services/feeService";
import { paymentService, type RealPaymentRow } from "@/services/paymentService";
import { studentService } from "@/services/studentService";
import { toast } from "@/stores/uiStore";
import { formatDateTime, formatRWF } from "@/lib/format";
import { P } from "@/config/permissions";
import type { ApiError } from "@/lib/api/client";

const STATUS_META: Record<RealPaymentRow["status"], { label: string; variant: "success" | "warning" | "danger" }> = {
  COMPLETED: { label: "Completed", variant: "success" },
  PENDING: { label: "Pending", variant: "warning" },
  FAILED: { label: "Failed", variant: "danger" },
};

interface ChargeForm {
  enrollmentId: string;
  schoolFeeId: string;
}

interface ConfirmForm {
  paymentId: string;
  providerReference: string;
  amount: string;
}

const EMPTY_CHARGE: ChargeForm = { enrollmentId: "", schoolFeeId: "" };

export default function PaymentsLedgerPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const schoolId = user!.schoolId!;

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<RealPaymentRow["status"] | "">("");
  const [charge, setCharge] = useState<ChargeForm | null>(null);
  const [confirm, setConfirm] = useState<ConfirmForm | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["real-ledger", schoolId, q, status],
    queryFn: () => paymentService.realLedger(schoolId, { search: q || undefined, status: status || undefined }),
  });
  const payments = data?.items ?? [];

  const { data: students = [] } = useQuery({
    queryKey: ["real-students", schoolId, "picker"],
    queryFn: () => studentService.listRealBySchool(schoolId, { status: "ACTIVE" }),
    enabled: Boolean(charge),
  });

  const { data: fees = [] } = useQuery({
    queryKey: ["real-fees", schoolId],
    queryFn: () => feeService.realFees(schoolId),
    enabled: Boolean(charge),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["real-ledger"] });

  const createCharge = useMutation({
    mutationFn: () => paymentService.chargeStudent(schoolId, { enrollmentId: charge!.enrollmentId, schoolFeeId: charge!.schoolFeeId }),
    onSuccess: () => {
      setCharge(null);
      invalidate();
      toast({ title: "Student charged", description: "The family will see this as an outstanding balance to pay.", variant: "success" });
    },
    onError: (e) => toast({ title: "Could not charge student", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const confirmPayment = useMutation({
    mutationFn: () => paymentService.confirmRealPayment(schoolId, confirm!.paymentId, confirm!.providerReference.trim(), Number(confirm!.amount)),
    onSuccess: () => {
      setConfirm(null);
      invalidate();
      toast({ title: "Payment confirmed", description: "A receipt was generated.", variant: "success" });
    },
    onError: (e) => toast({ title: "Could not confirm payment", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const hasFilters = Boolean(q || status);

  return (
    <PageTransition>
      <PageHeader
        title="Payments ledger"
        description="Every online payment plus manual charges billed to students."
        actions={
          <Can permission={P.PAYMENTS_RECORD}>
            <Button icon={<CircleDollarSign className="size-4" />} onClick={() => setCharge({ ...EMPTY_CHARGE })}>Charge a student</Button>
          </Can>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="Search student or reference…" className="w-full sm:w-60" />
        <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as RealPaymentRow["status"] | "")} className="w-36">
          <option value="">All statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
        </Select>
      </div>

      {!isLoading && payments.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={hasFilters ? "No payments match your filters" : "No payments yet"}
          description={hasFilters ? "Try a different reference or status." : "Payments appear here as parents pay online, or once you charge a student."}
        />
      ) : (
        <DataTable<RealPaymentRow>
          loading={isLoading}
          columns={[
            { key: "createdAt", header: "Date", render: (p) => <span className="tnum whitespace-nowrap">{formatDateTime(p.paidAt ?? p.createdAt)}</span> },
            { key: "providerRef", header: "Reference", render: (p) => <span className="tnum font-medium">{p.providerRef ?? p.receiptNumber ?? "—"}</span> },
            { key: "student", header: "Student", render: (p) => <span className="font-medium text-ink">{p.charge.student.firstName} {p.charge.student.lastName}</span> },
            { key: "fee", header: "Fee", render: (p) => p.charge.schoolFee.name },
            { key: "method", header: "Method", render: (p) => p.paymentMethod },
            { key: "amount", header: "Amount", align: "right", render: (p) => <span className="tnum font-semibold">{formatRWF(p.amount)}</span> },
            {
              key: "status",
              header: "Status",
              render: (p) => {
                const meta = STATUS_META[p.status];
                return <Badge variant={meta.variant} dot>{meta.label}</Badge>;
              },
            },
            {
              key: "actions",
              header: "",
              align: "right",
              render: (p) =>
                p.status === "PENDING" ? (
                  <Can permission={P.PAYMENTS_RECORD}>
                    <Button size="sm" variant="secondary" onClick={() => setConfirm({ paymentId: p.id, providerReference: "", amount: String(p.amount) })}>
                      Confirm
                    </Button>
                  </Can>
                ) : (
                  <a
                    className="text-[12.5px] font-medium text-primary-deep hover:underline"
                    href={paymentService.realReceiptUrl(schoolId, p.id)}
                    target="_blank" rel="noreferrer"
                  >
                    Receipt
                  </a>
                ),
            },
          ]}
          rows={payments}
          keyField={(p) => p.id}
          pageSize={12}
          empty="No payments found."
        />
      )}

      {/* Charge a student */}
      <Modal
        open={Boolean(charge)}
        onClose={() => !createCharge.isPending && setCharge(null)}
        title="Charge a student"
        description="Bills the family for an active fee. This creates an outstanding balance — it does not collect payment (families pay via mobile money/card themselves)."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCharge(null)} disabled={createCharge.isPending}>Cancel</Button>
            <Button loading={createCharge.isPending} disabled={!charge?.enrollmentId || !charge?.schoolFeeId} onClick={() => createCharge.mutate()}>
              Charge student
            </Button>
          </>
        }
      >
        {charge && (
          <div className="space-y-3.5">
            <Select label="Student" required value={charge.enrollmentId} onChange={(e) => setCharge({ ...charge, enrollmentId: e.target.value })}>
              <option value="">Select a student…</option>
              {students.map((s) => <option key={s.enrollmentId} value={s.enrollmentId}>{s.firstName} {s.lastName} — {s.className}</option>)}
            </Select>
            <Select label="Fee" required value={charge.schoolFeeId} onChange={(e) => setCharge({ ...charge, schoolFeeId: e.target.value })}>
              <option value="">Select a fee…</option>
              {fees.map((f) => <option key={f.id} value={f.id}>{f.name} — {formatRWF(f.amount)}</option>)}
            </Select>
          </div>
        )}
      </Modal>

      {/* Confirm payment */}
      <Modal
        open={Boolean(confirm)}
        onClose={() => !confirmPayment.isPending && setConfirm(null)}
        title="Confirm payment"
        description="Reconciles a pending payment against the provider's transaction reference and generates a receipt."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)} disabled={confirmPayment.isPending}>Cancel</Button>
            <Button loading={confirmPayment.isPending} disabled={!confirm?.providerReference.trim()} onClick={() => confirmPayment.mutate()}>
              Confirm payment
            </Button>
          </>
        }
      >
        {confirm && (
          <div className="space-y-3.5">
            <Input label="Provider reference" required value={confirm.providerReference} onChange={(e) => setConfirm({ ...confirm, providerReference: e.target.value })} placeholder="e.g. MoMo transaction ID" />
            <Input label="Amount (RWF)" type="number" value={confirm.amount} onChange={(e) => setConfirm({ ...confirm, amount: e.target.value })} />
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
