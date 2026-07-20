import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Lock, MoreHorizontal, Pencil, Plus, ShieldCheck, Trash2, UserPlus, UserX, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Can } from "@/components/auth/guards";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Dropdown } from "@/components/ui/Dropdown";
import { EmptyState } from "@/components/ui/EmptyState";
import { Checkbox, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { useAuth, usePermission } from "@/hooks/useAuth";
import { P, SCHOOL_PERMISSION_CATALOG } from "@/config/permissions";
import { staffService } from "@/services/staffService";
import { toast } from "@/stores/uiStore";
import { formatDate } from "@/lib/format";
import { STAFF_STATUS } from "@/lib/status";
import type { ApiError } from "@/lib/api/client";
import type { RoleDefinition, StaffMember } from "@/types";

interface RoleForm {
  id?: string;
  name: string;
  description: string;
  permissions: string[];
}

const EMPTY_INVITE = { name: "", email: "", roleId: "" };

export default function StaffRolesPage() {
  const { user } = useAuth();
  const { has } = usePermission();
  const qc = useQueryClient();
  const canManageStaff = has(P.STAFF_MANAGE);
  const canManageRoles = has(P.ROLES_MANAGE);

  const [tab, setTab] = useState<"staff" | "roles">("staff");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState(EMPTY_INVITE);
  const [roleForm, setRoleForm] = useState<RoleForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleDefinition | null>(null);

  const { data: staff = [], isLoading: loadingStaff } = useQuery({
    queryKey: ["staff", user?.schoolId],
    queryFn: () => staffService.list(user!.schoolId!),
    enabled: Boolean(user?.schoolId),
  });

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ["roles", user?.schoolId],
    queryFn: () => staffService.roles(user!.schoolId!),
    enabled: Boolean(user?.schoolId),
  });

  const staffCountByRole = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of staff) map.set(m.roleId, (map.get(m.roleId) ?? 0) + 1);
    return map;
  }, [staff]);

  /* ------------------------------- mutations ------------------------------- */

  const sendInvite = useMutation({
    mutationFn: () =>
      staffService.invite({
        schoolId: user!.schoolId!,
        name: invite.name.trim(),
        email: invite.email.trim(),
        roleId: invite.roleId,
      }),
    onSuccess: (member) => {
      setInviteOpen(false);
      setInvite(EMPTY_INVITE);
      void qc.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Invitation sent", description: `${member.name} was invited as ${member.roleName}.`, variant: "success" });
    },
    onError: (e) => toast({ title: "Could not invite", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const setStatus = useMutation({
    mutationFn: (input: { id: string; status: StaffMember["status"] }) => staffService.setStatus(input.id, input.status),
    onSuccess: (member) => {
      void qc.invalidateQueries({ queryKey: ["staff"] });
      toast({
        title: member.status === "SUSPENDED" ? "Account suspended" : "Account reactivated",
        description: `${member.name} is now ${STAFF_STATUS[member.status].label.toLowerCase()}.`,
        variant: "success",
      });
    },
    onError: (e) => toast({ title: "Could not update", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const saveRole = useMutation({
    mutationFn: () =>
      staffService.saveRole({
        id: roleForm!.id,
        schoolId: user!.schoolId!,
        name: roleForm!.name.trim(),
        description: roleForm!.description.trim(),
        permissions: roleForm!.permissions,
      }),
    onSuccess: (role) => {
      setRoleForm(null);
      void qc.invalidateQueries({ queryKey: ["roles"] });
      void qc.invalidateQueries({ queryKey: ["staff"] });
      toast({
        title: roleForm?.id ? "Role updated" : "Role created",
        description: `"${role.name}" grants ${role.permissions.length} permissions.`,
        variant: "success",
      });
    },
    onError: (e) => toast({ title: "Could not save role", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const removeRole = useMutation({
    mutationFn: (id: string) => staffService.removeRole(id),
    onSuccess: () => {
      setDeleteTarget(null);
      void qc.invalidateQueries({ queryKey: ["roles"] });
      toast({ title: "Role deleted", variant: "success" });
    },
    onError: (e) => {
      setDeleteTarget(null);
      toast({ title: "Could not delete role", description: (e as unknown as ApiError).message, variant: "error" });
    },
  });

  /* ------------------------------ staff table ------------------------------ */

  const staffColumns: Column<StaffMember>[] = [
    {
      key: "name",
      header: "Member",
      render: (m) => (
        <span className="flex items-center gap-2.5">
          <Avatar name={m.name} size="sm" />
          <span className="font-medium text-ink">{m.name}</span>
        </span>
      ),
    },
    { key: "email", header: "Email", render: (m) => <span className="text-muted">{m.email}</span> },
    { key: "roleName", header: "Role", render: (m) => <Badge variant="ink">{m.roleName}</Badge> },
    {
      key: "status",
      header: "Status",
      render: (m) => {
        const meta = STAFF_STATUS[m.status];
        return <Badge variant={meta.variant} dot>{meta.label}</Badge>;
      },
    },
    { key: "joinedAt", header: "Joined", render: (m) => <span className="tnum text-muted">{formatDate(m.joinedAt)}</span> },
    ...(canManageStaff
      ? [
          {
            key: "actions",
            header: "",
            align: "right" as const,
            render: (m: StaffMember) => (
              <Dropdown
                trigger={
                  <Button variant="ghost" size="sm" aria-label={`Actions for ${m.name}`}>
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
                items={
                  m.status === "SUSPENDED"
                    ? [{ label: "Reactivate", icon: ShieldCheck, onSelect: () => setStatus.mutate({ id: m.id, status: "ACTIVE" }) }]
                    : [{ label: "Suspend", icon: UserX, danger: true, onSelect: () => setStatus.mutate({ id: m.id, status: "SUSPENDED" }) }]
                }
              />
            ),
          },
        ]
      : []),
  ];

  /* ------------------------------ role editor ------------------------------ */

  const togglePermission = (key: string, checked: boolean) =>
    setRoleForm((f) =>
      f ? { ...f, permissions: checked ? [...f.permissions, key] : f.permissions.filter((p) => p !== key) } : f,
    );

  const toggleGroup = (keys: string[], selectAll: boolean) =>
    setRoleForm((f) =>
      f
        ? {
            ...f,
            permissions: selectAll
              ? [...new Set([...f.permissions, ...keys])]
              : f.permissions.filter((p) => !keys.includes(p)),
          }
        : f,
    );

  return (
    <PageTransition>
      <PageHeader
        title="Staff & roles"
        description="Invite office staff and compose exactly the permissions each role should carry."
        actions={
          tab === "staff" ? (
            <Can permission={P.STAFF_MANAGE}>
              <Button icon={<UserPlus className="size-4" />} onClick={() => { setInvite(EMPTY_INVITE); setInviteOpen(true); }}>
                Invite staff
              </Button>
            </Can>
          ) : (
            <Can permission={P.ROLES_MANAGE}>
              <Button
                icon={<Plus className="size-4" />}
                onClick={() => setRoleForm({ name: "", description: "", permissions: [] })}
              >
                Create role
              </Button>
            </Can>
          )
        }
      />

      <Tabs
        className="mb-4"
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
        items={[
          { value: "staff", label: "Staff members", count: staff.length },
          { value: "roles", label: "Roles & permissions", count: roles.length },
        ]}
      />

      {tab === "staff" ? (
        <FadeIn>
          <DataTable<StaffMember>
            loading={loadingStaff}
            columns={staffColumns}
            rows={staff}
            keyField={(m) => m.id}
            pageSize={10}
            empty="No staff members yet — invite your first colleague."
          />
        </FadeIn>
      ) : loadingRoles ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3.5"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
      ) : roles.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No roles defined"
          description="Create a custom role — for example an accountant who only sees finance — and assign it when inviting staff."
          action={
            <Can permission={P.ROLES_MANAGE}>
              <Button icon={<Plus className="size-4" />} onClick={() => setRoleForm({ name: "", description: "", permissions: [] })}>
                Create role
              </Button>
            </Can>
          }
        />
      ) : (
        <Stagger className="grid md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {roles.map((role) => {
            const memberCount = staffCountByRole.get(role.id) ?? 0;
            return (
              <StaggerItem key={role.id} className="h-full">
                <Card padded={false} className="p-4 h-full flex flex-col">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-deep">
                      {role.system ? <Lock className="size-4" aria-hidden /> : <KeyRound className="size-4" aria-hidden />}
                    </span>
                    <h3 className="font-display font-bold text-[14px] text-ink truncate flex-1">{role.name}</h3>
                    {role.system && <Badge variant="gold">Built-in</Badge>}
                  </div>
                  <p className="text-[12.5px] text-muted mt-2 flex-1">{role.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-3 text-[12px] text-muted">
                    <span className="inline-flex items-center gap-1 rounded-full bg-ink/6 px-2 py-0.5 text-[11px] font-semibold text-muted">
                      <ShieldCheck className="size-3" aria-hidden />
                      <span className="tnum">{role.permissions.length}</span> permissions
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-3.5" aria-hidden />
                      <span className="tnum">{memberCount}</span> {memberCount === 1 ? "member" : "members"}
                    </span>
                  </div>
                  {!role.system && (
                    <Can permission={P.ROLES_MANAGE}>
                      <div className="flex items-center gap-2 mt-3.5 pt-3.5 border-t border-line">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Pencil className="size-3.5" />}
                          onClick={() =>
                            setRoleForm({ id: role.id, name: role.name, description: role.description, permissions: role.permissions })
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-clay-deep hover:bg-clay-soft"
                          icon={<Trash2 className="size-3.5" />}
                          onClick={() => setDeleteTarget(role)}
                        >
                          Delete
                        </Button>
                      </div>
                    </Can>
                  )}
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      {/* Invite staff */}
      <Modal
        open={inviteOpen}
        onClose={() => !sendInvite.isPending && setInviteOpen(false)}
        title="Invite staff member"
        description="They receive an email invitation and appear as Invited until they join."
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviteOpen(false)} disabled={sendInvite.isPending}>Cancel</Button>
            <Button
              loading={sendInvite.isPending}
              disabled={!invite.name.trim() || !invite.email.trim() || !invite.roleId}
              onClick={() => sendInvite.mutate()}
            >
              Send invitation
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Input
            label="Full name"
            placeholder="E.g. Grace Mukamana"
            value={invite.name}
            onChange={(e) => setInvite((i) => ({ ...i, name: e.target.value }))}
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="name@school.rw"
            value={invite.email}
            onChange={(e) => setInvite((i) => ({ ...i, email: e.target.value }))}
            required
          />
          <Select
            label="Role"
            hint="Defines exactly what they can see and do."
            value={invite.roleId}
            onChange={(e) => setInvite((i) => ({ ...i, roleId: e.target.value }))}
            required
          >
            <option value="" disabled>Select a role…</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} — {r.permissions.length} permissions
              </option>
            ))}
          </Select>
        </div>
      </Modal>

      {/* Role editor */}
      <Drawer
        wide
        open={Boolean(roleForm)}
        onClose={() => !saveRole.isPending && setRoleForm(null)}
        title={roleForm?.id ? "Edit role" : "Create role"}
        description="Tick the permissions this role should carry — staff with this role see only those areas."
        footer={
          roleForm ? (
            <>
              <span className="mr-auto self-center text-[12.5px] text-muted tnum">
                {roleForm.permissions.length} permission{roleForm.permissions.length === 1 ? "" : "s"} selected
              </span>
              <Button variant="ghost" onClick={() => setRoleForm(null)} disabled={saveRole.isPending}>Cancel</Button>
              <Button loading={saveRole.isPending} disabled={!roleForm.name.trim()} onClick={() => saveRole.mutate()}>
                {roleForm.id ? "Save changes" : "Create role"}
              </Button>
            </>
          ) : undefined
        }
      >
        {roleForm && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label="Role name"
                placeholder="E.g. Accountant"
                value={roleForm.name}
                onChange={(e) => setRoleForm((f) => (f ? { ...f, name: e.target.value } : f))}
                required
              />
              <Input
                label="Description"
                placeholder="What is this role for?"
                value={roleForm.description}
                onChange={(e) => setRoleForm((f) => (f ? { ...f, description: e.target.value } : f))}
              />
            </div>

            <div className="space-y-3.5">
              {SCHOOL_PERMISSION_CATALOG.map((group) => {
                const keys = group.items.map((i) => i.key as string);
                const selectedCount = keys.filter((k) => roleForm.permissions.includes(k)).length;
                const allSelected = selectedCount === keys.length;
                return (
                  <section key={group.group} className="rounded-(--radius-card) border border-line overflow-hidden">
                    <div className="flex items-center justify-between gap-3 bg-paper/70 border-b border-line px-3.5 py-2">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                        {group.group}
                        <span className="ml-2 font-normal normal-case tracking-normal tnum">
                          {selectedCount}/{keys.length}
                        </span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => toggleGroup(keys, !allSelected)}
                        className="text-[12px] font-medium text-primary-deep hover:underline"
                      >
                        {allSelected ? "Clear" : "Select all"}
                      </button>
                    </div>
                    <div className="px-3.5 py-3 space-y-2.5">
                      {group.items.map((item) => (
                        <Checkbox
                          key={item.key}
                          label={item.label}
                          description={item.description}
                          checked={roleForm.permissions.includes(item.key)}
                          onChange={(e) => togglePermission(item.key, e.target.checked)}
                          className="gap-2 [&>span>span:first-child]:text-[13px] [&>span>span:last-child]:text-[11.5px]"
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </Drawer>

      {/* Delete role confirm */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !removeRole.isPending && setDeleteTarget(null)}
        title="Delete role?"
        description={deleteTarget ? `"${deleteTarget.name}" will be removed permanently.` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={removeRole.isPending}>Cancel</Button>
            <Button variant="danger" loading={removeRole.isPending} onClick={() => deleteTarget && removeRole.mutate(deleteTarget.id)}>
              Delete role
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] text-muted">
          Roles that still have active staff members cannot be deleted — reassign those members first.
        </p>
      </Modal>
    </PageTransition>
  );
}
