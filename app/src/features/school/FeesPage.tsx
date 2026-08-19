import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Pencil, Plus, Smartphone, Trash2, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select, Switch } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Can } from "@/components/auth/guards";
import { useAuth, usePermission } from "@/hooks/useAuth";
import { feeService, type RealFeeInput } from "@/services/feeService";
import { schoolService, type PaymentDestination } from "@/services/schoolService";
import type { RealSchoolFee } from "@/services/feeService";
import { toast } from "@/stores/uiStore";
import { formatRWF } from "@/lib/format";
import { P } from "@/config/permissions";
import type { ApiError } from "@/lib/api/client";

interface FeeForm {
  id?: string;
  type: RealFeeInput["type"];
  name: string;
  amount: string;
  isActive: boolean;
  isOptional: boolean;
  paymentDestinationId: string;
}

interface DestinationForm {
  id?: string;
  feeId: string;
  label: string;
  providerCode: string;
  accountName: string;
  accountNumber: string;
  phoneNumber: string;
}

const EMPTY_FEE: FeeForm = { type: "TUITION", name: "", amount: "", isActive: true, isOptional: false, paymentDestinationId: "" };
const EMPTY_DESTINATION: DestinationForm = { feeId: "", label: "", providerCode: "", accountName: "", accountNumber: "", phoneNumber: "" };

const FEE_TYPE_LABEL: Record<RealFeeInput["type"], string> = { APPLICATION: "Application", TUITION: "Tuition", OTHER: "Other" };

export default function FeesPage() {
  const { user } = useAuth();
  const { has } = usePermission();
  const qc = useQueryClient();
  const schoolId = user!.schoolId!;

  const [feeForm, setFeeForm] = useState<FeeForm | null>(null);
  const [destinationForm, setDestinationForm] = useState<DestinationForm | null>(null);
  const [removeDestination, setRemoveDestination] = useState<PaymentDestination | null>(null);

  const { data: fees = [], isLoading: loadingFees } = useQuery({
    queryKey: ["real-fees", schoolId],
    queryFn: () => feeService.realFees(schoolId),
  });

  const { data: destinations = [], isLoading: loadingDestinations } = useQuery({
    queryKey: ["payment-destinations", schoolId],
    queryFn: () => schoolService.paymentDestinations(schoolId),
  });

  const { data: providers = [] } = useQuery({
    queryKey: ["payment-providers"],
    queryFn: () => schoolService.paymentProviders(),
    enabled: Boolean(destinationForm),
  });

  const saveFee = useMutation({
    mutationFn: () => {
      const amount = Number(feeForm!.amount);
      if (feeForm!.id) {
        return feeService.updateRealFee(schoolId, feeForm!.id, {
          type: feeForm!.type, name: feeForm!.name.trim(), amount, isActive: feeForm!.isActive,
          isOptional: feeForm!.type === "OTHER" && feeForm!.isOptional,
          paymentDestinationId: feeForm!.paymentDestinationId || null,
        });
      }
      return feeService.addRealFee(schoolId, {
        type: feeForm!.type, name: feeForm!.name.trim(), amount,
        isOptional: feeForm!.type === "OTHER" && feeForm!.isOptional,
        paymentDestinationId: feeForm!.paymentDestinationId || undefined,
      });
    },
    onSuccess: () => {
      const created = !feeForm?.id;
      setFeeForm(null);
      void qc.invalidateQueries({ queryKey: ["real-fees"] });
      toast({ title: created ? "Fee created" : "Fee updated", variant: "success" });
    },
    onError: (e) => toast({ title: "Could not save fee", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const saveDestination = useMutation({
    mutationFn: () => {
      const input = {
        feeId: destinationForm!.feeId,
        label: destinationForm!.label.trim(),
        providerCode: destinationForm!.providerCode,
        accountName: destinationForm!.accountName.trim(),
        accountNumber: destinationForm!.accountNumber.trim() || undefined,
        phoneNumber: destinationForm!.phoneNumber.trim() || undefined,
      };
      return destinationForm!.id
        ? schoolService.updatePaymentDestination(schoolId, destinationForm!.id, input)
        : schoolService.addPaymentDestination(schoolId, input);
    },
    onSuccess: () => {
      const edited = Boolean(destinationForm?.id);
      setDestinationForm(null);
      void qc.invalidateQueries({ queryKey: ["payment-destinations"] });
      void qc.invalidateQueries({ queryKey: ["real-fees"] });
      toast({ title: edited ? "Payment destination updated" : "Payment destination added", variant: "success" });
    },
    onError: (e) => toast({ title: "Could not save destination", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const deleteDestination = useMutation({
    mutationFn: () => schoolService.removePaymentDestination(schoolId, removeDestination!.id),
    onSuccess: () => {
      setRemoveDestination(null);
      void qc.invalidateQueries({ queryKey: ["payment-destinations"] });
      void qc.invalidateQueries({ queryKey: ["real-fees"] });
      toast({ title: "Payment destination removed", variant: "success" });
    },
    onError: (e) => toast({ title: "Could not remove destination", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const amountNum = feeForm ? Number(feeForm.amount) : 0;
  const feeValid = Boolean(feeForm && feeForm.name.trim() && feeForm.amount !== "" && Number.isFinite(amountNum) && amountNum > 0);
  const selectedProvider = providers.find((p) => p.code === destinationForm?.providerCode);
  const activeDestinations = destinations.filter((destination) => destination.isActive);

  return (
    <PageTransition>
      <PageHeader
        title="Fees"
        description="Configure what families are billed, and where payments land. Only active fees are listed — the backend has no fee-history endpoint."
      />

      <div className="grid xl:grid-cols-[1fr_360px] gap-4 items-start">
        <section className="min-w-0" aria-label="Fees">
          <div className="flex items-center justify-between mt-2 mb-3">
            <h2 className="font-display font-semibold text-[15px] text-ink">Active fees</h2>
            <Can permission={P.FEES_CONFIGURE}>
              <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setFeeForm({ ...EMPTY_FEE })}>New fee</Button>
            </Can>
          </div>

          {!loadingFees && fees.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No fees configured"
              description="Families see nothing to pay until a fee exists."
              action={has(P.FEES_CONFIGURE) ? <Button icon={<Plus className="size-4" />} onClick={() => setFeeForm({ ...EMPTY_FEE })}>New fee</Button> : undefined}
            />
          ) : (
            <DataTable<RealSchoolFee>
              loading={loadingFees}
              columns={[
                { key: "name", header: "Fee", render: (f) => <span className="font-medium text-ink">{f.name}</span> },
                { key: "type", header: "Type", render: (f) => <span>{FEE_TYPE_LABEL[f.type]} {f.isOptional && <Badge variant="neutral">Optional</Badge>}</span> },
                {
                  key: "isActive",
                  header: "Status",
                  render: (f) => (f.isActive === false ? <Badge variant="neutral">Inactive</Badge> : <Badge variant="success">Active</Badge>),
                },
                { key: "amount", header: "Amount", align: "right", render: (f) => <span className="tnum font-semibold">{formatRWF(f.amount)}</span> },
              ]}
              rows={fees}
              keyField={(f) => f.id}
              onRowClick={
                has(P.FEES_CONFIGURE)
                  ? (f) => setFeeForm({
                      id: f.id, type: f.type, name: f.name, amount: String(f.amount),
                      isActive: f.isActive ?? true, isOptional: f.isOptional ?? false, paymentDestinationId: f.paymentDestinationId ?? "",
                    })
                  : undefined
              }
              empty="No fees configured."
            />
          )}
        </section>

        <section aria-label="Payment destinations">
          <h2 className="font-display font-semibold text-[15px] text-ink mt-2 mb-3">Payment destinations</h2>
          <FadeIn>
            <Card padded={false}>
              <CardHeader
                className="px-4 pt-4"
                title="Where parents pay"
                description="Bank accounts or mobile-money lines fees can be routed to."
                action={
                  <Can permission={P.FEES_CONFIGURE}>
                    <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setDestinationForm({ ...EMPTY_DESTINATION })}>
                      Add
                    </Button>
                  </Can>
                }
              />
              {loadingDestinations ? (
                <div className="px-4 pb-4"><CardSkeleton /></div>
              ) : activeDestinations.length === 0 ? (
                <p className="px-4 py-6 text-center text-[13px] text-muted">No payment destinations yet.</p>
              ) : (
                <div className="divide-y divide-line">
                  {activeDestinations.map((d: PaymentDestination) => {
                    const Icon = d.type === "BANK" ? Landmark : Smartphone;
                    return (
                      <div key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-ink/6 text-muted">
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-ink truncate">{d.label}</p>
                          <p className="text-[12px] text-muted">
                            {d.providerName} · <span className="tnum">{d.accountNumber ?? d.phoneNumber}</span>
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Badge variant="success" dot>Active</Badge>
                          <Can permission={P.FEES_CONFIGURE}>
                            <button
                              type="button"
                              onClick={() => setDestinationForm({
                                id: d.id,
                                feeId: fees.find((fee) => fee.paymentDestinationId === d.id)?.id ?? "",
                                label: d.label,
                                providerCode: d.providerCode,
                                accountName: d.accountName,
                                accountNumber: d.accountNumber ?? "",
                                phoneNumber: d.phoneNumber ?? "",
                              })}
                              className="rounded p-1.5 text-muted transition-colors hover:bg-paper hover:text-ink"
                              aria-label={`Edit ${d.label}`}
                            >
                              <Pencil className="size-3.5" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRemoveDestination(d)}
                              className="rounded p-1.5 text-muted transition-colors hover:bg-clay-soft hover:text-clay-deep"
                              aria-label={`Remove ${d.label}`}
                            >
                              <Trash2 className="size-3.5" aria-hidden />
                            </button>
                          </Can>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </FadeIn>
        </section>
      </div>

      {/* Fee modal */}
      <Modal
        open={Boolean(feeForm)}
        onClose={() => !saveFee.isPending && setFeeForm(null)}
        title={feeForm?.id ? "Edit fee" : "New fee"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFeeForm(null)} disabled={saveFee.isPending}>Cancel</Button>
            <Button loading={saveFee.isPending} disabled={!feeValid} onClick={() => saveFee.mutate()}>
              {feeForm?.id ? "Save changes" : "Create fee"}
            </Button>
          </>
        }
      >
        {feeForm && (
          <div className="space-y-3.5">
            <Input label="Fee name" required value={feeForm.name} onChange={(e) => setFeeForm({ ...feeForm, name: e.target.value })} placeholder="e.g. Tuition" />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Type" value={feeForm.type} onChange={(e) => { const type = e.target.value as RealFeeInput["type"]; setFeeForm({ ...feeForm, type, isOptional: type === "OTHER" ? feeForm.isOptional : false }); }}>
                {Object.entries(FEE_TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
              <Input label="Amount (RWF)" type="number" min={1} required value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })} />
            </div>
            {feeForm.type === "OTHER" && (
              <Switch checked={feeForm.isOptional} onChange={(value) => setFeeForm({ ...feeForm, isOptional: value })} label="Parents choose whether each child uses this service" />
            )}
            <Select label="Payment destination" hint="Optional — where payments for this fee are routed." value={feeForm.paymentDestinationId} onChange={(e) => setFeeForm({ ...feeForm, paymentDestinationId: e.target.value })}>
              <option value="">No specific destination</option>
              {activeDestinations.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </Select>
            {feeForm.id && (
              <Switch checked={feeForm.isActive} onChange={(v) => setFeeForm({ ...feeForm, isActive: v })} label="Fee is active" />
            )}
          </div>
        )}
      </Modal>

      {/* Destination modal */}
      <Modal
        open={Boolean(destinationForm)}
        onClose={() => !saveDestination.isPending && setDestinationForm(null)}
        title={destinationForm?.id ? "Edit payment destination" : "Add payment destination"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDestinationForm(null)} disabled={saveDestination.isPending}>Cancel</Button>
            <Button
              loading={saveDestination.isPending}
              disabled={!destinationForm?.feeId || !destinationForm?.label.trim() || !destinationForm?.providerCode || !destinationForm?.accountName.trim()}
              onClick={() => saveDestination.mutate()}
            >
              {destinationForm?.id ? "Save changes" : "Add destination"}
            </Button>
          </>
        }
      >
        {destinationForm && (
          <div className="space-y-3.5">
            <Select
              label="Fee to route"
              value={destinationForm.feeId}
              onChange={(e) => setDestinationForm({ ...destinationForm, feeId: e.target.value })}
              hint="Choose which active fee will send parent payments to this destination."
              required
            >
              <option value="">Select a fee…</option>
              {fees.map((fee) => (
                <option key={fee.id} value={fee.id}>{fee.name} ({FEE_TYPE_LABEL[fee.type]})</option>
              ))}
            </Select>
            <Select label="Provider" value={destinationForm.providerCode} onChange={(e) => setDestinationForm({ ...destinationForm, providerCode: e.target.value })}>
              <option value="">Select a provider…</option>
              {providers.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </Select>
            <Input label="Label" required value={destinationForm.label} onChange={(e) => setDestinationForm({ ...destinationForm, label: e.target.value })} placeholder="e.g. School fees account" />
            <Input label="Account name" required value={destinationForm.accountName} onChange={(e) => setDestinationForm({ ...destinationForm, accountName: e.target.value })} />
            {selectedProvider?.type === "BANK" ? (
              <Input label="Account number" required value={destinationForm.accountNumber} onChange={(e) => setDestinationForm({ ...destinationForm, accountNumber: e.target.value })} />
            ) : (
              <Input label="Phone number" required value={destinationForm.phoneNumber} onChange={(e) => setDestinationForm({ ...destinationForm, phoneNumber: e.target.value })} placeholder="07xxxxxxxx" />
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(removeDestination)}
        onClose={() => !deleteDestination.isPending && setRemoveDestination(null)}
        title="Remove payment destination?"
        description={removeDestination ? `${removeDestination.label} will no longer be available for new parent payments.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoveDestination(null)} disabled={deleteDestination.isPending}>Cancel</Button>
            <Button variant="danger" loading={deleteDestination.isPending} onClick={() => deleteDestination.mutate()}>
              Remove destination
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] text-muted">
          Any fee assigned to this destination will be unassigned. Historical payment records are preserved.
        </p>
      </Modal>
    </PageTransition>
  );
}
