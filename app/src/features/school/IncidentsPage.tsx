import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertOctagon, CheckCircle2, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { useAuth } from "@/hooks/useAuth";
import { incidentService } from "@/services/incidentService";
import { formatDateTime } from "@/lib/format";
import { toast } from "@/stores/uiStore";
import type { ApiError } from "@/lib/api/client";
import type { Incident, IncidentSeverity, IncidentStatus } from "@/types";

const STATUS_META: Record<IncidentStatus, { label: string; variant: "info" | "warning" | "success" | "danger" | "neutral" }> = {
  SUBMITTED: { label: "Submitted", variant: "neutral" },
  REVIEWING: { label: "Under review", variant: "info" },
  SCHOOL_RESPONSE_REQUESTED: { label: "Response requested", variant: "warning" },
  REFERRED_TO_RELEVANT_AUTHORITY: { label: "Referred to authority", variant: "warning" },
  RESOLVED: { label: "Resolved", variant: "success" },
  CLOSED: { label: "Closed", variant: "neutral" },
};

const SEVERITY_META: Record<IncidentSeverity, { label: string; variant: "info" | "warning" | "success" | "danger" | "neutral" }> = {
  LOW: { label: "Low", variant: "neutral" },
  MEDIUM: { label: "Medium", variant: "info" },
  HIGH: { label: "High", variant: "warning" },
  CRITICAL: { label: "Critical", variant: "danger" },
};

const TAB_ORDER: (IncidentStatus | "ALL")[] = ["ALL", "SUBMITTED", "REVIEWING", "SCHOOL_RESPONSE_REQUESTED", "RESOLVED"];

export default function IncidentsPage() {
  const { user } = useAuth();
  const schoolId = user!.schoolId!;
  const qc = useQueryClient();
  const [tab, setTab] = useState<IncidentStatus | "ALL">("ALL");
  const [active, setActive] = useState<Incident | null>(null);

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["school-incidents", schoolId],
    queryFn: () => incidentService.forSchool(schoolId),
  });

  const acknowledge = useMutation({
    mutationFn: (incidentId: string) => incidentService.acknowledge(schoolId, incidentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["school-incidents", schoolId] });
      toast({ title: "Acknowledged", variant: "success" });
      setActive(null);
    },
    onError: (e) => toast({ title: "Failed to acknowledge", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const rows = tab === "ALL" ? incidents : incidents.filter((i) => i.status === tab);

  return (
    <PageTransition>
      <PageHeader
        title="Incident reports"
        description="Safeguarding reports submitted about your school, including anonymous reports."
      />

      <Tabs
        className="mb-4"
        items={TAB_ORDER.map((s) => ({
          value: s,
          label: s === "ALL" ? "All" : STATUS_META[s].label,
          count: s === "ALL" ? incidents.length : incidents.filter((i) => i.status === s).length,
        }))}
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
      />

      {!isLoading && rows.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No incident reports" description="Reports about your school will appear here." />
      ) : (
        <DataTable<Incident>
          loading={isLoading}
          rows={rows}
          keyField={(i) => i.id}
          onRowClick={setActive}
          pageSize={12}
          empty="No incident reports found."
          columns={[
            { key: "title", header: "Report", render: (i) => <span className="font-medium text-ink">{i.title}</span> },
            {
              key: "severity",
              header: "Severity",
              render: (i) => <Badge variant={SEVERITY_META[i.severity].variant} dot>{SEVERITY_META[i.severity].label}</Badge>,
            },
            {
              key: "status",
              header: "Status",
              render: (i) => <Badge variant={STATUS_META[i.status].variant} dot>{STATUS_META[i.status].label}</Badge>,
            },
            { key: "createdAt", header: "Submitted", render: (i) => <span className="tnum">{formatDateTime(i.createdAt)}</span> },
            {
              key: "ack",
              header: "Acknowledged",
              render: (i) => (i.schoolAcknowledgedAt ? <span className="tnum text-muted">{formatDateTime(i.schoolAcknowledgedAt)}</span> : "—"),
            },
          ]}
        />
      )}

      <Modal
        open={active !== null}
        onClose={() => setActive(null)}
        title={active?.title ?? ""}
        size="lg"
        footer={
          active && !active.schoolAcknowledgedAt ? (
            <>
              <Button variant="secondary" onClick={() => setActive(null)}>Close</Button>
              <Button loading={acknowledge.isPending} onClick={() => acknowledge.mutate(active.id)}>
                Acknowledge
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setActive(null)}>Close</Button>
          )
        }
      >
        {active && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={SEVERITY_META[active.severity].variant} dot>{SEVERITY_META[active.severity].label} severity</Badge>
              <Badge variant={STATUS_META[active.status].variant} dot>{STATUS_META[active.status].label}</Badge>
              {active.immediateDanger && (
                <Badge variant="danger" className="inline-flex items-center gap-1">
                  <AlertOctagon className="size-3" aria-hidden /> Immediate danger flagged
                </Badge>
              )}
            </div>
            <p className="text-[13.5px] text-ink leading-relaxed whitespace-pre-line">{active.description}</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px]">
              <div><dt className="text-muted">Reporter</dt><dd className="font-medium text-ink">{active.identityProtected ? "Anonymous" : active.reporterName ?? "—"}</dd></div>
              <div><dt className="text-muted">Location</dt><dd className="font-medium text-ink">{active.location ?? "—"}</dd></div>
              <div><dt className="text-muted">Reference</dt><dd className="font-medium text-ink tnum">{active.referenceCode}</dd></div>
              <div><dt className="text-muted">Evidence</dt><dd className="font-medium text-ink">{active.evidence.length ? `${active.evidence.length} file(s)` : "None"}</dd></div>
            </dl>
            {active.schoolAcknowledgedAt && (
              <p className="flex items-center gap-1.5 text-[12.5px] text-primary-deep">
                <CheckCircle2 className="size-3.5" aria-hidden /> Acknowledged {formatDateTime(active.schoolAcknowledgedAt)}
              </p>
            )}
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
