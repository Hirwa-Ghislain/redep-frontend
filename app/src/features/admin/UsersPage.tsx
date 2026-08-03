import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, GraduationCap, MoreHorizontal, Pause, Play, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Dropdown } from "@/components/ui/Dropdown";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatCard } from "@/components/ui/StatCard";
import { UserStatusBadge } from "@/components/ui/UserStatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { adminService } from "@/services/adminService";
import { toast } from "@/stores/uiStore";
import { ROLE_LABELS } from "@/config/roles";
import { formatDate, formatNumber, fullName } from "@/lib/format";
import type { RoleKey, User } from "@/types";

const ROLE_KEYS = Object.keys(ROLE_LABELS) as RoleKey[];

export default function UsersPage() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const actor = me ? fullName(me) : "System admin";

  const [q, setQ] = useState("");
  const [role, setRole] = useState<RoleKey | "">("");
  const [suspendTarget, setSuspendTarget] = useState<User | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users", role, q],
    queryFn: () => adminService.users({ role: role || undefined, q: q || undefined }),
  });

  const { data: kpis } = useQuery({ queryKey: ["admin-kpis"], queryFn: () => adminService.kpis() });

  const setStatus = useMutation({
    // The real backend's status endpoint returns only `{ id, status }` — display text is built
    // from the `user` captured in the mutation variables, not from the (thin) response.
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "SUSPENDED"; user: User }) =>
      adminService.setUserStatus(id, status, actor),
    onSuccess: (_data, vars) => {
      setSuspendTarget(null);
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      void qc.invalidateQueries({ queryKey: ["audit"] });
      toast({
        title: vars.status === "SUSPENDED" ? "Account suspended" : "Account reactivated",
        description:
          vars.status === "SUSPENDED"
            ? `${fullName(vars.user)} can no longer sign in.`
            : `${fullName(vars.user)} can sign in again.`,
        variant: "success",
      });
    },
    onError: () => toast({ title: "Could not update account", description: "Please try again.", variant: "error" }),
  });

  return (
    <PageTransition>
      <PageHeader
        title="Users"
        description="Every account on the platform — search, filter by role, and suspend abusive accounts."
      />

      {/* KPI strip */}
      <Stagger className="grid grid-cols-3 gap-3 mb-5">
        <StaggerItem>
          <StatCard label="Parents" value={kpis ? formatNumber(kpis.parents) : "…"} icon={UsersRound} tone="primary" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Teachers" value={kpis ? formatNumber(kpis.teachers) : "…"} icon={GraduationCap} tone="sky" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Job applicants" value={kpis ? formatNumber(kpis.applicants) : "…"} icon={Briefcase} tone="gold" />
        </StaggerItem>
      </Stagger>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="Search by name or email…" className="flex-1 min-w-52 max-w-sm" />
        <Select
          aria-label="Filter by role"
          value={role}
          onChange={(e) => setRole(e.target.value as RoleKey | "")}
          className="w-52"
        >
          <option value="">All roles</option>
          {ROLE_KEYS.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </Select>
      </div>

      <DataTable<User>
        loading={isLoading}
        columns={[
          {
            key: "name",
            header: "User",
            render: (u) => (
              <span className="flex items-center gap-2.5">
                <Avatar name={fullName(u)} size="sm" />
                <span className="font-medium text-ink">{fullName(u)}</span>
              </span>
            ),
          },
          { key: "email", header: "Email", render: (u) => <span className="text-muted">{u.email}</span> },
          {
            key: "roles",
            header: "Roles",
            render: (u) => (
              <span className="flex flex-wrap items-center gap-1.5">
                {u.roles.map((r) => (
                  <Badge key={r} variant="neutral">{ROLE_LABELS[r]}</Badge>
                ))}
                {u.staffRoleName && <Badge variant="info">{u.staffRoleName}</Badge>}
              </span>
            ),
          },
          { key: "createdAt", header: "Joined", render: (u) => <span className="tnum text-muted">{formatDate(u.createdAt)}</span> },
          {
            key: "status",
            header: "Status",
            render: (u) => <UserStatusBadge status={u.status} />,
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
                    ? [{ label: "Reactivate account", icon: Play, onSelect: () => setStatus.mutate({ id: u.id, status: "ACTIVE", user: u }) }]
                    : [{ label: "Suspend account", icon: Pause, danger: true, onSelect: () => setSuspendTarget(u) }]
                }
              />
            ),
          },
        ]}
        rows={users}
        keyField={(u) => u.id}
        pageSize={12}
        empty={
          <EmptyState
            icon={UsersRound}
            title="No users match"
            description="Try a different name, email, or role filter."
          />
        }
      />

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
              onClick={() => suspendTarget && setStatus.mutate({ id: suspendTarget.id, status: "SUSPENDED", user: suspendTarget })}
            >
              Suspend account
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] text-muted">
          The user will be signed out and blocked from logging in until the account is reactivated. This action is recorded in
          the audit log.
        </p>
      </Modal>
    </PageTransition>
  );
}
