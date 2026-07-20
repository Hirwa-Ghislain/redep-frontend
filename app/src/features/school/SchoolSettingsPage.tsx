import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Building2, CalendarDays } from "lucide-react";
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
import { academicService } from "@/services/academicService";
import { schoolService } from "@/services/schoolService";
import { toast } from "@/stores/uiStore";
import { formatDate } from "@/lib/format";
import { LEVEL_LABEL, SCHOOL_TYPE_LABEL } from "@/lib/status";

interface NotificationPrefs {
  announcementEmails: boolean;
  feeReminders: boolean;
  admissionAlerts: boolean;
  weeklyDigest: boolean;
}

const PREF_META: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  {
    key: "announcementEmails",
    label: "Email announcements to parents",
    description: "Send an email copy whenever the school publishes a notice.",
  },
  {
    key: "feeReminders",
    label: "Fee payment reminders",
    description: "SMS parents with outstanding balances before term deadlines.",
  },
  {
    key: "admissionAlerts",
    label: "New admission alerts",
    description: "Notify the admissions team the moment an application arrives.",
  },
  {
    key: "weeklyDigest",
    label: "Weekly staff digest",
    description: "A Monday summary of applications, payments and messages.",
  },
];

export default function SchoolSettingsPage() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    announcementEmails: true,
    feeReminders: true,
    admissionAlerts: true,
    weeklyDigest: false,
  });
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const { data: school, isLoading } = useQuery({
    queryKey: ["school", user?.schoolId],
    queryFn: () => schoolService.get(user!.schoolId!),
    enabled: Boolean(user?.schoolId),
  });

  const { data: terms = [] } = useQuery({ queryKey: ["terms"], queryFn: () => academicService.terms() });

  const requestDeactivation = useMutation({
    // Honest mock — there is no deactivation endpoint; the request is acknowledged only.
    mutationFn: () => Promise.resolve(),
    onSuccess: () => {
      setDeactivateOpen(false);
      toast({
        title: "Request sent to REDEP administrators",
        description: "They will contact the school before any change is made.",
        variant: "info",
      });
    },
  });

  const setPref = (key: keyof NotificationPrefs, value: boolean) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    const meta = PREF_META.find((m) => m.key === key)!;
    toast({
      title: value ? "Notifications on" : "Notifications off",
      description: meta.label,
      variant: "success",
    });
  };

  return (
    <PageTransition>
      <PageHeader
        title="Settings"
        description="School identity, academic calendar and notification defaults."
      />

      {isLoading || !school ? (
        <div className="grid lg:grid-cols-2 gap-3.5 max-w-4xl"><CardSkeleton /><CardSkeleton /></div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-3.5 items-start max-w-4xl">
          <div className="space-y-3.5">
            {/* Identity */}
            <Card>
              <CardHeader
                title="School identity"
                description="Registered with the Ministry of Education — contact REDEP to correct."
                action={
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary-deep">
                    <Building2 className="size-4" aria-hidden />
                  </span>
                }
              />
              <dl className="divide-y divide-line text-[13px]">
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-muted">Name</dt>
                  <dd className="font-medium text-ink text-right">{school.name}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-muted">School code</dt>
                  <dd className="font-medium text-ink tnum">{school.code}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-muted">Type</dt>
                  <dd><Badge variant="ink">{SCHOOL_TYPE_LABEL[school.type]}</Badge></dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-muted">Levels</dt>
                  <dd className="flex flex-wrap justify-end gap-1.5">
                    {school.levels.map((l) => (
                      <Badge key={l} variant="neutral">{LEVEL_LABEL[l]}</Badge>
                    ))}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-muted">Location</dt>
                  <dd className="font-medium text-ink text-right">{school.district} · {school.sector}</dd>
                </div>
              </dl>
            </Card>

            {/* Academic calendar */}
            <Card padded={false}>
              <CardHeader
                className="px-4 pt-4"
                title="Academic calendar"
                description="Terms are set nationally by the Ministry of Education."
                action={
                  <span className="flex size-8 items-center justify-center rounded-lg bg-sky-soft text-sky-deep">
                    <CalendarDays className="size-4" aria-hidden />
                  </span>
                }
              />
              <div className="divide-y divide-line">
                {terms.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div>
                      <p className="text-[13px] font-medium text-ink">{t.label}</p>
                      <p className="text-[12px] text-muted tnum">
                        {formatDate(t.startDate)} — {formatDate(t.endDate)}
                      </p>
                    </div>
                    {t.current && <Badge variant="gold">Current</Badge>}
                  </div>
                ))}
                {terms.length === 0 && (
                  <p className="px-4 py-5 text-[13px] text-muted">No terms published yet.</p>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-3.5">
            {/* Notification defaults */}
            <Card>
              <CardHeader
                title="Notification defaults"
                description="How the school communicates by default — individual users can still adjust their own."
              />
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

            {/* Danger zone */}
            <Card className="border-clay/40">
              <CardHeader
                title="Danger zone"
                description="Deactivation removes the school from Discover and freezes admissions."
                action={
                  <span className="flex size-8 items-center justify-center rounded-lg bg-clay-soft text-clay-deep">
                    <AlertTriangle className="size-4" aria-hidden />
                  </span>
                }
              />
              <Can
                permission={P.SCHOOL_SETTINGS_MANAGE}
                fallback={
                  <p className="text-[13px] text-muted">
                    Only staff with the “Manage settings” permission can request deactivation.
                  </p>
                }
              >
                <Button variant="secondary" onClick={() => setDeactivateOpen(true)}>
                  Request deactivation
                </Button>
              </Can>
            </Card>
          </div>
        </div>
      )}

      {/* Deactivation confirm */}
      <Modal
        open={deactivateOpen}
        onClose={() => !requestDeactivation.isPending && setDeactivateOpen(false)}
        title="Request deactivation?"
        description={school ? `A review request for ${school.name} will be sent to REDEP administrators.` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeactivateOpen(false)} disabled={requestDeactivation.isPending}>
              Cancel
            </Button>
            <Button variant="danger" loading={requestDeactivation.isPending} onClick={() => requestDeactivation.mutate()}>
              Send request
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] text-muted">
          Nothing changes immediately — REDEP administrators review every request and contact the school before
          deactivating. Student records and payment history are preserved either way.
        </p>
      </Modal>
    </PageTransition>
  );
}
