import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { paymentService, type ChargePaymentDestination } from "@/services/paymentService";
import { studentService, type ParentPaymentAccount } from "@/services/studentService";
import { toast } from "@/stores/uiStore";
import { formatDateTime, formatRWF } from "@/lib/format";
import { CHANNEL_LABEL, FEE_CATEGORY_LABEL, PAYMENT_STATUS } from "@/lib/status";
import type { FeeBalance, Payment } from "@/types";
import { cn } from "@/lib/utils";

interface PayTarget {
  balance: FeeBalance & { installmentCount: number; nextPaymentDue: string | null };
  studentName: string;
  schoolId: string;
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const focusStudentId = searchParams.get("studentId");
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);

  const [destinationId, setDestinationId] = useState("");
  const [paymentMode, setPaymentMode] = useState<"FULL" | "INSTALLMENTS">("FULL");
  const [paymentMethod, setPaymentMethod] = useState<"MOMO" | "CARD">("MOMO");
  const [paymentPhone, setPaymentPhone] = useState(user?.phone ?? "");
  const [installmentAmount, setInstallmentAmount] = useState<number | "">("");
  const [partialReason, setPartialReason] = useState("");
  const [remainingDate, setRemainingDate] = useState("");
  const [pendingResult, setPendingResult] = useState<{ checkoutUrl: string | null; instructions: string | null; payerPhone: string | null; paymentId: string } | null>(null);

  const { data: paymentAccounts = [], isLoading: loadingChildren } = useQuery({
    queryKey: ["payment-accounts", user?.id],
    queryFn: () => studentService.listPaymentAccounts(),
    enabled: Boolean(user),
  });
  const balancesByChild = useMemo(() => paymentAccounts
    .map((account) => ({
      account,
      balances: account.charges.map((charge) => ({
        studentId: account.studentId,
        feeStructureId: charge.id,
        feeName: charge.feeName,
        category: charge.feeType,
        billed: charge.amountDue,
        paid: charge.amountPaid,
        due: Math.max(0, charge.amountDue - charge.amountPaid),
        installmentCount: charge.installmentCount,
        nextPaymentDue: charge.nextPaymentDue,
      })),
    }))
    .sort((a, b) => Number(b.account.studentId === focusStudentId) - Number(a.account.studentId === focusStudentId)),
  [focusStudentId, paymentAccounts]);

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["payments", user?.id],
    queryFn: () => paymentService.listByParent(user!.id),
    enabled: Boolean(user),
  });

  const { data: destinations = [] } = useQuery({
    queryKey: ["charge-destinations", payTarget?.balance.feeStructureId],
    queryFn: () => paymentService.chargeDestinations(payTarget!.balance.feeStructureId),
    enabled: Boolean(payTarget),
  });

  const realPay = useMutation({
    mutationFn: () => {
      const amount = paymentMode === "FULL" ? payTarget!.balance.due : Number(installmentAmount);
      return paymentService.initiatePayment(payTarget!.balance.feeStructureId, {
        paymentMode,
        paymentMethod,
        paymentDestinationId: destinationId,
        paymentPhone: paymentMethod === "MOMO" ? paymentPhone : undefined,
        amount,
        partialPaymentReason: paymentMode === "INSTALLMENTS" ? partialReason : undefined,
        remainingPaymentDate: paymentMode === "INSTALLMENTS" ? remainingDate : undefined,
      });
    },
    onSuccess: (result) => {
      setPayTarget(null);
      setPendingResult({ checkoutUrl: result.checkoutUrl, instructions: result.instructions, payerPhone: result.payerPhone, paymentId: result.paymentId });
      void qc.invalidateQueries({ queryKey: ["payment-accounts"] });
      void qc.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (e) => toast({ title: "Payment failed", description: (e as { message?: string })?.message ?? "Try again.", variant: "error" }),
  });

  const checkStatus = useMutation({
    mutationFn: (paymentId: string) => paymentService.checkPaymentStatus(paymentId),
    onSuccess: (result) => {
      if (result.status === "COMPLETED") {
        setPendingResult(null);
        void qc.invalidateQueries({ queryKey: ["payment-accounts"] });
        void qc.invalidateQueries({ queryKey: ["payments"] });
        void qc.invalidateQueries({ queryKey: ["parent-due"] });
        void qc.invalidateQueries({ queryKey: ["applications"] });
        void qc.invalidateQueries({ queryKey: ["children"] });
        toast({ title: "Payment confirmed", description: "Receipt is ready under Receipts.", variant: "success" });
      } else if (result.status === "FAILED") {
        setPendingResult(null);
        toast({ title: "Payment failed", description: "The provider reported this payment failed.", variant: "error" });
      } else {
        toast({ title: "Still pending", description: "No confirmation yet — check again shortly.", variant: "info" });
      }
    },
  });

  const openPay = (target: PayTarget) => {
    setPayTarget(target);
    setDestinationId("");
    setPaymentMode("FULL");
    setPaymentMethod("MOMO");
    setPaymentPhone(user?.phone ?? "");
    setInstallmentAmount(Math.ceil(target.balance.billed / 2));
    setPartialReason("");
    setRemainingDate("");
  };

  const totalDue = balancesByChild.flatMap((b) => b.balances).reduce((s, b) => s + b.due, 0);

  return (
    <PageTransition>
      <PageHeader
        title="Fees & payments"
        description="Balances across all your children."
        actions={
          totalDue > 0 ? (
            <div className="rounded-(--radius-card) border border-line bg-surface shadow-(--shadow-card) px-3.5 py-2 text-right">
              <p className="text-[11px] font-medium text-muted">Total outstanding</p>
              <p className="font-display text-[16px] leading-5 font-bold text-clay-deep tnum">{formatRWF(totalDue)}</p>
            </div>
          ) : undefined
        }
      />

      {/* Balances per child */}
      {loadingChildren ? (
        <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div>
      ) : (
        <div className="space-y-4">
          {balancesByChild.map(({ account, balances }: { account: ParentPaymentAccount; balances: PayTarget["balance"][] }) => {
            const childDue = balances.reduce((s, b) => s + b.due, 0);
            return (
              <Card key={account.studentId} padded={false} className={account.studentId === focusStudentId ? "ring-2 ring-primary/20 border-primary" : undefined}>
                <CardHeader
                  className="px-5 pt-4"
                  title={account.studentName}
                  description={`${account.className} · ${account.schoolName}`}
                  action={
                    <div className="flex items-center gap-2">
                      {account.applicationPending && <Badge variant="info">Admission payment</Badge>}
                      <Badge variant={childDue ? "warning" : "success"} dot>
                        {childDue ? `${formatRWF(childDue)} due` : "All paid"}
                      </Badge>
                    </div>
                  }
                />
                <div className="divide-y divide-line">
                  {balances.map((b) => (
                    <div key={b.feeStructureId} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-ink">{b.feeName}</p>
                        <p className="text-[12px] text-muted">{FEE_CATEGORY_LABEL[b.category]}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-muted">Paid</p>
                        <p className="text-[12.5px] font-medium text-primary-deep tnum">{formatRWF(b.paid)}</p>
                      </div>
                      <div className="text-right w-28">
                        <p className="text-[11px] text-muted">Due</p>
                        <p className={cn("text-[12.5px] font-semibold tnum", b.due ? "text-clay-deep" : "text-muted")}>
                          {formatRWF(b.due)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={b.due === 0}
                        onClick={() => openPay({ balance: b, studentName: account.studentName, schoolId: account.schoolId })}
                      >
                        {b.due === 0 ? "Paid" : "Pay"}
                      </Button>
                    </div>
                  ))}
                  {balances.length === 0 && (
                    <p className="px-5 py-5 text-[13px] text-muted">No fees charged yet.</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* History */}
      <h2 className="font-display font-semibold text-[15px] text-ink mt-7 mb-3">Payment history</h2>
      <DataTable<Payment>
        loading={loadingPayments}
        columns={[
          { key: "paidAt", header: "Date", render: (p) => <span className="tnum">{formatDateTime(p.paidAt)}</span> },
          { key: "reference", header: "Reference", render: (p) => <span className="tnum font-medium">{p.reference}</span> },
          { key: "category", header: "Category", render: (p) => FEE_CATEGORY_LABEL[p.category] },
          { key: "channelType", header: "Channel", render: (p) => CHANNEL_LABEL[p.channelType] },
          { key: "amount", header: "Amount", align: "right", render: (p) => <span className="tnum font-semibold">{formatRWF(p.amount)}</span> },
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
        pageSize={8}
        empty="No payment transactions yet. New pending and completed payments will appear here automatically."
      />

      {/* Pay modal */}
      <Modal
        open={Boolean(payTarget)}
        onClose={() => !realPay.isPending && setPayTarget(null)}
        title="Confirm payment"
        description={payTarget ? `${payTarget.balance.feeName} — ${payTarget.studentName}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPayTarget(null)} disabled={realPay.isPending}>Cancel</Button>
            <Button
              loading={realPay.isPending}
              disabled={
                !destinationId ||
                (paymentMethod === "MOMO" && !paymentPhone) ||
                (paymentMode === "INSTALLMENTS" && (
                  Number(installmentAmount) < Math.ceil((payTarget?.balance.billed ?? 0) / 2) ||
                  Number(installmentAmount) >= (payTarget?.balance.due ?? 0) ||
                  partialReason.trim().length < 10 ||
                  !remainingDate
                ))
              }
              onClick={() => realPay.mutate()}
            >
              {realPay.isPending ? "Starting…" : "Start payment"}
            </Button>
          </>
        }
      >
        {payTarget && (
          <div className="space-y-4">
            <div className="rounded-(--radius-card) bg-paper/70 border border-line px-4 py-3 flex items-center justify-between">
              <span className="text-[13.5px] text-muted">Amount due</span>
              <span className="font-display text-[20px] font-bold text-ink tnum">{formatRWF(payTarget.balance.due)}</span>
            </div>

            <div>
              <p className="text-[13px] font-medium text-ink mb-2">Destination</p>
              <Select value={destinationId} onChange={(e) => setDestinationId(e.target.value)} aria-label="Payment destination">
                <option value="" disabled>Select where this payment goes…</option>
                {destinations.map((d: ChargePaymentDestination) => (
                  <option key={d.id} value={d.id}>{d.label} ({d.type})</option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select label="Method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "MOMO" | "CARD")}>
                <option value="MOMO">Mobile Money</option>
                <option value="CARD">Card</option>
              </Select>
              <Select
                label="Mode"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as "FULL" | "INSTALLMENTS")}
                disabled={payTarget.balance.category === "APPLICATION" || payTarget.balance.installmentCount >= 1}
              >
                <option value="FULL">Pay in full</option>
                <option value="INSTALLMENTS">Pay in installments</option>
              </Select>
            </div>

            {paymentMethod === "MOMO" && (
              <Input label="MoMo phone number" value={paymentPhone} onChange={(e) => setPaymentPhone(e.target.value)} placeholder="07XXXXXXXX" required />
            )}

            {paymentMode === "INSTALLMENTS" && (
              <>
                <Input
                  label="Amount for this installment"
                  type="number"
                  value={installmentAmount}
                  onChange={(e) => setInstallmentAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  min={Math.ceil(payTarget.balance.billed / 2)}
                  max={Math.max(0, payTarget.balance.due - 1)}
                  hint={`First installment must be at least ${formatRWF(Math.ceil(payTarget.balance.billed / 2))}. The second payment must clear the remaining balance.`}
                  required
                />
                <Textarea label="Reason for partial payment" value={partialReason} onChange={(e) => setPartialReason(e.target.value)} rows={3} required />
                <Input label="Date the remaining balance will be paid" type="date" value={remainingDate} onChange={(e) => setRemainingDate(e.target.value)} required />
              </>
            )}

            {payTarget.balance.category === "APPLICATION" && (
              <p className="rounded-xl bg-gold-soft px-3.5 py-2.5 text-[12.5px] text-gold-deep">
                The application fee must be paid in full. Installments are not available for this charge.
              </p>
            )}
            {payTarget.balance.category !== "APPLICATION" && payTarget.balance.installmentCount >= 1 && (
              <p className="rounded-xl bg-sky-soft px-3.5 py-2.5 text-[12.5px] text-sky-deep">
                This is the second and final payment, so it must clear the complete remaining balance.
              </p>
            )}

            <p className="flex items-start gap-2 text-[12.5px] text-muted">
              <Wallet className="size-4 shrink-0 mt-0.5" />
              Payment is processed by XentriPay. A MoMo prompt may appear on the phone above; if it does not, approve the pending transaction from the phone's MoMo menu. Card opens a secure checkout page.
            </p>
          </div>
        )}
      </Modal>

      {/* Pending payment (real mode: async MoMo/card checkout) */}
      <Modal
        open={Boolean(pendingResult)}
        onClose={() => setPendingResult(null)}
        title="Complete your payment"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingResult(null)}>Close</Button>
            <Button loading={checkStatus.isPending} onClick={() => pendingResult && checkStatus.mutate(pendingResult.paymentId)}>
              I've paid — check status
            </Button>
          </>
        }
      >
        {pendingResult && (
          <div className="space-y-3">
            {pendingResult.checkoutUrl ? (
              <Button variant="secondary" onClick={() => window.open(pendingResult.checkoutUrl!, "_blank")}>
                Open secure checkout
              </Button>
            ) : (
              <div className="space-y-2">
                {pendingResult.payerPhone && <p className="text-[12.5px] text-muted">Payment phone: <span className="font-medium text-ink">{pendingResult.payerPhone}</span></p>}
                <p className="text-[13.5px] text-ink">{pendingResult.instructions ?? "Approve the pending transaction from your phone's MoMo menu."}</p>
              </div>
            )}
            <p className="text-[12.5px] text-muted">Only tap "check status" after approving the transaction. XentriPay may mark an unapproved or cancelled request as failed.</p>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
