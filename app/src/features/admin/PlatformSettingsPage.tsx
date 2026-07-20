import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Download } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { academicService } from "@/services/academicService";
import { adminService } from "@/services/adminService";
import { toast } from "@/stores/uiStore";
import { formatDate } from "@/lib/format";

type ChannelKey = "momo" | "airtel" | "bank";

const CHANNEL_ROWS: { key: ChannelKey; label: string; help: string }[] = [
  { key: "momo", label: "MTN MoMo", help: "Mobile money collections through the MTN aggregator." },
  { key: "airtel", label: "Airtel Money", help: "Mobile money collections through the Airtel aggregator." },
  { key: "bank", label: "Bank transfer", help: "Manual bank transfers reconciled by school accountants." },
];

export default function PlatformSettingsPage() {
  const [channels, setChannels] = useState<Record<ChannelKey, boolean>>({ momo: true, airtel: true, bank: true });
  const [surveysOn, setSurveysOn] = useState(true);
  const [exporting, setExporting] = useState(false);

  const { data: terms = [], isLoading: loadingTerms } = useQuery({
    queryKey: ["terms"],
    queryFn: () => academicService.terms(),
  });

  const saveDemoSetting = () => toast({ title: "Setting saved (demo)", variant: "success" });

  const toggleChannel = (key: ChannelKey, next: boolean) => {
    setChannels((c) => ({ ...c, [key]: next }));
    saveDemoSetting();
  };

  const exportReport = async () => {
    setExporting(true);
    try {
      const schools = await adminService.schools();
      const esc = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
      const csv = [
        ["School", "District", "Status", "Enrolled"].join(","),
        ...schools.map((s) => [esc(s.name), esc(s.district), esc(s.status), s.enrolled].join(",")),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `redep-schools-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast({
        title: "Report exported",
        description: `${schools.length} schools written to CSV.`,
        variant: "success",
      });
    } catch {
      toast({ title: "Export failed", description: "Please try again.", variant: "error" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageTransition>
      <PageHeader
        title="Platform settings"
        description="Global calendar, payment rails, feature rollout and compliance controls."
      />

      <Stagger className="grid lg:grid-cols-2 gap-4 max-w-5xl items-start">
        {/* Academic calendar */}
        <StaggerItem>
          <Card padded={false}>
            <CardHeader
              className="px-4 pt-4"
              title="Academic calendar"
              description="National term dates every school portal follows."
            />
            {loadingTerms ? (
              <div className="px-4 pb-4 space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              <div className="divide-y divide-line">
                {terms.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                    <CalendarDays className="size-4 text-muted shrink-0" aria-hidden />
                    <p className="flex-1 text-[13px] font-medium text-ink">{t.label}</p>
                    <span className="text-[12px] text-muted tnum">
                      {formatDate(t.startDate)} — {formatDate(t.endDate)}
                    </span>
                    {t.current && <Badge variant="gold">Current</Badge>}
                  </div>
                ))}
                {terms.length === 0 && (
                  <p className="px-4 py-6 text-[13px] text-muted">No terms configured yet.</p>
                )}
              </div>
            )}
          </Card>
        </StaggerItem>

        {/* Payment channels */}
        <StaggerItem>
          <Card padded={false}>
            <CardHeader
              className="px-4 pt-4"
              title="Payment channels"
              description="Rails available to schools when configuring fee collection."
            />
            <div className="divide-y divide-line">
              {CHANNEL_ROWS.map((row) => (
                <div key={row.key} className="flex items-center gap-4 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-ink">{row.label}</p>
                    <p className="text-[12px] text-muted">{row.help}</p>
                  </div>
                  <Switch
                    checked={channels[row.key]}
                    onChange={(next) => toggleChannel(row.key, next)}
                    label={`Toggle ${row.label}`}
                  />
                </div>
              ))}
            </div>
          </Card>
        </StaggerItem>

        {/* Feature flags */}
        <StaggerItem>
          <Card padded={false}>
            <CardHeader
              className="px-4 pt-4"
              title="Feature flags"
              description="Staged rollout of upcoming platform capabilities."
            />
            <div className="divide-y divide-line">
              <div className="flex items-center gap-4 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
                    SMS notifications <Badge variant="neutral">Phase 2</Badge>
                  </p>
                  <p className="text-[12px] text-muted">Fee reminders and alerts over SMS for offline parents.</p>
                </div>
                <Switch checked={false} onChange={() => undefined} disabled label="SMS notifications (locked until Phase 2)" />
              </div>
              <div className="flex items-center gap-4 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
                    Transport tracking <Badge variant="neutral">Phase 3</Badge>
                  </p>
                  <p className="text-[12px] text-muted">Live school-bus location sharing with parents.</p>
                </div>
                <Switch checked={false} onChange={() => undefined} disabled label="Transport tracking (locked until Phase 3)" />
              </div>
              <div className="flex items-center gap-4 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-ink">Parent satisfaction surveys</p>
                  <p className="text-[12px] text-muted">Termly pulse surveys feeding school satisfaction scores.</p>
                </div>
                <Switch
                  checked={surveysOn}
                  onChange={(next) => {
                    setSurveysOn(next);
                    saveDemoSetting();
                  }}
                  label="Parent satisfaction surveys"
                />
              </div>
            </div>
          </Card>
        </StaggerItem>

        {/* Data & compliance */}
        <StaggerItem>
          <Card padded={false} className="p-4">
            <CardHeader
              className="mb-3"
              title="Data & compliance"
              description="How long REDEP keeps records, and what leaves the platform."
            />
            <ul className="space-y-1.5 text-[12.5px] text-muted">
              <li>• Audit log entries are immutable and retained for <span className="font-medium text-ink">7 years</span>.</li>
              <li>• Payment and receipt records are retained for <span className="font-medium text-ink">10 years</span> per financial regulation.</li>
              <li>• Student academic records follow the school for the learner's full schooling lifetime.</li>
              <li>• Suspended-account data is kept for 90 days, then anonymised on request.</li>
              <li>• Exports contain aggregates and school-level figures only — never student personal data.</li>
            </ul>
            <div className="mt-3.5 border-t border-line pt-3.5">
              <Button
                variant="secondary"
                size="sm"
                icon={<Download className="size-4" />}
                loading={exporting}
                onClick={() => void exportReport()}
              >
                Export platform report
              </Button>
              <p className="text-[12px] text-muted mt-2">CSV of every school: name, district, status and enrollment.</p>
            </div>
          </Card>
        </StaggerItem>
      </Stagger>
    </PageTransition>
  );
}
