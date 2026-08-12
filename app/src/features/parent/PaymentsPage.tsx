import { useMemo, useState } from "react";
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
import { studentService, type StudentWithContext } from "@/services/studentService";
import { toast } from "@/stores/uiStore";
import { formatDateTime, formatRWF, fullName } from "@/lib/format";
import { CHANNEL_LABEL, FEE_CATEGORY_LABEL, PAYMENT_STATUS } from "@/lib/status";
import type { FeeBalance, Payment } from "@/types";
import { cn } from "@/lib/utils";

interface PayTarget {
  balance: FeeBalance;
  studentName: string;
  schoolId: string;
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);

  const [destinationId, setDestinationId] = useState("");
  const [paymentMode, setPaymentMode] = useState<"FULL" | "INSTALLMENTS">("FULL");
  const [paymentMethod, setPaymentMethod] = useState<"MOMO" | "CARD">("MOMO");
  const [paymentPhone, setPaymentPhone] = useState(user?.phone ?? "");
  const [installmentAmount, setInstallmentAmount] = useState<number | "">("");
  const [partialReason, setPartialReason] = useState("");
  const [remainingDate, setRemainingDate] = useState("");
  const [pendingResult, setPendingResult] = useState<{ checkoutUrl: string | null; instructions: string | null; paymentId: string } | null>(null);

  const { data: children = [], isLoading: loadingChildren } = useQuery({
    queryKey: ["children", user?.id],
    queryFn: () => studentService.listByParent(user!.id),
    enabled: Boolean(user),
  });
  const enrolled = useMemo(() => children.filter((c) => c.status === "ENROLLED"), [children]);

  const { data: balancesByChild = [], isLoading: loadingBalances } = useQuery({
    queryKey: ["balances-all", user?.id, enrolled.map((c) => c.id).join(",")],
    queryFn: async () => {
      const withContext = await Promise.all(enrolled.map((c) => studentService.get(c.id)));
      return withContext.map((child) => ({
        child,
        charges: child.charges ?? [],
        balances: (child.charges ?? []).map((c): FeeBalance => ({
          studentId: child.id, feeStructureId: c.id, feeName: c.feeName, category: c.feeType,
          billed: c.amountDue, paid: c.amountPaid, due: Math.max(0, c.amountDue - c.amountPaid),
        })),
      }));
    },
    enabled: enrolled.length > 0,
  });

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
      setPendingResult({ checkoutUrl: result.checkoutUrl, instructions: result.instructions, paymentId: result.paymentId });
      void qc.invalidateQueries({ queryKey: ["balances-all"] });
    },
    onError: (e) => toast({ title: "Payment failed", description: (e as { message?: string })?.message ?? "Try again.", variant: "error" }),
  });

  const checkStatus = useMutation({
    mutationFn: (paymentId: string) => paymentService.checkPaymentStatus(paymentId),
    onSuccess: (result) => {
      if (result.status === "COMPLETED") {
        setPendingResult(null);
        void qc.invalidateQueries({ queryKey: ["balances-all"] });
        void qc.invalidateQueries({ queryKey: ["payments"] });
        void qc.invalidateQueries({ queryKey: ["parent-due"] });
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
    setInstallmentAmount("");
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
      {loadingChildren || loadingBalances ? (
        <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div>
      ) : (
        <div className="space-y-4">
          {balancesByChild.map(({ child, balances }: { child: StudentWithContext; balances: FeeBalance[] }) => {
            const childDue = balances.reduce((s, b) => s + b.due, 0);
            return (
              <Card key={child.id} padded={false}>
                <CardHeader
                  className="px-5 pt-4"
                  title={fullName(child)}
                  description={`${child.className} · ${child.schoolName}`}
                  action={
                    <Badge variant={childDue ? "warning" : "success"} dot>
                      {childDue ? `${formatRWF(childDue)} due` : "All paid"}
                    </Badge>
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
                        onClick={() => openPay({ balance: b, studentName: fullName(child), schoolId: child.schoolId })}
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
        empty="No completed payments yet — pending payments appear here once confirmed."
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
              disabled={!destinationId || (paymentMethod === "MOMO" && !paymentPhone)}
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
                disabled={payTarget.balance.category === "APPLICATION"}
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
                  required
                />
                <Textarea label="Reason for partial payment" value={partialReason} onChange={(e) => setPartialReason(e.target.value)} rows={3} required />
                <Input label="Date the remaining balance will be paid" type="date" value={remainingDate} onChange={(e) => setRemainingDate(e.target.value)} required />
              </>
            )}

            <p className="flex items-start gap-2 text-[12.5px] text-muted">
              <Wallet className="size-4 shrink-0 mt-0.5" />
              Payment is processed by XentriPay — MoMo sends a payment prompt to the phone above; card opens a secure checkout page.
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
              <p className="text-[13.5px] text-ink">{pendingResult.instructions ?? "Check your phone for a payment prompt."}</p>
            )}
            <p className="text-[12.5px] text-muted">Payments confirm automatically within a minute or two — tap "check status" once you've approved it.</p>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
