import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition } from "@/components/motion";
import { Can } from "@/components/auth/guards";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Select, Textarea } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { UnderDevelopment } from "@/components/ui/UnderDevelopment";
import { useAuth, usePermission } from "@/hooks/useAuth";
import { P } from "@/config/permissions";
import { staffService } from "@/services/staffService";
import { schoolService, type RealSchoolTeacher } from "@/services/schoolService";
import { toast } from "@/stores/uiStore";
import type { ApiError } from "@/lib/api/client";

interface InviteForm {
  emails: string;
  role: "TEACHER" | "ACCOUNTANT";
}

const EMPTY_INVITE: InviteForm = { emails: "", role: "TEACHER" };

export default function StaffRolesPage() {
  const { user } = useAuth();
  const { has } = usePermission();
  const qc = useQueryClient();
  const schoolId = user!.schoolId!;

  const [tab, setTab] = useState<"staff" | "roles">("staff");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState<InviteForm>(EMPTY_INVITE);

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ["real-teachers", schoolId],
    queryFn: () => schoolService.teachersReal(schoolId),
  });

  const sendInvite = useMutation({
    mutationFn: () => {
      const emails = invite.emails.split(/[\n,]/).map((e) => e.trim()).filter(Boolean);
      return staffService.inviteReal(schoolId, { emails, role: invite.role });
    },
    onSuccess: (result) => {
      setInviteOpen(false);
      setInvite(EMPTY_INVITE);
      void qc.invalidateQueries({ queryKey: ["real-teachers"] });
      toast({
        title: `${result.invitedCount} of ${result.requestedCount} invitation(s) sent`,
        description: result.failedCount > 0 ? `${result.failedCount} failed — see the email list for details.` : undefined,
        variant: result.invitedCount > 0 ? "success" : "error",
      });
    },
    onError: (e) => toast({ title: "Could not invite", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const staffColumns: Column<RealSchoolTeacher>[] = [
    {
      key: "name", header: "Member",
      render: (m) => (
        <span className="flex items-center gap-2.5">
          <Avatar name={`${m.firstName} ${m.lastName}`} size="sm" />
          <span className="font-medium text-ink">{m.firstName} {m.lastName}</span>
        </span>
      ),
    },
    { key: "email", header: "Email", render: (m) => <span className="text-muted">{m.email}</span> },
    { key: "role", header: "Role", render: () => <Badge variant="ink">Teacher</Badge> },
    { key: "classes", header: "Assignments", render: (m) => <span className="tnum">{m.homeroomClasses.length + m.courses.length}</span> },
  ];

  return (
    <PageTransition>
      <PageHeader
        title="Staff & roles"
        description="Invite teachers and accountants — the platform's fixed staff roles."
        actions={
          tab === "staff" ? (
            <Can permission={P.STAFF_MANAGE}>
              <Button icon={<UserPlus className="size-4" />} onClick={() => { setInvite(EMPTY_INVITE); setInviteOpen(true); }}>
                Invite staff
              </Button>
            </Can>
          ) : undefined
        }
      />

      <Tabs
        className="mb-4"
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
        items={[
          { value: "staff", label: "Staff members", count: teachers.length },
          { value: "roles", label: "Custom roles" },
        ]}
      />

      {tab === "staff" ? (
        <FadeIn>
          {!has(P.STAFF_VIEW) && !has(P.STAFF_MANAGE) ? null : (
            <>
              <p className="text-[12.5px] text-muted mb-3">
                Only teachers are rostered here — accountants don't get a separate roster endpoint yet, but their
                invitations still send and appear in the confirmation below.
              </p>
              <DataTable<RealSchoolTeacher>
                loading={isLoading}
                columns={staffColumns}
                rows={teachers}
                keyField={(m) => m.userId}
                pageSize={10}
                empty="No staff members yet — invite your first colleague."
              />
            </>
          )}
        </FadeIn>
      ) : (
        <UnderDevelopment
          title="Custom permission roles"
          description="Schools currently assign the fixed Teacher/Accountant roles — a custom permission builder isn't available yet."
        />
      )}

      <Modal
        open={inviteOpen}
        onClose={() => !sendInvite.isPending && setInviteOpen(false)}
        title="Invite staff member(s)"
        description="They receive an email invitation to create their account with the selected role."
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviteOpen(false)} disabled={sendInvite.isPending}>Cancel</Button>
            <Button loading={sendInvite.isPending} disabled={!invite.emails.trim()} onClick={() => sendInvite.mutate()}>
              Send invitation(s)
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Textarea
            label="Email address(es)"
            hint="One per line, or comma-separated."
            rows={4}
            value={invite.emails}
            onChange={(e) => setInvite((i) => ({ ...i, emails: e.target.value }))}
            placeholder={"grace@example.com\naccountant@example.com"}
            required
          />
          <Select label="Role" value={invite.role} onChange={(e) => setInvite((i) => ({ ...i, role: e.target.value as InviteForm["role"] }))}>
            <option value="TEACHER">Teacher</option>
            <option value="ACCOUNTANT">Accountant</option>
          </Select>
        </div>
      </Modal>
    </PageTransition>
  );
}
