import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, MoreHorizontal, Pause, Play } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Dropdown } from "@/components/ui/Dropdown";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import { adminService, type AdminSchoolRow } from "@/services/adminService";
import { toast } from "@/stores/uiStore";
import { formatNumber, fullName } from "@/lib/format";
import { SCHOOL_STATUS, SCHOOL_TYPE_LABEL } from "@/lib/status";

export default function SchoolsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const actor = user ? fullName(user) : "System admin";

  const [suspendTarget, setSuspendTarget] = useState<AdminSchoolRow | null>(null);

  const { data: schools = [], isLoading: loadingSchools } = useQuery({
    queryKey: ["admin-schools"],
    queryFn: () => adminService.schools(),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-schools"] });
    void qc.invalidateQueries({ queryKey: ["admin-kpis"] });
    void qc.invalidateQueries({ queryKey: ["audit"] });
  };

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "SUSPENDED" }) =>
      adminService.setSchoolStatus(id, status, actor),
    onSuccess: (school) => {
      setSuspendTarget(null);
      invalidate();
      toast({
        title: school.status === "SUSPENDED" ? "School suspended" : "School reactivated",
        description:
          school.status === "SUSPENDED"
            ? `${school.name} is no longer visible to parents.`
            : `${school.name} is live again.`,
        variant: "success",
      });
    },
    onError: () => toast({ title: "Could not update school", description: "Please try again.", variant: "error" }),
  });

  return (
    <PageTransition>
      <PageHeader
        title="Schools"
        description="Manage every school on the platform — activate, suspend, and review contacts."
      />

      <DataTable<AdminSchoolRow>
        loading={loadingSchools}
        columns={[
          {
            key: "name",
            header: "School",
            render: (s) => <span className="font-medium text-ink">{s.name}</span>,
          },
          {
            key: "contact",
            header: "Administrator / contact",
            render: (s) => (
              <span className="text-muted">
                {s.administratorName && <span className="text-ink font-medium">{s.administratorName} · </span>}
                {s.contactEmail}
              </span>
            ),
          },
          { key: "district", header: "District" },
          {
            key: "type",
            header: "Type",
            render: (s) => (s.type ? SCHOOL_TYPE_LABEL[s.type] : "—"),
          },
          {
            key: "enrolled",
            header: "Enrolled / capacity",
            align: "right",
            render: (s) => (
              <span className="tnum">
                {s.enrolled !== undefined && s.capacity !== undefined
                  ? `${formatNumber(s.enrolled)} / ${formatNumber(s.capacity)}`
                  : "—"}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (s) => {
              const meta = SCHOOL_STATUS[s.status];
              return <Badge variant={meta.variant} dot>{meta.label}</Badge>;
            },
          },
          {
            key: "actions",
            header: "",
            align: "right",
            render: (s) => (
              <Dropdown
                trigger={
                  <Button variant="ghost" size="sm" aria-label={`Actions for ${s.name}`}>
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
                items={
                  s.status === "SUSPENDED"
                    ? [{ label: "Reactivate school", icon: Play, onSelect: () => setStatus.mutate({ id: s.id, status: "ACTIVE" }) }]
                    : [{ label: "Suspend school", icon: Pause, danger: true, onSelect: () => setSuspendTarget(s) }]
                }
              />
            ),
          },
        ]}
        rows={schools}
        keyField={(s) => s.id}
        pageSize={10}
        empty={
          <EmptyState
            icon={Building2}
            title="No schools yet"
            description="Schools appear here once a school administrator registers and NESA verification passes."
          />
        }
      />

      {/* Suspend confirm */}
      <Modal
        open={Boolean(suspendTarget)}
        onClose={() => !setStatus.isPending && setSuspendTarget(null)}
        title="Suspend this school?"
        description={suspendTarget?.name}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSuspendTarget(null)} disabled={setStatus.isPending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={setStatus.isPending}
              onClick={() => suspendTarget && setStatus.mutate({ id: suspendTarget.id, status: "SUSPENDED" })}
            >
              Suspend school
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] text-muted">
          Suspending removes <span className="font-semibold text-ink">{suspendTarget?.name}</span> from discovery and blocks its
          parents and staff from accessing school services until it is reactivated. Existing records are preserved.
        </p>
      </Modal>
    </PageTransition>
  );
}
