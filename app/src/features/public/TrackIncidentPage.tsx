import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, KeyRound, SearchCheck, ShieldX } from "lucide-react";
import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { incidentService } from "@/services/incidentService";
import { formatDate } from "@/lib/format";
import type { Incident, IncidentStatus } from "@/types";

const STATUS_META: Record<IncidentStatus, { label: string; variant: "info" | "warning" | "success" | "danger" | "neutral" }> = {
  SUBMITTED: { label: "Submitted", variant: "neutral" },
  REVIEWING: { label: "Under review", variant: "info" },
  SCHOOL_RESPONSE_REQUESTED: { label: "Awaiting school response", variant: "warning" },
  REFERRED_TO_RELEVANT_AUTHORITY: { label: "Referred to authority", variant: "warning" },
  RESOLVED: { label: "Resolved", variant: "success" },
  CLOSED: { label: "Closed", variant: "neutral" },
};

export default function TrackIncidentPage() {
  const [referenceCode, setReferenceCode] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [result, setResult] = useState<Incident | null | "none">("none");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const incident = await incidentService.track(referenceCode.trim(), trackingCode.trim());
    setResult(incident);
    setLoading(false);
  };

  return (
    <PublicPageLayout>
      <h1 className="font-display text-[24px] font-bold text-ink">Track your report</h1>
      <p className="text-muted text-[14px] mt-1 mb-7">
        Enter the reference and tracking codes you were given when you submitted your report.
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        <Input
          label="Reference code"
          placeholder="INC-XXXXXXXX"
          value={referenceCode}
          onChange={(e) => setReferenceCode(e.target.value)}
          icon={<SearchCheck />}
          required
        />
        <Input
          label="Tracking code"
          value={trackingCode}
          onChange={(e) => setTrackingCode(e.target.value)}
          icon={<KeyRound />}
          required
        />
        <Button type="submit" size="lg" loading={loading} className="w-full">
          Check status
        </Button>
      </form>

      {result !== "none" && (
        <div className="mt-6">
          {result ? (
            <div className="rounded-(--radius-card) border border-line bg-paper/60 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_META[result.status].variant} dot>{STATUS_META[result.status].label}</Badge>
                <span className="text-[12px] text-faint tnum">Submitted {formatDate(result.createdAt)}</span>
              </div>
              <p className="text-[13.5px] font-semibold text-ink">{result.title}</p>
              {result.schoolAcknowledgedAt && (
                <p className="text-[13px] text-muted">The school acknowledged this report on {formatDate(result.schoolAcknowledgedAt)}.</p>
              )}
              {result.resolutionSummary && (
                <div className="rounded-lg bg-primary-soft/50 p-3">
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-primary-deep">Resolution</p>
                  <p className="text-[13.5px] text-ink mt-1">{result.resolutionSummary}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-(--radius-card) border border-clay/40 bg-clay-soft/60 p-5">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-clay-deep uppercase tracking-wide">
                <ShieldX className="size-4" /> No matching report
              </p>
              <p className="text-[13.5px] text-ink mt-2">
                Double-check both codes. If you no longer have your tracking code, we cannot recover it — it is never
                stored in a recoverable form.
              </p>
            </div>
          )}
        </div>
      )}

      <p className="text-[13.5px] text-muted mt-8 flex items-center gap-1.5">
        <CheckCircle2 className="size-3.5 text-primary-deep" aria-hidden />
        <Link to="/report-incident" className="font-medium text-primary-deep hover:underline">
          Submit a new report
        </Link>
      </p>
    </PublicPageLayout>
  );
}
