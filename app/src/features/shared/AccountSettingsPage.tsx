import { useState } from "react";
import { BellRing, KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Switch } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/stores/uiStore";
import { ROLE_LABELS } from "@/config/roles";

/** Generic account settings shared by parent / teacher / ministry / applicant portals. */
export default function AccountSettingsPage() {
  const { user, role } = useAuth();
  const [profile, setProfile] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phone: user?.phone ?? "",
  });
  const [prefs, setPrefs] = useState({ platform: true, email: true });
  const [passwords, setPasswords] = useState({ current: "", next: "" });

  if (!user) return null;

  return (
    <PageTransition>
      <PageHeader title="Settings" description="Your profile, security and notification preferences." />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
        <Card>
          <CardHeader title="Profile" description="How you appear across REDEP." />
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <Input label="First name" value={profile.firstName} onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))} />
              <Input label="Last name" value={profile.lastName} onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} />
            </div>
            <Input label="Email" value={user.email} disabled hint="Contact support to change your sign-in email." />
            <Input label="Phone" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
            <div className="flex items-center gap-2">
              <Badge variant="info">{user.staffRoleName ?? (role ? ROLE_LABELS[role] : "")}</Badge>
              {user.roles.length > 1 && <span className="text-[12px] text-muted">+{user.roles.length - 1} more role(s)</span>}
            </div>
            <Button onClick={() => toast({ title: "Profile saved", variant: "success" })}>Save changes</Button>
          </div>
        </Card>

        <div className="space-y-4 xl:contents">
          <Card>
            <CardHeader title="Notifications" description="Where REDEP reaches you." />
            <div className="divide-y divide-line">
              {[
                { key: "platform" as const, icon: BellRing, label: "In-platform", desc: "Bell notifications in the portal" },
                { key: "email" as const, icon: ShieldCheck, label: "Email", desc: "Admissions, payments and message alerts" },
              ].map((row) => (
                <div key={row.key} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <row.icon className="size-4 text-muted shrink-0" />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-ink">{row.label}</p>
                    <p className="text-[12px] text-muted">{row.desc}</p>
                  </div>
                  <Switch checked={prefs[row.key]} onChange={(v) => setPrefs((p) => ({ ...p, [row.key]: v }))} label={row.label} />
                </div>
              ))}
              <div className="flex items-center gap-3 py-2.5 last:pb-0 opacity-60">
                <Smartphone className="size-4 text-muted shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-ink">
                    SMS <Badge variant="neutral" className="ml-1">Phase 2</Badge>
                  </p>
                  <p className="text-[12px] text-muted">SMS alerts arrive with the national gateway integration.</p>
                </div>
                <Switch checked={false} onChange={() => {}} disabled label="SMS" />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Security" description="Change your password." />
            <div className="space-y-3.5">
              <Input
                label="Current password"
                type="password"
                autoComplete="current-password"
                icon={<KeyRound />}
                value={passwords.current}
                onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
              />
              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                hint="At least 8 characters."
                value={passwords.next}
                onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
              />
              <Button
                variant="secondary"
                onClick={() => {
                  setPasswords({ current: "", next: "" });
                  toast({ title: "Password updated", variant: "success" });
                }}
                disabled={passwords.next.length < 8 || !passwords.current}
              >
                Update password
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
