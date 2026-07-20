import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { academicService } from "@/services/academicService";
import { feeService } from "@/services/feeService";
import { paymentService } from "@/services/paymentService";
import { studentService } from "@/services/studentService";
import { toast } from "@/stores/uiStore";
import { formatDateTime, formatRWF, fullName } from "@/lib/format";
import { CHANNEL_LABEL, FEE_CATEGORY_LABEL, PAYMENT_STATUS } from "@/lib/status";
import type { FeeBalance, Payment, PaymentChannelType } from "@/types";
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
  const [channel, setChannel] = useState<PaymentChannelType>("MOMO_MTN");
  const [lastReference, setLastReference] = useState<string | null>(null);

  const { data: term } = useQuery({ queryKey: ["current-term"], queryFn: () => academicService.currentTerm() });
  const { data: children = [], isLoading: loadingChildren } = useQuery({
    queryKey: ["children", user?.id],
    queryFn: () => studentService.listByParent(user!.id),
    enabled: Boolean(user),
  });
  const enrolled = useMemo(() => children.filter((c) => c.status === "ENROLLED"), [children]);

  const { data: balancesByChild = [], isLoading: loadingBalances } = useQuery({
    queryKey: ["balances-all", user?.id, term?.id, enrolled.length],
    queryFn: async () => {
      const results = await Promise.all(enrolled.map((c) => feeService.balances(c.id, term!.id)));
      return enrolled.map((child, i) => ({ child, balances: results[i]! }));
    },
    enabled: Boolean(term) && enrolled.length > 0,
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["payments", user?.id],
    queryFn: () => paymentService.listByParent(user!.id),
    enabled: Boolean(user),
  });

  const { data: channels = [] } = useQuery({
    queryKey: ["channels", payTarget?.schoolId],
    queryFn: () => feeService.channels(payTarget!.schoolId),
    enabled: Boolean(payTarget),
  });

  const pay = useMutation({
    mutationFn: () =>
      paymentService.pay({
        studentId: payTarget!.balance.studentId,
        feeStructureId: payTarget!.balance.feeStructureId,
        amount: payTarget!.balance.due,
        channelType: channel,
      }),
    onSuccess: ({ receipt }) => {
      setPayTarget(null);
      setLastReference(receipt.reference);
      void qc.invalidateQueries({ queryKey: ["balances-all"] });
      void qc.invalidateQueries({ queryKey: ["payments"] });
      void qc.invalidateQueries({ queryKey: ["parent-due"] });
      toast({
        title: "Payment successful",
        description: `Receipt ${receipt.reference} issued — find it under Receipts.`,
        variant: "success",
      });
    },
    onError: () => toast({ title: "Payment failed", description: "No money moved. Try again.", variant: "error" }),
  });

  const totalDue = balancesByChild.flatMap((b) => b.balances).reduce((s, b) => s + b.due, 0);
  const channelIcon = (t: PaymentChannelType) => (t === "BANK" ? Landmark : Smartphone);

  return (
    <PageTransition>
      <PageHeader
        title="Fees & payments"
        description={term ? `Balances for ${term.label} across all your children.` : undefined}
        actions={
          totalDue > 0 ? (
            <div className="rounded-(--radius-card) border border-line bg-surface shadow-(--shadow-card) px-3.5 py-2 text-right">
              <p className="text-[11px] font-medium text-muted">Total outstanding</p>
              <p className="font-display text-[16px] leading-5 font-bold text-clay-deep tnum">{formatRWF(totalDue)}</p>
            </div>
          ) : undefined
        }
      />

      {lastReference && (
        <FadeIn>
          <div className="mb-5 flex items-center gap-3 rounded-(--radius-card) border border-primary/40 bg-primary-soft/60 px-4 py-3">
            <ShieldCheck className="size-5 text-primary-deep shrink-0" />
            <p className="text-[13.5px] text-primary-deep">
              Payment confirmed — receipt <span className="font-semibold tnum">{lastReference}</span> was added to your receipts.
            </p>
          </div>
        </FadeIn>
      )}

      {/* Balances per child */}
      {loadingChildren || loadingBalances ? (
        <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div>
      ) : (
        <div className="space-y-4">
          {balancesByChild.map(({ child, balances }) => {
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
                        onClick={() => {
                          setPayTarget({ balance: b, studentName: fullName(child), schoolId: child.schoolId });
                          setChannel("MOMO_MTN");
                        }}
                      >
                        {b.due === 0 ? "Paid" : "Pay"}
                      </Button>
                    </div>
                  ))}
                  {balances.length === 0 && (
                    <p className="px-5 py-5 text-[13px] text-muted">No fees configured for this term yet.</p>
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
        empty="No payments yet."
      />

      {/* Pay modal */}
      <Modal
        open={Boolean(payTarget)}
        onClose={() => !pay.isPending && setPayTarget(null)}
        title="Confirm payment"
        description={payTarget ? `${payTarget.balance.feeName} — ${payTarget.studentName}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPayTarget(null)} disabled={pay.isPending}>Cancel</Button>
            <Button loading={pay.isPending} onClick={() => pay.mutate()}>
              {pay.isPending ? "Processing…" : `Pay ${payTarget ? formatRWF(payTarget.balance.due) : ""}`}
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
              <p className="text-[13px] font-medium text-ink mb-2">Pay with</p>
              <div className="space-y-2" role="radiogroup" aria-label="Payment channel">
                {channels.filter((c) => c.active).map((c) => {
                  const Icon = channelIcon(c.type);
                  const selected = channel === c.type;
                  return (
                    <button
                      key={c.id}
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setChannel(c.type)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-(--radius-card) border p-3.5 text-left transition-all",
                        selected ? "border-primary bg-primary-soft/50 ring-2 ring-primary/15" : "border-line hover:border-line-strong",
                      )}
                    >
                      <span className={cn("flex size-9 items-center justify-center rounded-xl", selected ? "bg-primary text-white" : "bg-ink/6 text-muted")}>
                        <Icon className="size-4.5" />
                      </span>
                      <span className="flex-1">
                        <span className="block text-[13.5px] font-semibold text-ink">{CHANNEL_LABEL[c.type]}</span>
                        <span className="block text-[12px] text-muted">{c.label} · {c.accountNumber}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="flex items-start gap-2 text-[12.5px] text-muted">
              <Wallet className="size-4 shrink-0 mt-0.5" />
              Demo environment — this simulates the MoMo/bank flow and issues a real in-app receipt. No money moves.
            </p>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
