import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertOctagon, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Select, Textarea } from "@/components/ui/Input";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
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

/** Transitions available from the ministry case-update form. */
const UPDATE_STATUSES: IncidentStatus[] = [
  "REVIEWING",
  "SCHOOL_RESPONSE_REQUESTED",
  "REFERRED_TO_RELEVANT_AUTHORITY",
  "RESOLVED",
  "CLOSED",
];

export default function IncidentsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "">("");
  const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | "">("");
  const [active, setActive] = useState<Incident | null>(null);
  const [status, setStatus] = useState<IncidentStatus>("REVIEWING");
  const [note, setNote] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [visibleToReporter, setVisibleToReporter] = useState(false);

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["authority-incidents", statusFilter, severityFilter],
    queryFn: () =>
      incidentService.authorityList({
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
      }),
  });

  const openCase = (incident: Incident) => {
    setActive(incident);
    setStatus(incident.status === "SUBMITTED" ? "REVIEWING" : incident.status);
    setNote("");
    setResolutionSummary(incident.resolutionSummary ?? "");
    setVisibleToReporter(false);
  };

  const update = useMutation({
    mutationFn: () =>
      incidentService.authorityUpdate(active!.id, {
        status,
        note: note.trim(),
        visibleToReporter,
        resolutionSummary: ["RESOLVED", "CLOSED"].includes(status) ? resolutionSummary.trim() : undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["authority-incidents"] });
      toast({ title: "Case updated", variant: "success" });
      setActive(null);
    },
    onError: (e) => toast({ title: "Update failed", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const needsResolutionSummary = ["RESOLVED", "CLOSED"].includes(status);
  const canSubmit = note.trim().length >= 3 && (!needsResolutionSummary || resolutionSummary.trim().length >= 3);

  return (
    <PageTransition>
      <PageHeader
        title="Incident case management"
        description="Safeguarding reports across every school on the platform."
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as IncidentStatus | "")}
          className="w-56"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_META).map(([value, meta]) => (
            <option key={value} value={value}>{meta.label}</option>
          ))}
        </Select>
        <Select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as IncidentSeverity | "")}
          className="w-48"
        >
          <option value="">All severities</option>
          {Object.entries(SEVERITY_META).map(([value, meta]) => (
            <option key={value} value={value}>{meta.label}</option>
          ))}
        </Select>
      </div>

      {!isLoading && incidents.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No incident reports" description="Reports matching these filters will appear here." />
      ) : (
        <DataTable<Incident>
          loading={isLoading}
          rows={incidents}
          keyField={(i) => i.id}
          onRowClick={openCase}
          pageSize={15}
          empty="No incident reports found."
          columns={[
            { key: "title", header: "Report", render: (i) => <span className="font-medium text-ink">{i.title}</span> },
            { key: "schoolName", header: "School", render: (i) => i.schoolName ?? "—" },
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
          ]}
        />
      )}

      <Modal
        open={active !== null}
        onClose={() => setActive(null)}
        title={active?.title ?? ""}
        description={active?.schoolName}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setActive(null)}>Cancel</Button>
            <Button loading={update.isPending} disabled={!canSubmit} onClick={() => update.mutate()}>
              Update case
            </Button>
          </>
        }
      >
        {active && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={SEVERITY_META[active.severity].variant} dot>{SEVERITY_META[active.severity].label} severity</Badge>
              {active.immediateDanger && (
                <Badge variant="danger" className="inline-flex items-center gap-1">
                  <AlertOctagon className="size-3" aria-hidden /> Immediate danger flagged
                </Badge>
              )}
            </div>
            <p className="text-[13.5px] text-ink leading-relaxed whitespace-pre-line">{active.description}</p>

            <div className="border-t border-line pt-4 space-y-4">
              <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as IncidentStatus)}>
                {UPDATE_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </Select>
              <Textarea
                label="Case note"
                required
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What action was taken or decided?"
              />
              {needsResolutionSummary && (
                <Textarea
                  label="Resolution summary"
                  required
                  rows={3}
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  hint="Required when moving to Resolved or Closed — shown to the reporter if visible."
                />
              )}
              <Checkbox
                label="Visible to the reporter"
                description="Let the person tracking this report see this update."
                checked={visibleToReporter}
                onChange={(e) => setVisibleToReporter(e.target.checked)}
              />
            </div>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
