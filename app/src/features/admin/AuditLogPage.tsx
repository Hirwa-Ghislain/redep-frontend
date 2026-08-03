import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { adminService } from "@/services/adminService";
import { ROLE_LABELS } from "@/config/roles";
import { formatDateTime } from "@/lib/format";
import type { AuditLogEntry } from "@/types";

export default function AuditLogPage() {
  const [q, setQ] = useState("");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["audit", q],
    queryFn: () => adminService.auditLog(q || undefined),
  });

  return (
    <PageTransition>
      <PageHeader
        title="Audit log"
        description="Every sensitive action across the platform, in the order it happened."
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search by action, target or actor…"
          className="flex-1 min-w-52 max-w-sm"
        />
        <p className="text-[12px] text-muted italic">
          Immutable record of sensitive actions — retained 7 years.
        </p>
      </div>

      <DataTable<AuditLogEntry>
        loading={isLoading}
        columns={[
          {
            key: "at",
            header: "When",
            render: (e) => <span className="tnum text-muted whitespace-nowrap">{formatDateTime(e.at)}</span>,
          },
          {
            key: "actor",
            header: "Actor",
            render: (e) => (
              <span className="flex items-center gap-2">
                <span className="font-medium text-ink">{e.actorName}</span>
                {/* Real audit rows don't carry a role snapshot — only mock rows do. */}
                {e.actorRole && <Badge variant="neutral">{ROLE_LABELS[e.actorRole]}</Badge>}
              </span>
            ),
          },
          {
            key: "action",
            header: "Action",
            render: (e) => <Badge variant="ink">{e.action.replaceAll("_", " ")}</Badge>,
          },
          { key: "target", header: "Target", render: (e) => <span className="text-ink">{e.target}</span> },
          {
            key: "detail",
            header: "Detail",
            className: "max-w-64",
            render: (e) => (
              <span className="block text-muted truncate" title={e.detail}>
                {e.detail ?? "—"}
              </span>
            ),
          },
        ]}
        rows={entries}
        keyField={(e) => e.id}
        pageSize={14}
        empty={
          <EmptyState
            icon={ScrollText}
            title="No matching entries"
            description="Try a different action name, target or actor — the log only returns exact text matches."
          />
        }
      />
    </PageTransition>
  );
}
