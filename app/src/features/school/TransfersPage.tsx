import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, CheckCircle2, Info, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Can } from "@/components/auth/guards";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { P } from "@/config/permissions";
import { transferService } from "@/services/transferService";
import { toast } from "@/stores/uiStore";
import { formatDate, fullName } from "@/lib/format";
import { TRANSFER_STATUS } from "@/lib/status";
import type { ApiError } from "@/lib/api/client";
import type { TransferRequest } from "@/types";

type ResolveAction = { request: TransferRequest; action: "CONFIRMED" | "REJECTED" };

export default function TransfersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [pendingAction, setPendingAction] = useState<ResolveAction | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["transfers", user?.schoolId],
    queryFn: () => transferService.listBySchool(user!.schoolId!),
    enabled: Boolean(user?.schoolId),
  });

  const pending = requests.filter((r) => r.status === "PENDING");
  const history = requests.filter((r) => r.status !== "PENDING");

  const resolve = useMutation({
    mutationFn: ({ request, action }: ResolveAction) => transferService.resolve(request.id, action, fullName(user!)),
    onSuccess: (resolved) => {
      setPendingAction(null);
      void qc.invalidateQueries({ queryKey: ["transfers"] });
      toast({
        title: resolved.status === "CONFIRMED" ? "Departure confirmed" : "Request rejected",
        description:
          resolved.status === "CONFIRMED"
            ? `${resolved.studentName}'s seat has been released and the parent notified.`
            : `${resolved.parentName} has been notified of the decision.`,
        variant: "success",
      });
    },
    onError: (e) => toast({ title: "Could not resolve request", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  return (
    <PageTransition>
      <PageHeader
        title="Transfers & exits"
        description="Parents' transfer and resignation requests — confirming releases the seat and archives the student."
      />

      {/* Pending requests */}
      <h2 className="font-display font-semibold text-[15px] text-ink mb-3">
        Pending requests{pending.length > 0 && <span className="text-muted font-body font-normal text-[13px]"> · {pending.length}</span>}
      </h2>
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-3.5"><CardSkeleton /><CardSkeleton /></div>
      ) : pending.length === 0 ? (
        <Card className="max-w-xl">
          <EmptyState
            icon={ArrowLeftRight}
            title="No pending requests"
            description="New transfer or resignation requests from parents will appear here for review."
            className="py-8"
          />
        </Card>
      ) : (
        <Stagger className="grid md:grid-cols-2 gap-3.5">
          {pending.map((r) => (
            <StaggerItem key={r.id} className="h-full">
              <Card padded={false} className="p-4 h-full flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display font-bold text-[14px] text-ink">{r.studentName}</p>
                    <p className="text-[12px] text-muted mt-0.5">Requested by {r.parentName}</p>
                  </div>
                  <Badge variant={r.type === "TRANSFER" ? "info" : "neutral"}>
                    {r.type === "TRANSFER" ? "Transfer" : "Resignation"}
                  </Badge>
                </div>
                <blockquote className="text-[13px] text-ink mt-2.5 border-l-2 border-line-strong pl-3 flex-1">
                  “{r.reason}”
                </blockquote>
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-line">
                  <span className="text-[11.5px] text-faint tnum mr-auto">Requested {formatDate(r.requestedAt)}</span>
                  <Can permission={P.TRANSFERS_MANAGE}>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<XCircle className="size-3.5" />}
                      onClick={() => setPendingAction({ request: r, action: "REJECTED" })}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<CheckCircle2 className="size-3.5" />}
                      onClick={() => setPendingAction({ request: r, action: "CONFIRMED" })}
                    >
                      Confirm departure
                    </Button>
                  </Can>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {/* History */}
      <h2 className="font-display font-semibold text-[15px] text-ink mt-7 mb-3">History</h2>
      <FadeIn>
        <DataTable<TransferRequest>
          loading={isLoading}
          columns={[
            { key: "studentName", header: "Student", render: (r) => <span className="font-medium text-ink">{r.studentName}</span> },
            { key: "type", header: "Type", render: (r) => (r.type === "TRANSFER" ? "Transfer" : "Resignation") },
            { key: "parentName", header: "Requested by", render: (r) => <span className="text-muted">{r.parentName}</span> },
            { key: "requestedAt", header: "Requested", render: (r) => <span className="tnum text-muted">{formatDate(r.requestedAt)}</span> },
            {
              key: "resolvedAt",
              header: "Resolved",
              render: (r) => <span className="tnum text-muted">{r.resolvedAt ? formatDate(r.resolvedAt) : "—"}</span>,
            },
            {
              key: "status",
              header: "Status",
              render: (r) => {
                const meta = TRANSFER_STATUS[r.status];
                return <Badge variant={meta.variant} dot>{meta.label}</Badge>;
              },
            },
          ]}
          rows={history}
          keyField={(r) => r.id}
          pageSize={8}
          empty="No resolved requests yet."
        />
      </FadeIn>

      {/* Resolve confirm */}
      <Modal
        open={Boolean(pendingAction)}
        onClose={() => !resolve.isPending && setPendingAction(null)}
        title={pendingAction?.action === "CONFIRMED" ? "Confirm departure?" : "Reject request?"}
        description={
          pendingAction
            ? `${pendingAction.request.studentName} — ${pendingAction.request.type === "TRANSFER" ? "transfer" : "resignation"} requested by ${pendingAction.request.parentName}.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingAction(null)} disabled={resolve.isPending}>Cancel</Button>
            <Button
              variant={pendingAction?.action === "CONFIRMED" ? "danger" : "primary"}
              loading={resolve.isPending}
              onClick={() => pendingAction && resolve.mutate(pendingAction)}
            >
              {pendingAction?.action === "CONFIRMED" ? "Confirm departure" : "Reject request"}
            </Button>
          </>
        }
      >
        {pendingAction?.action === "CONFIRMED" ? (
          <div className="flex items-start gap-2.5 rounded-xl bg-clay-soft px-4 py-3 text-[13px] text-clay-deep">
            <Info className="size-4 shrink-0 mt-0.5" aria-hidden />
            <span>
              Confirming immediately releases the seat, moves the student to Former students and updates the school's
              enrollment count. The parent keeps read-only access to receipts and academic history. This cannot be undone.
            </span>
          </div>
        ) : (
          <p className="text-[13.5px] text-muted">
            The student stays enrolled and the parent is notified to contact the school office for details.
          </p>
        )}
      </Modal>
    </PageTransition>
  );
}
