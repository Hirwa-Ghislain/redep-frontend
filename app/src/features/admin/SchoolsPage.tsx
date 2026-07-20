import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  FileText,
  Inbox,
  Mail,
  MoreHorizontal,
  Pause,
  Phone,
  Play,
  Quote,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Dropdown } from "@/components/ui/Dropdown";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { useAuth } from "@/hooks/useAuth";
import { adminService } from "@/services/adminService";
import { toast } from "@/stores/uiStore";
import { formatDate, formatNumber, fullName } from "@/lib/format";
import { DOC_STATUS, ONBOARDING_STATUS, SCHOOL_STATUS, SCHOOL_TYPE_LABEL } from "@/lib/status";
import type { School, SchoolOnboardingRequest } from "@/types";

type ResolveAction = "VERIFYING" | "APPROVED" | "REJECTED";

function resolveToast(action: ResolveAction) {
  if (action === "VERIFYING") {
    toast({ title: "Verification started", description: "The request moved to the verifying stage.", variant: "info" });
  } else if (action === "APPROVED") {
    toast({ title: "School approved", description: "School record created and the administrator invited.", variant: "success" });
  } else {
    toast({ title: "Request rejected", description: "The contact will be notified.", variant: "success" });
  }
}

export default function SchoolsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const actor = user ? fullName(user) : "System admin";

  const [tab, setTab] = useState("onboarding");
  const [confirm, setConfirm] = useState<{ request: SchoolOnboardingRequest; action: "APPROVED" | "REJECTED" } | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<School | null>(null);

  const { data: requests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ["onboarding"],
    queryFn: () => adminService.onboardingRequests(),
  });

  const { data: schools = [], isLoading: loadingSchools } = useQuery({
    queryKey: ["admin-schools"],
    queryFn: () => adminService.schools(),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["onboarding"] });
    void qc.invalidateQueries({ queryKey: ["admin-schools"] });
    void qc.invalidateQueries({ queryKey: ["admin-kpis"] });
    void qc.invalidateQueries({ queryKey: ["audit"] });
  };

  const resolve = useMutation({
    mutationFn: ({ id, action }: { id: string; action: ResolveAction }) =>
      adminService.resolveOnboarding(id, action, actor),
    onSuccess: (_data, vars) => {
      setConfirm(null);
      invalidate();
      resolveToast(vars.action);
    },
    onError: () => toast({ title: "Could not update request", description: "Please try again.", variant: "error" }),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: School["status"] }) =>
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

  const openCount = requests.filter((r) => r.status === "PENDING" || r.status === "VERIFYING").length;

  return (
    <PageTransition>
      <PageHeader
        title="Schools"
        description="Verify new school registrations and manage every school on the platform."
      />

      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        items={[
          { value: "onboarding", label: "Onboarding requests", count: openCount, icon: <Inbox className="size-4" /> },
          { value: "schools", label: "All schools", count: schools.length, icon: <Building2 className="size-4" /> },
        ]}
      />

      {tab === "onboarding" ? (
        loadingRequests ? (
          <div className="grid md:grid-cols-2 gap-3.5"><CardSkeleton /><CardSkeleton /></div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No onboarding requests"
            description="When a school applies to join REDEP, its verification request appears here."
          />
        ) : (
          <Stagger className="grid md:grid-cols-2 gap-3.5 items-stretch">
            {requests.map((r) => {
              const meta = ONBOARDING_STATUS[r.status];
              const busyHere = resolve.isPending && resolve.variables?.id === r.id;
              return (
                <StaggerItem key={r.id} className="h-full">
                  <Card padded={false} className="p-4 h-full flex flex-col">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <h3 className="font-display font-bold text-[14px] text-ink truncate">{r.schoolName}</h3>
                        <Badge variant="neutral">{SCHOOL_TYPE_LABEL[r.type]}</Badge>
                      </div>
                      <Badge variant={meta.variant} dot className="shrink-0">{meta.label}</Badge>
                    </div>

                    {/* Meta line */}
                    <p className="text-[12px] text-muted mt-1">
                      {r.district} · {r.sector} — submitted {formatDate(r.submittedAt)}
                    </p>

                    {/* Contact */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <UserRound className="size-3.5 text-faint" aria-hidden /> {r.contactName}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="size-3.5 text-faint" aria-hidden /> {r.contactEmail}
                      </span>
                      <span className="inline-flex items-center gap-1.5 tnum">
                        <Phone className="size-3.5 text-faint" aria-hidden /> {r.contactPhone}
                      </span>
                    </div>

                    {r.message && (
                      <div className="mt-2.5 flex items-start gap-2 rounded-(--radius-ctl) bg-paper/70 border border-line px-3 py-2">
                        <Quote className="size-3.5 text-faint shrink-0 mt-0.5" aria-hidden />
                        <p className="text-[12.5px] text-ink italic">{r.message}</p>
                      </div>
                    )}

                    {/* Documents as inline chips */}
                    <div className="mt-2.5 mb-3 flex flex-wrap items-center gap-1.5 content-start flex-1">
                      {r.documents.map((d) => {
                        const docMeta = DOC_STATUS[d.status];
                        return (
                          <span
                            key={d.id}
                            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-paper/60 pl-2 pr-1 py-0.5 text-[11px] text-ink"
                          >
                            <FileText className="size-3 text-primary-deep shrink-0" aria-hidden />
                            <span className="truncate">{d.fileName}</span>
                            <Badge variant={docMeta.variant}>{docMeta.label}</Badge>
                          </span>
                        );
                      })}
                      {r.documents.length === 0 && (
                        <p className="text-[12px] text-muted">No documents attached.</p>
                      )}
                    </div>

                    {/* Actions */}
                    {(r.status === "PENDING" || r.status === "VERIFYING") && (
                      <div className="mt-auto flex flex-wrap justify-end gap-2 border-t border-line pt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<XCircle className="size-4" />}
                          className="text-clay-deep hover:bg-clay-soft"
                          disabled={busyHere}
                          onClick={() => setConfirm({ request: r, action: "REJECTED" })}
                        >
                          Reject
                        </Button>
                        {r.status === "PENDING" ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<ShieldCheck className="size-4" />}
                            loading={busyHere && resolve.variables?.action === "VERIFYING"}
                            onClick={() => resolve.mutate({ id: r.id, action: "VERIFYING" })}
                          >
                            Start verification
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            icon={<CheckCircle2 className="size-4" />}
                            disabled={busyHere}
                            onClick={() => setConfirm({ request: r, action: "APPROVED" })}
                          >
                            Approve
                          </Button>
                        )}
                      </div>
                    )}
                  </Card>
                </StaggerItem>
              );
            })}
          </Stagger>
        )
      ) : (
        <DataTable<School>
          loading={loadingSchools}
          columns={[
            {
              key: "name",
              header: "School",
              render: (s) => <span className="font-medium text-ink">{s.name}</span>,
            },
            { key: "code", header: "Code", render: (s) => <span className="tnum text-muted">{s.code}</span> },
            { key: "district", header: "District" },
            { key: "type", header: "Type", render: (s) => SCHOOL_TYPE_LABEL[s.type] },
            {
              key: "enrolled",
              header: "Enrolled / capacity",
              align: "right",
              render: (s) => (
                <span className="tnum">
                  {formatNumber(s.enrolled)} / {formatNumber(s.capacity)}
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
              description="Approved onboarding requests create the school records shown here."
            />
          }
        />
      )}

      {/* Approve / reject confirm */}
      <Modal
        open={Boolean(confirm)}
        onClose={() => !resolve.isPending && setConfirm(null)}
        title={confirm?.action === "APPROVED" ? "Approve this school?" : "Reject this request?"}
        description={confirm?.request.schoolName}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)} disabled={resolve.isPending}>
              Cancel
            </Button>
            <Button
              variant={confirm?.action === "APPROVED" ? "primary" : "danger"}
              loading={resolve.isPending}
              onClick={() => confirm && resolve.mutate({ id: confirm.request.id, action: confirm.action })}
            >
              {confirm?.action === "APPROVED" ? "Approve & create school" : "Reject request"}
            </Button>
          </>
        }
      >
        {confirm?.action === "APPROVED" ? (
          <p className="text-[13.5px] text-muted">
            Approving creates an active school record for{" "}
            <span className="font-semibold text-ink">{confirm.request.schoolName}</span> and invites{" "}
            <span className="font-semibold text-ink">{confirm.request.contactName}</span> ({confirm.request.contactEmail}) as its
            administrator to complete the public profile.
          </p>
        ) : (
          <p className="text-[13.5px] text-muted">
            The request from <span className="font-semibold text-ink">{confirm?.request.schoolName}</span> will be marked as
            rejected and the contact notified. The school can re-apply with corrected documents at any time.
          </p>
        )}
      </Modal>

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
