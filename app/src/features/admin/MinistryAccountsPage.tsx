import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Landmark, MoreHorizontal, Pause, Play, ShieldCheck, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition } from "@/components/motion";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Dropdown } from "@/components/ui/Dropdown";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { UserStatusBadge } from "@/components/ui/UserStatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { adminService, type MinistryAccountInput } from "@/services/adminService";
import { toast } from "@/stores/uiStore";
import { formatDate, fullName } from "@/lib/format";
import type { User } from "@/types";

const EMPTY_FORM: MinistryAccountInput = {
  firstName: "", lastName: "", email: "", phone: "", password: "", nationalId: "", dateOfBirth: "",
};

function fieldErrorsOf(err: unknown): Record<string, string> | undefined {
  return typeof err === "object" && err !== null && "fieldErrors" in err
    ? (err as { fieldErrors?: Record<string, string> }).fieldErrors
    : undefined;
}

export default function MinistryAccountsPage() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const actor = me ? fullName(me) : "System admin";

  const [suspendTarget, setSuspendTarget] = useState<User | null>(null);
  const [form, setForm] = useState<MinistryAccountInput | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["ministry-accounts"],
    queryFn: () => adminService.listMinistryAccounts(),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "SUSPENDED"; user: User }) =>
      adminService.setUserStatus(id, status, actor),
    onSuccess: (_data, vars) => {
      setSuspendTarget(null);
      void qc.invalidateQueries({ queryKey: ["ministry-accounts"] });
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      void qc.invalidateQueries({ queryKey: ["audit"] });
      toast({
        title: vars.status === "SUSPENDED" ? "Account suspended" : "Account reactivated",
        description: vars.user.email,
        variant: "success",
      });
    },
    onError: () => toast({ title: "Could not update account", description: "Please try again.", variant: "error" }),
  });

  const create = useMutation({
    mutationFn: (input: MinistryAccountInput) => adminService.createMinistryAccount(input),
    onSuccess: (result) => {
      setForm(null);
      setFieldErrors({});
      void qc.invalidateQueries({ queryKey: ["ministry-accounts"] });
      void qc.invalidateQueries({ queryKey: ["admin-kpis"] });
      toast({
        title: "Ministry account created",
        description: `A verification code was sent to ${result.user.email}. The account activates once they verify it.`,
        variant: "success",
      });
    },
    onError: (err) => {
      setFieldErrors(fieldErrorsOf(err) ?? {});
      const message = typeof err === "object" && err !== null && "message" in err ? String((err as { message: unknown }).message) : undefined;
      toast({ title: "Could not create account", description: message ?? "Please check the details and try again.", variant: "error" });
    },
  });

  const canCreate = Boolean(
    form &&
      form.firstName.trim() &&
      form.lastName.trim() &&
      /.+@.+\..+/.test(form.email) &&
      form.phone.trim() &&
      form.password.length >= 8 &&
      /^\d{16}$/.test(form.nationalId) &&
      form.dateOfBirth,
  );

  return (
    <PageTransition>
      <PageHeader
        title="Ministry accounts"
        description="Education-authority accounts with read-only access to national statistics."
        actions={
          <Button icon={<UserPlus className="size-4" />} onClick={() => { setForm(EMPTY_FORM); setFieldErrors({}); }}>
            Create authority account
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
            rows={accounts}
            keyField={(u) => u.id}
            empty={
              <EmptyState
                icon={Landmark}
                title="No ministry accounts yet"
                description="Create the first education-authority account to give the ministry access to national dashboards."
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
                Read-only national statistics: enrollment, capacity, staffing gaps and resignation trends by district.
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

      {/* Create modal */}
      <Modal
        open={Boolean(form)}
        onClose={() => !create.isPending && setForm(null)}
        title="Create authority account"
        description="The new account receives a verification code by email and SMS, and activates once verified."
        footer={
          <>
            <Button variant="ghost" onClick={() => setForm(null)} disabled={create.isPending}>Cancel</Button>
            <Button disabled={!canCreate} loading={create.isPending} onClick={() => form && create.mutate(form)}>
              Create account
            </Button>
          </>
        }
      >
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First name"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
              <Input
                label="Last name"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
            <Input
              label="Work email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@mineduc.gov.rw"
              error={fieldErrors.email}
            />
            <Input
              label="Phone"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="07XXXXXXXX"
              error={fieldErrors.phone}
            />
            <Input
              label="Temporary password"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              hint="At least 8 characters. The account holder can change it after verifying."
              error={fieldErrors.password}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="National ID"
                required
                value={form.nationalId}
                onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                placeholder="16 digits"
                error={fieldErrors.nationalId}
              />
              <Input
                label="Date of birth"
                type="date"
                required
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                error={fieldErrors.dateOfBirth}
              />
            </div>
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
              onClick={() => suspendTarget && setStatus.mutate({ id: suspendTarget.id, status: "SUSPENDED", user: suspendTarget })}
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
