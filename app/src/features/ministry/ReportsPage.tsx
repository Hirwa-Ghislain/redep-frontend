import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Download, FileBarChart, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select, Switch } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { ministryService } from "@/services/ministryService";
import { formatNumber, formatDateTime } from "@/lib/format";
import { toast } from "@/stores/uiStore";
import type { DistrictStat } from "@/types";

type ReportType = "enrollment" | "capacity" | "staffing" | "transfer-trends";

const REPORT_LABEL: Record<ReportType, string> = {
  enrollment: "Enrollment",
  capacity: "Capacity",
  staffing: "Staffing",
  "transfer-trends": "Transfer trends",
};

interface GeneratedReport {
  id: number;
  name: string;
  generatedAt: string; // ISO
  rows: number;
}

interface Digest {
  id: string;
  name: string;
  cadence: string;
  description: string;
}

const DIGESTS: Digest[] = [
  {
    id: "monthly-enrollment",
    name: "Monthly enrollment digest",
    cadence: "Monthly",
    description: "District enrollment and utilization summary, first working day of the month.",
  },
  {
    id: "capacity-alert",
    name: "Capacity alert",
    cadence: "Weekly",
    description: "Flags districts crossing 92% utilization each Monday morning.",
  },
];

function buildCsv(type: ReportType, rows: DistrictStat[]): string {
  const pct = (d: DistrictStat) => (d.capacity ? Math.round((d.enrolled / d.capacity) * 100) : 0);
  switch (type) {
    case "enrollment":
      return [
        "district,schools,enrolled,capacity,utilization_pct,satisfaction",
        ...rows.map((d) => `${d.district},${d.schools},${d.enrolled},${d.capacity},${pct(d)},${d.satisfaction}`),
      ].join("\n");
    case "capacity":
      return [
        "district,capacity,enrolled,remaining_seats,utilization_pct",
        ...rows.map((d) => `${d.district},${d.capacity},${d.enrolled},${d.capacity - d.enrolled},${pct(d)}`),
      ].join("\n");
    case "staffing":
      return [
        "district,schools,enrolled,teacher_gap",
        ...rows.map((d) => `${d.district},${d.schools},${d.enrolled},${d.teacherGap}`),
      ].join("\n");
    case "transfer-trends":
      return [
        "district,transfers_out,transfers_in,net",
        ...rows.map((d) => `${d.district},${d.transfersOut},${d.transfersIn},${d.transfersIn - d.transfersOut}`),
      ].join("\n");
  }
}

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>("enrollment");
  const [scope, setScope] = useState(""); // "" = National
  const [generated, setGenerated] = useState<GeneratedReport[]>([]);
  const [digestEnabled, setDigestEnabled] = useState<Record<string, boolean>>({
    "monthly-enrollment": true,
    "capacity-alert": true,
  });

  const { data: districts = [], isLoading } = useQuery({
    queryKey: ["ministry-districts"],
    queryFn: () => ministryService.districtStats(),
  });

  const generate = () => {
    const rows = scope ? districts.filter((d) => d.district === scope) : districts;
    if (rows.length === 0) {
      toast({ title: "Nothing to export", description: "No district rows match this scope.", variant: "error" });
      return;
    }
    const csv = buildCsv(type, rows);
    const scopeSlug = scope ? scope.toLowerCase().replace(/\s+/g, "-") : "national";
    const stamp = new Date().toISOString().slice(0, 7); // yyyy-MM
    const name = `redep-${type}-${scopeSlug}-${stamp}.csv`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setGenerated((list) => [
      { id: Date.now(), name, generatedAt: new Date().toISOString(), rows: rows.length },
      ...list,
    ]);
    toast({
      title: "Report generated",
      description: `${name} · ${rows.length} row${rows.length === 1 ? "" : "s"}`,
      variant: "success",
    });
  };

  const toggleDigest = (d: Digest, next: boolean) => {
    setDigestEnabled((s) => ({ ...s, [d.id]: next }));
    toast({
      title: next ? `${d.name} enabled` : `${d.name} paused`,
      description: next ? `Will run ${d.cadence.toLowerCase()}.` : "You can re-enable it any time.",
      variant: "success",
    });
  };

  return (
    <PageTransition>
      <PageHeader
        title="Reports"
        description="Export national statistics as CSV for offline analysis, or manage recurring digests."
      />

      <div className="grid lg:grid-cols-[380px_1fr] gap-4 items-start">
        <Card>
            <CardHeader
              title="Generate report"
              description="Pick a dataset and scope — the file downloads immediately."
            />
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-36" />
              </div>
            ) : (
              <div className="space-y-3.5">
                <Select
                  label="Report type"
                  value={type}
                  onChange={(e) => setType(e.target.value as ReportType)}
                >
                  {(Object.keys(REPORT_LABEL) as ReportType[]).map((t) => (
                    <option key={t} value={t}>
                      {REPORT_LABEL[t]}
                    </option>
                  ))}
                </Select>
                <Select label="Scope" value={scope} onChange={(e) => setScope(e.target.value)}>
                  <option value="">National — all districts</option>
                  {districts.map((d) => (
                    <option key={d.district} value={d.district}>
                      {d.district}
                    </option>
                  ))}
                </Select>
                <div className="flex items-center gap-2 text-[12.5px]">
                  <span className="text-muted">Format</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-0.5 text-[11.5px] font-semibold text-primary-deep">
                    <FileSpreadsheet className="size-3" aria-hidden /> CSV
                  </span>
                </div>
                <Button icon={<Download className="size-4" />} onClick={generate}>
                  Generate report
                </Button>
              </div>
            )}
        </Card>

        <div className="space-y-4 min-w-0">
          <Card padded={false}>
            <CardHeader
              className="px-5 pt-4"
              title="Generated this session"
              description="Files already saved to your device."
            />
            {generated.length === 0 ? (
              <EmptyState
                icon={FileBarChart}
                title="No reports yet"
                description="Generated files will be listed here for the rest of this session."
                className="py-10"
              />
            ) : (
              <ul className="border-t border-line divide-y divide-line">
                {generated.map((g) => (
                  <li key={g.id} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-deep">
                      <FileSpreadsheet className="size-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink truncate">{g.name}</p>
                      <p className="text-[11.5px] text-muted tnum">{formatDateTime(g.generatedAt)}</p>
                    </div>
                    <span className="text-[11.5px] text-muted tnum whitespace-nowrap">
                      {formatNumber(g.rows)} row{g.rows === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <FadeIn>
            <Card>
              <CardHeader title="Scheduled digests" description="Recurring summaries delivered to the ministry inbox." />
              <ul className="divide-y divide-line">
                {DIGESTS.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-soft text-sky-deep">
                      <CalendarClock className="size-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink">
                        {d.name} <Badge variant="neutral" className="ml-1">{d.cadence}</Badge>
                      </p>
                      <p className="text-[11.5px] text-muted mt-0.5">{d.description}</p>
                    </div>
                    <Switch
                      checked={digestEnabled[d.id] ?? false}
                      onChange={(next) => toggleDigest(d, next)}
                      label={`Toggle ${d.name}`}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  );
}
