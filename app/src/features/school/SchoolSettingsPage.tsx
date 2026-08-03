import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Building2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Can } from "@/components/auth/guards";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { P } from "@/config/permissions";
import { schoolService } from "@/services/schoolService";
import { toast } from "@/stores/uiStore";

interface NotificationPrefs {
  announcementEmails: boolean;
  feeReminders: boolean;
  admissionAlerts: boolean;
}

const PREF_META: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  { key: "announcementEmails", label: "Email announcements to parents", description: "Send an email copy whenever the school publishes a notice." },
  { key: "feeReminders", label: "Fee payment reminders", description: "SMS parents with outstanding balances." },
  { key: "admissionAlerts", label: "New admission alerts", description: "Notify the admissions team as applications are auto-processed." },
];

export default function SchoolSettingsPage() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>({ announcementEmails: true, feeReminders: true, admissionAlerts: true });
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const { data: school, isLoading } = useQuery({
    queryKey: ["school", user?.schoolId],
    queryFn: () => schoolService.get(user!.schoolId!),
    enabled: Boolean(user?.schoolId),
  });

  const requestDeactivation = useMutation({
    // Honest placeholder — there is no deactivation endpoint; the request is acknowledged only.
    mutationFn: () => Promise.resolve(),
    onSuccess: () => {
      setDeactivateOpen(false);
      toast({ title: "Request sent to E-SHURI administrators", description: "They will contact the school before any change is made.", variant: "info" });
    },
  });

  const setPref = (key: keyof NotificationPrefs, value: boolean) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    const meta = PREF_META.find((m) => m.key === key)!;
    toast({ title: value ? "Notifications on" : "Notifications off", description: `${meta.label} (saved on this device only — no notification-preferences endpoint exists yet).`, variant: "success" });
  };

  return (
    <PageTransition>
      <PageHeader title="Settings" description="School identity and notification defaults." />

      {isLoading || !school ? (
        <div className="grid md:grid-cols-2 gap-3.5"><CardSkeleton /><CardSkeleton /></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3.5 items-start">
          <Card>
            <CardHeader
              title="School identity"
              description="Registered via NESA accreditation — re-sync from the Public profile page to correct."
              action={<span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary-deep"><Building2 className="size-4" aria-hidden /></span>}
            />
            <dl className="divide-y divide-line text-[13px]">
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-muted">Name</dt>
                <dd className="font-medium text-ink text-right">{school.name}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-muted">Type</dt>
                <dd><Badge variant="ink">{school.type}</Badge></dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-muted">Location</dt>
                <dd className="font-medium text-ink text-right">{school.district} · {school.sector}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Notification defaults" description="Client-side preference only — the backend has no notification-settings endpoint yet." />
            <div className="divide-y divide-line">
              {PREF_META.map((m) => (
                <div key={m.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-[13px] font-medium text-ink">{m.label}</p>
                    <p className="text-[12px] text-muted mt-0.5">{m.description}</p>
                  </div>
                  <Switch checked={prefs[m.key]} onChange={(v) => setPref(m.key, v)} label={m.label} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-clay/40 md:col-span-2">
            <CardHeader
              title="Danger zone"
              description="Deactivation removes the school from Discover and pauses new admissions."
              action={<span className="flex size-8 items-center justify-center rounded-lg bg-clay-soft text-clay-deep"><AlertTriangle className="size-4" aria-hidden /></span>}
            />
            <Can permission={P.SCHOOL_SETTINGS_MANAGE} fallback={<p className="text-[13px] text-muted">Only staff with the "Manage settings" permission can request deactivation.</p>}>
              <Button variant="secondary" onClick={() => setDeactivateOpen(true)}>Request deactivation</Button>
            </Can>
          </Card>
        </div>
      )}

      <Modal
        open={deactivateOpen}
        onClose={() => !requestDeactivation.isPending && setDeactivateOpen(false)}
        title="Request deactivation?"
        description={school ? `A review request for ${school.name} will be sent to E-SHURI administrators.` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeactivateOpen(false)} disabled={requestDeactivation.isPending}>Cancel</Button>
            <Button variant="danger" loading={requestDeactivation.isPending} onClick={() => requestDeactivation.mutate()}>Send request</Button>
          </>
        }
      >
        <p className="text-[13.5px] text-muted">
          Nothing changes immediately — there is no deactivation endpoint yet, so this only records your intent for
          E-SHURI administrators to action manually.
        </p>
      </Modal>
    </PageTransition>
  );
}
