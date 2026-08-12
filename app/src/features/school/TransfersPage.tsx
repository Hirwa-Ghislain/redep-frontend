import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Check, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { transferService } from "@/services/transferService";
import { toast } from "@/stores/uiStore";
import { formatDate } from "@/lib/format";
import { TRANSFER_STATUS } from "@/lib/status";
import type { ApiError } from "@/lib/api/client";
import type { TransferRequest } from "@/types";

export default function TransfersPage() {
  const { user } = useAuth();
  const schoolId = user!.schoolId!;
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["transfers", schoolId],
    queryFn: () => transferService.listBySchool(schoolId),
  });

  const decide = useMutation({
    mutationFn: async (input: { id: string; approve: boolean }): Promise<void> => {
      await transferService.resolveReal(schoolId, input.id, input.approve);
    },
    onSuccess: (_result, input) => {
      void qc.invalidateQueries({ queryKey: ["transfers", schoolId] });
      toast({
        title: input.approve ? "Withdrawal approved" : "Withdrawal rejected",
        description: input.approve ? "The student's seat has been released." : "The family has been notified.",
        variant: "success",
      });
    },
    onError: (e) => toast({ title: "Could not decide", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const pending = requests.filter((r) => r.status === "PENDING");
  const history = requests.filter((r) => r.status !== "PENDING");

  return (
    <PageTransition>
      <PageHeader
        title="Transfers & exits"
        description="Single-school withdrawal requests. Moving to a different school isn't a 'transfer' here — parents apply fresh via Discover schools."
      />

      <h2 className="font-display font-semibold text-[15px] text-ink mb-3">
        Pending requests{pending.length > 0 && <span className="text-muted font-body font-normal text-[13px]"> · {pending.length}</span>}
      </h2>
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-3.5"><CardSkeleton /><CardSkeleton /></div>
      ) : pending.length === 0 ? (
        <Card className="max-w-xl">
          <EmptyState icon={ArrowLeftRight} title="No pending requests" description="New resignation requests from parents will appear here." className="py-8" />
        </Card>
      ) : (
        <DataTable<TransferRequest>
          columns={[
            { key: "studentName", header: "Student", render: (r) => <span className="font-medium text-ink">{r.studentName}</span> },
            { key: "reason", header: "Reason", render: (r) => <span className="text-muted line-clamp-1">{r.reason}</span> },
            { key: "requestedAt", header: "Requested", render: (r) => <span className="tnum text-muted">{formatDate(r.requestedAt)}</span> },
            {
              key: "actions",
              header: "",
              render: (r) => (
                <div className="flex justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Check className="size-3.5" />}
                    loading={decide.isPending}
                    onClick={() => decide.mutate({ id: r.id, approve: true })}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<X className="size-3.5" />}
                    loading={decide.isPending}
                    onClick={() => decide.mutate({ id: r.id, approve: false })}
                  >
                    Reject
                  </Button>
                </div>
              ),
            },
          ]}
          rows={pending}
          keyField={(r) => r.id}
          empty="No pending requests."
        />
      )}

      <h2 className="font-display font-semibold text-[15px] text-ink mt-7 mb-3">History</h2>
      <DataTable<TransferRequest>
        loading={isLoading}
        columns={[
          { key: "studentName", header: "Student", render: (r) => <span className="font-medium text-ink">{r.studentName}</span> },
          { key: "requestedAt", header: "Requested", render: (r) => <span className="tnum text-muted">{formatDate(r.requestedAt)}</span> },
          { key: "status", header: "Status", render: (r) => {
            const meta = TRANSFER_STATUS[r.status];
            return <Badge variant={meta.variant} dot>{meta.label}</Badge>;
          } },
        ]}
        rows={history}
        keyField={(r) => r.id}
        pageSize={8}
        empty="No resolved requests yet."
      />
    </PageTransition>
  );
}
