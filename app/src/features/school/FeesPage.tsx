import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Plus, Smartphone, Trash2, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Checkbox, Input, Select, Switch } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Can } from "@/components/auth/guards";
import { useAuth, usePermission } from "@/hooks/useAuth";
import { academicService } from "@/services/academicService";
import { feeService } from "@/services/feeService";
import { toast } from "@/stores/uiStore";
import { formatRWF } from "@/lib/format";
import { CHANNEL_LABEL, FEE_CATEGORY_LABEL, LEVEL_LABEL } from "@/lib/status";
import { P } from "@/config/permissions";
import type { ApiError } from "@/lib/api/client";
import type { FeeCategory, FeeStructure, PaymentChannel, PaymentChannelType, SchoolLevel } from "@/types";

interface FeeForm {
  id?: string;
  name: string;
  category: FeeCategory;
  amount: string;
  level: SchoolLevel | "";
  optional: boolean;
}

interface ChannelForm {
  type: PaymentChannelType;
  label: string;
  accountNumber: string;
}

const EMPTY_FEE: FeeForm = { name: "", category: "TUITION", amount: "", level: "", optional: false };
const EMPTY_CHANNEL: ChannelForm = { type: "BANK", label: "", accountNumber: "" };

export default function FeesPage() {
  const { user } = useAuth();
  const { has } = usePermission();
  const qc = useQueryClient();
  const schoolId = user!.schoolId!;

  const [termId, setTermId] = useState<string>();
  const [feeForm, setFeeForm] = useState<FeeForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeeStructure | null>(null);
  const [channelForm, setChannelForm] = useState<ChannelForm | null>(null);

  const { data: terms = [] } = useQuery({ queryKey: ["terms"], queryFn: () => academicService.terms() });
  const effectiveTermId = termId ?? terms.find((t) => t.current)?.id;

  const { data: fees = [], isLoading: loadingFees } = useQuery({
    queryKey: ["fees", schoolId, effectiveTermId],
    queryFn: () => feeService.structures(schoolId, effectiveTermId),
    enabled: Boolean(effectiveTermId),
  });

  const { data: channels = [], isLoading: loadingChannels } = useQuery({
    queryKey: ["channels", schoolId],
    queryFn: () => feeService.channels(schoolId),
  });

  const saveFee = useMutation({
    mutationFn: () =>
      feeService.save({
        id: feeForm!.id,
        schoolId,
        name: feeForm!.name.trim(),
        category: feeForm!.category,
        amount: Number(feeForm!.amount),
        level: feeForm!.level || undefined,
        termId: effectiveTermId!,
        optional: feeForm!.optional,
      }),
    onSuccess: () => {
      const created = !feeForm?.id;
      setFeeForm(null);
      void qc.invalidateQueries({ queryKey: ["fees"] });
      toast({ title: created ? "Fee created" : "Fee updated", variant: "success" });
    },
    onError: (e) =>
      toast({ title: "Could not save fee", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const removeFee = useMutation({
    mutationFn: () => feeService.remove(deleteTarget!.id),
    onSuccess: () => {
      setDeleteTarget(null);
      setFeeForm(null);
      void qc.invalidateQueries({ queryKey: ["fees"] });
      toast({ title: "Fee deleted", variant: "success" });
    },
    onError: (e) =>
      toast({ title: "Could not delete fee", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const toggleChannel = useMutation({
    mutationFn: (ch: PaymentChannel) => feeService.saveChannel({ ...ch, active: !ch.active }),
    onSuccess: (ch) => {
      void qc.invalidateQueries({ queryKey: ["channels"] });
      toast({ title: ch.active ? "Channel activated" : "Channel deactivated", variant: "success" });
    },
    onError: (e) =>
      toast({ title: "Could not update channel", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const addChannel = useMutation({
    mutationFn: () =>
      feeService.saveChannel({
        schoolId,
        type: channelForm!.type,
        label: channelForm!.label.trim(),
        accountNumber: channelForm!.accountNumber.trim(),
        active: true,
      }),
    onSuccess: () => {
      setChannelForm(null);
      void qc.invalidateQueries({ queryKey: ["channels"] });
      toast({ title: "Channel added", variant: "success" });
    },
    onError: (e) =>
      toast({ title: "Could not add channel", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const amountNum = feeForm ? Number(feeForm.amount) : 0;
  const feeValid = Boolean(feeForm && feeForm.name.trim() && feeForm.amount !== "" && Number.isFinite(amountNum) && amountNum > 0);
  const channelIcon = (t: PaymentChannelType) => (t === "BANK" ? Landmark : Smartphone);
  const currentTermLabel = terms.find((t) => t.id === effectiveTermId)?.label;

  return (
    <PageTransition>
      <PageHeader
        title="Fees"
        description="Configure what families are billed each term, and where they can pay."
        actions={
          <Select
            aria-label="Select term"
            value={effectiveTermId ?? ""}
            onChange={(e) => setTermId(e.target.value)}
            className="w-40"
          >
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        }
      />

      {/* Fee structures */}
      <div className="flex items-center justify-between mt-2 mb-3">
        <h2 className="font-display font-semibold text-[15px] text-ink">
          Fee structures{currentTermLabel ? ` — ${currentTermLabel}` : ""}
        </h2>
        <Can permission={P.FEES_CONFIGURE}>
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setFeeForm({ ...EMPTY_FEE })}>
            New fee
          </Button>
        </Can>
      </div>

      {!loadingFees && fees.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No fees configured for this term"
          description="Families see nothing to pay until fee structures exist for the term."
          action={
            has(P.FEES_CONFIGURE) ? (
              <Button icon={<Plus className="size-4" />} onClick={() => setFeeForm({ ...EMPTY_FEE })}>
                New fee
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable<FeeStructure>
          loading={loadingFees}
          columns={[
            { key: "name", header: "Fee", render: (f) => <span className="font-medium text-ink">{f.name}</span> },
            { key: "category", header: "Category", render: (f) => FEE_CATEGORY_LABEL[f.category] },
            { key: "level", header: "Applies to", render: (f) => (f.level ? LEVEL_LABEL[f.level] : "All levels") },
            {
              key: "optional",
              header: "Billing",
              render: (f) =>
                f.optional ? <Badge variant="neutral">Optional</Badge> : <Badge variant="info">Required</Badge>,
            },
            {
              key: "amount",
              header: "Amount",
              align: "right",
              render: (f) => <span className="tnum font-semibold">{formatRWF(f.amount)}</span>,
            },
          ]}
          rows={fees}
          keyField={(f) => f.id}
          onRowClick={
            has(P.FEES_CONFIGURE)
              ? (f) =>
                  setFeeForm({
                    id: f.id,
                    name: f.name,
                    category: f.category,
                    amount: String(f.amount),
                    level: f.level ?? "",
                    optional: f.optional,
                  })
              : undefined
          }
          empty="No fees configured for this term."
        />
      )}

      {/* Payment channels */}
      <h2 className="font-display font-semibold text-[15px] text-ink mt-7 mb-3">Payment channels</h2>
      <FadeIn>
        <Card padded={false} className="max-w-3xl">
          <CardHeader
            className="px-4 pt-4"
            title="Where parents can pay"
            description="Active channels are offered at checkout and for offline recording."
            action={
              <Can permission={P.FEES_CONFIGURE}>
                <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setChannelForm({ ...EMPTY_CHANNEL })}>
                  Add channel
                </Button>
              </Can>
            }
          />
          {loadingChannels ? (
            <div className="px-4 pb-4">
              <CardSkeleton />
            </div>
          ) : channels.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-muted">
              No payment channels yet — add a bank account or MoMo line.
            </p>
          ) : (
            <div className="divide-y divide-line">
              {channels.map((ch) => {
                const Icon = channelIcon(ch.type);
                return (
                  <div key={ch.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-ink/6 text-muted">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-ink truncate">{ch.label}</p>
                      <p className="text-[12px] text-muted">
                        {CHANNEL_LABEL[ch.type]} · <span className="tnum">{ch.accountNumber}</span>
                      </p>
                    </div>
                    {has(P.FEES_CONFIGURE) ? (
                      <Switch
                        checked={ch.active}
                        onChange={() => toggleChannel.mutate(ch)}
                        disabled={toggleChannel.isPending && toggleChannel.variables?.id === ch.id}
                        label={`${ch.active ? "Deactivate" : "Activate"} ${ch.label}`}
                      />
                    ) : (
                      <Badge variant={ch.active ? "success" : "neutral"} dot>
                        {ch.active ? "Active" : "Inactive"}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </FadeIn>

      {/* Fee create/edit modal */}
      <Modal
        open={Boolean(feeForm)}
        onClose={() => !saveFee.isPending && setFeeForm(null)}
        title={feeForm?.id ? "Edit fee" : "New fee"}
        description={currentTermLabel ? `Applies to ${currentTermLabel}.` : undefined}
        footer={
          <>
            {feeForm?.id && (
              <Button
                variant="ghost"
                className="mr-auto text-clay-deep"
                icon={<Trash2 className="size-4" />}
                disabled={saveFee.isPending}
                onClick={() => setDeleteTarget(fees.find((f) => f.id === feeForm.id) ?? null)}
              >
                Delete
              </Button>
            )}
            <Button variant="ghost" onClick={() => setFeeForm(null)} disabled={saveFee.isPending}>
              Cancel
            </Button>
            <Button loading={saveFee.isPending} disabled={!feeValid} onClick={() => saveFee.mutate()}>
              {feeForm?.id ? "Save changes" : "Create fee"}
            </Button>
          </>
        }
      >
        {feeForm && (
          <div className="space-y-3.5">
            <Input
              label="Fee name"
              required
              value={feeForm.name}
              onChange={(e) => setFeeForm({ ...feeForm, name: e.target.value })}
              placeholder="e.g. Tuition — Term 2"
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Category"
                value={feeForm.category}
                onChange={(e) => setFeeForm({ ...feeForm, category: e.target.value as FeeCategory })}
              >
                {Object.entries(FEE_CATEGORY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Input
                label="Amount (RWF)"
                type="number"
                min={1}
                required
                value={feeForm.amount}
                onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
              />
            </div>
            <Select
              label="Applies to"
              value={feeForm.level}
              onChange={(e) => setFeeForm({ ...feeForm, level: e.target.value as SchoolLevel | "" })}
            >
              <option value="">All levels</option>
              {Object.entries(LEVEL_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Checkbox
              label="Optional fee"
              description="Families opt in — it is not billed automatically."
              checked={feeForm.optional}
              onChange={(e) => setFeeForm({ ...feeForm, optional: e.target.checked })}
            />
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !removeFee.isPending && setDeleteTarget(null)}
        title="Delete fee?"
        description={deleteTarget ? `“${deleteTarget.name}” will be removed from this term's fee structure.` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={removeFee.isPending}>
              Cancel
            </Button>
            <Button variant="danger" loading={removeFee.isPending} onClick={() => removeFee.mutate()}>
              Delete fee
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] text-muted">
          Existing payments keep their history — only the fee configuration is removed.
        </p>
      </Modal>

      {/* Add channel modal */}
      <Modal
        open={Boolean(channelForm)}
        onClose={() => !addChannel.isPending && setChannelForm(null)}
        title="Add payment channel"
        description="A bank account or mobile money line parents can pay into."
        footer={
          <>
            <Button variant="ghost" onClick={() => setChannelForm(null)} disabled={addChannel.isPending}>
              Cancel
            </Button>
            <Button
              loading={addChannel.isPending}
              disabled={!channelForm || !channelForm.label.trim() || !channelForm.accountNumber.trim()}
              onClick={() => addChannel.mutate()}
            >
              Add channel
            </Button>
          </>
        }
      >
        {channelForm && (
          <div className="space-y-3.5">
            <Select
              label="Type"
              value={channelForm.type}
              onChange={(e) => setChannelForm({ ...channelForm, type: e.target.value as PaymentChannelType })}
            >
              {Object.entries(CHANNEL_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Input
              label="Label"
              required
              value={channelForm.label}
              onChange={(e) => setChannelForm({ ...channelForm, label: e.target.value })}
              placeholder="e.g. School fees account"
            />
            <Input
              label="Account number"
              required
              value={channelForm.accountNumber}
              onChange={(e) => setChannelForm({ ...channelForm, accountNumber: e.target.value })}
              placeholder="e.g. 100-2244-5678"
            />
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
