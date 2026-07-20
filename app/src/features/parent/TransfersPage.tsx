import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Info } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select, Textarea } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { studentService } from "@/services/studentService";
import { transferService } from "@/services/transferService";
import { toast } from "@/stores/uiStore";
import { formatDate, fullName } from "@/lib/format";
import { TRANSFER_STATUS } from "@/lib/status";
import type { ApiError } from "@/lib/api/client";

export default function TransfersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState<"TRANSFER" | "RESIGNATION">("TRANSFER");
  const [reason, setReason] = useState("");

  const { data: children = [] } = useQuery({
    queryKey: ["children", user?.id],
    queryFn: () => studentService.listByParent(user!.id),
    enabled: Boolean(user),
  });
  const enrolled = children.filter((c) => c.status === "ENROLLED");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["transfers", user?.id],
    queryFn: () => transferService.listByParent(user!.id),
    enabled: Boolean(user),
  });

  const submit = useMutation({
    mutationFn: () =>
      transferService.create({
        studentId,
        parentId: user!.id,
        parentName: fullName(user!),
        type,
        reason: reason.trim(),
      }),
    onSuccess: () => {
      setStudentId("");
      setReason("");
      void qc.invalidateQueries({ queryKey: ["transfers", user?.id] });
      toast({ title: "Request submitted", description: "The school will confirm the departure.", variant: "success" });
    },
    onError: (e) => toast({ title: "Could not submit", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  return (
    <PageTransition>
      <PageHeader
        title="Transfers & exits"
        description="Request a transfer or resignation; the school confirms and your child's records move to history."
      />

      <div className="grid lg:grid-cols-2 gap-4 items-start max-w-5xl">
        <Card>
          <CardHeader title="New request" description="The school reviews every departure request." />
          <div className="space-y-3.5">
            <Select label="Child" value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
              <option value="" disabled>Select a child…</option>
              {enrolled.map((c) => (
                <option key={c.id} value={c.id}>
                  {fullName(c)} — {c.schoolName}
                </option>
              ))}
            </Select>
            <Select label="Request type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="TRANSFER">Transfer to another school</option>
              <option value="RESIGNATION">Leaving (resignation)</option>
            </Select>
            <Textarea
              label="Reason"
              placeholder="E.g. family relocating to another district…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
            <div className="flex items-start gap-2.5 rounded-xl bg-sky-soft px-4 py-3 text-[12.5px] text-sky-deep">
              <Info className="size-4 shrink-0 mt-0.5" />
              Once confirmed, the seat is released and records move to “Former students”. You keep
              read-only access to receipts and academic history.
            </div>
            <Button
              icon={<ArrowLeftRight className="size-4" />}
              disabled={!studentId || !reason.trim()}
              loading={submit.isPending}
              onClick={() => submit.mutate()}
            >
              Submit request
            </Button>
          </div>
        </Card>

        <Card padded={false}>
          <CardHeader className="px-5 pt-4" title="Request history" />
          {isLoading ? null : requests.length === 0 ? (
            <EmptyState icon={ArrowLeftRight} title="No requests" description="Transfer and exit requests appear here." className="py-10" />
          ) : (
            <div className="divide-y divide-line">
              {requests.map((r) => {
                const meta = TRANSFER_STATUS[r.status];
                return (
                  <div key={r.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[13px] font-medium text-ink">{r.studentName}</p>
                      <Badge variant={meta.variant} dot>{meta.label}</Badge>
                    </div>
                    <p className="text-[12px] text-muted mt-0.5">
                      {r.type === "TRANSFER" ? "Transfer" : "Resignation"} · {r.schoolName} · requested {formatDate(r.requestedAt)}
                      {r.resolvedAt ? ` · resolved ${formatDate(r.resolvedAt)}` : ""}
                    </p>
                    <p className="text-[12.5px] text-ink mt-1">“{r.reason}”</p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </PageTransition>
  );
}
