import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Landmark, MoreHorizontal, Pause, Play, ShieldCheck, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition } from "@/components/motion";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Dropdown } from "@/components/ui/Dropdown";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import { adminService } from "@/services/adminService";
import { schoolService } from "@/services/schoolService";
import { toast } from "@/stores/uiStore";
import { formatDate, fullName } from "@/lib/format";
import type { User } from "@/types";

interface InviteForm {
  name: string;
  email: string;
  scope: string; // "NATIONAL" or a district name
}

const EMPTY_INVITE: InviteForm = { name: "", email: "", scope: "NATIONAL" };

export default function MinistryAccountsPage() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const actor = me ? fullName(me) : "System admin";

  const [suspendTarget, setSuspendTarget] = useState<User | null>(null);
  const [invite, setInvite] = useState<InviteForm | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["admin-users", "MINISTRY_ADMIN"],
    queryFn: () => adminService.users({ role: "MINISTRY_ADMIN" }),
  });

  const { data: districts = [] } = useQuery({
    queryKey: ["districts"],
    queryFn: () => schoolService.districts(),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "SUSPENDED" }) =>
      adminService.setUserStatus(id, status, actor),
    onSuccess: (updated) => {
      setSuspendTarget(null);
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      void qc.invalidateQueries({ queryKey: ["audit"] });
      toast({
        title: updated.status === "SUSPENDED" ? "Account suspended" : "Account reactivated",
        description: updated.email,
        variant: "success",
      });
    },
    onError: () => toast({ title: "Could not update account", description: "Please try again.", variant: "error" }),
  });

  const sendInvite = () => {
    if (!invite) return;
    // POST /api/v1/admin/ministry-invites when backend lands
    toast({ title: `Invitation sent to ${invite.email}`, description: "The authority account activates on first sign-in.", variant: "success" });
    setInvite(null);
  };

  const canInvite = Boolean(invite && invite.name.trim() && /.+@.+\..+/.test(invite.email));

  return (
    <PageTransition>
      <PageHeader
        title="Ministry accounts"
        description="Education-authority accounts with read-only access to national statistics."
        actions={
          <Button icon={<UserPlus className="size-4" />} onClick={() => setInvite(EMPTY_INVITE)}>
            Invite authority account
          </Button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2">
          <DataTable<User>
            loading={isLoading}
            columns={[
              {
                key: "name",
                header: "Name",
                render: (u) => (
                  <span className="flex items-center gap-2.5">
                    <Avatar name={fullName(u)} size="sm" />
                    <span className="font-medium text-ink">{fullName(u)}</span>
                  </span>
                ),
              },
              { key: "email", header: "Email", render: (u) => <span className="text-muted">{u.email}</span> },
              { key: "phone", header: "Phone", render: (u) => <span className="tnum text-muted">{u.phone}</span> },
              { key: "createdAt", header: "Created", render: (u) => <span className="tnum text-muted">{formatDate(u.createdAt)}</span> },
              {
                key: "status",
                header: "Status",
                render: (u) =>
                  u.status === "SUSPENDED" ? (
                    <Badge variant="danger" dot>Suspended</Badge>
                  ) : (
                    <Badge variant="success" dot>Active</Badge>
                  ),
              },
              {
                key: "actions",
                header: "",
                align: "right",
                render: (u) => (
                  <Dropdown
                    trigger={
                      <Button variant="ghost" size="sm" aria-label={`Actions for ${fullName(u)}`}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    }
                    items={
                      u.status === "SUSPENDED"
                        ? [{ label: "Reactivate account", icon: Play, onSelect: () => setStatus.mutate({ id: u.id, status: "ACTIVE" }) }]
                        : [{ label: "Suspend account", icon: Pause, danger: true, onSelect: () => setSuspendTarget(u) }]
                    }
                  />
                ),
              },
            ]}
            rows={accounts}
            keyField={(u) => u.id}
            empty={
              <EmptyState
                icon={Landmark}
                title="No ministry accounts yet"
                description="Invite the first education-authority account to give the ministry access to national dashboards."
              />
            }
          />
        </div>

        <FadeIn>
          <Card padded={false} className="p-4">
            <CardHeader
              className="mb-3"
              title="What ministry accounts can see"
              description="Deliberately narrow, privacy-first access."
            />
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2.5 text-[12.5px] text-muted">
                <Eye className="size-4 text-primary-deep shrink-0 mt-0.5" aria-hidden />
                Read-only national statistics: enrollment, capacity, staffing gaps and transfer trends by district.
              </li>
              <li className="flex items-start gap-2.5 text-[12.5px] text-muted">
                <Landmark className="size-4 text-primary-deep shrink-0 mt-0.5" aria-hidden />
                School registry with verification statuses, plus report generation and national circulars.
              </li>
              <li className="flex items-start gap-2.5 text-[12.5px] text-muted">
                <ShieldCheck className="size-4 text-primary-deep shrink-0 mt-0.5" aria-hidden />
                No student personal data — figures are aggregated before they ever reach a ministry dashboard.
              </li>
            </ul>
          </Card>
        </FadeIn>
      </div>

      {/* Invite modal */}
      <Modal
        open={Boolean(invite)}
        onClose={() => setInvite(null)}
        title="Invite authority account"
        description="The invitee receives a secure sign-up link scoped to their mandate."
        footer={
          <>
            <Button variant="ghost" onClick={() => setInvite(null)}>Cancel</Button>
            <Button disabled={!canInvite} onClick={sendInvite}>Send invitation</Button>
          </>
        }
      >
        {invite && (
          <div className="space-y-4">
            <Input
              label="Full name"
              required
              value={invite.name}
              onChange={(e) => setInvite({ ...invite, name: e.target.value })}
              placeholder="e.g. Director of Education Statistics"
            />
            <Input
              label="Work email"
              type="email"
              required
              value={invite.email}
              onChange={(e) => setInvite({ ...invite, email: e.target.value })}
              placeholder="name@mineduc.gov.rw"
            />
            <Select
              label="Scope"
              hint="National scope sees every district; a district scope only sees its own aggregates."
              value={invite.scope}
              onChange={(e) => setInvite({ ...invite, scope: e.target.value })}
            >
              <option value="NATIONAL">National</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d} district</option>
              ))}
            </Select>
          </div>
        )}
      </Modal>

      {/* Suspend confirm */}
      <Modal
        open={Boolean(suspendTarget)}
        onClose={() => !setStatus.isPending && setSuspendTarget(null)}
        title="Suspend this account?"
        description={suspendTarget ? `${fullName(suspendTarget)} · ${suspendTarget.email}` : undefined}
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
              Suspend account
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] text-muted">
          The authority account loses access to all national dashboards until it is reactivated. This action is recorded in the
          audit log.
        </p>
      </Modal>
    </PageTransition>
  );
}
