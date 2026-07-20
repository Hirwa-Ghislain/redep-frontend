import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BedDouble, Building2, CheckCircle2, Gauge, Mail, MapPin, Phone, Star, Trophy } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Select } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatCard } from "@/components/ui/StatCard";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ministryService } from "@/services/ministryService";
import { formatNumber, formatRWF, percent } from "@/lib/format";
import { LEVEL_LABEL, SCHOOL_STATUS, SCHOOL_TYPE_LABEL } from "@/lib/status";
import type { School, SchoolType } from "@/types";

export default function SchoolsRegistryPage() {
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("");
  const [type, setType] = useState<SchoolType | "">("");
  const [selected, setSelected] = useState<School | null>(null);

  const { data: schools = [], isLoading } = useQuery({
    queryKey: ["ministry-registry"],
    queryFn: () => ministryService.schoolsRegistry(),
  });

  const districts = useMemo(() => [...new Set(schools.map((s) => s.district))].sort(), [schools]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return schools.filter((s) => {
      if (needle && !`${s.name} ${s.district}`.toLowerCase().includes(needle)) return false;
      if (district && s.district !== district) return false;
      if (type && s.type !== type) return false;
      return true;
    });
  }, [schools, q, district, type]);

  // Registry-wide KPI strip (unfiltered).
  const totalEnrolled = schools.reduce((s, x) => s + x.enrolled, 0);
  const totalCapacity = schools.reduce((s, x) => s + x.capacity, 0);
  const activeCount = schools.filter((s) => s.status === "ACTIVE").length;
  const avgSatisfaction = schools.length
    ? schools.reduce((s, x) => s + x.satisfactionScore, 0) / schools.length
    : 0;

  const columns: Column<School>[] = [
    {
      key: "name",
      header: "School",
      render: (s) => (
        <div>
          <p className="font-medium text-ink">{s.name}</p>
          <p className="text-[12px] text-muted">{s.sector}</p>
        </div>
      ),
    },
    { key: "code", header: "Code", render: (s) => <span className="tnum text-muted">{s.code}</span> },
    { key: "district", header: "District" },
    { key: "type", header: "Type", render: (s) => SCHOOL_TYPE_LABEL[s.type] },
    {
      key: "levels",
      header: "Levels",
      render: (s) => <span className="text-muted">{s.levels.map((l) => LEVEL_LABEL[l]).join(", ")}</span>,
    },
    {
      key: "enrolled",
      header: "Enrolled / capacity",
      render: (s) => (
        <div className="flex items-center gap-2.5">
          <span className="tnum whitespace-nowrap">
            {formatNumber(s.enrolled)} / {formatNumber(s.capacity)}
          </span>
          <ProgressBar
            value={s.capacity ? s.enrolled / s.capacity : 0}
            capacity
            className="w-24"
            label={`${s.name} capacity utilization`}
          />
        </div>
      ),
    },
    {
      key: "satisfaction",
      header: "Satisfaction",
      align: "right",
      render: (s) => <span className="tnum font-semibold text-gold-deep">★ {s.satisfactionScore.toFixed(1)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (s) => {
        const meta = SCHOOL_STATUS[s.status];
        return (
          <Badge variant={meta.variant} dot>
            {meta.label}
          </Badge>
        );
      },
    },
  ];

  const selectedUtilization = selected && selected.capacity ? selected.enrolled / selected.capacity : 0;
  const selectedStatus = selected ? SCHOOL_STATUS[selected.status] : null;

  return (
    <PageTransition>
      <PageHeader
        title="Schools registry"
        description="Every school registered on the platform — capacity, reputation and verification status."
      />

      {/* KPI strip */}
      {isLoading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <Stagger className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
          <StaggerItem>
            <StatCard label="Schools registered" value={formatNumber(schools.length)} icon={Building2} tone="primary" />
          </StaggerItem>
          <StaggerItem>
            <StatCard label="Active" value={formatNumber(activeCount)} icon={CheckCircle2} tone="primary" />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              label="Avg utilization"
              value={totalCapacity ? percent(totalEnrolled / totalCapacity) : "—"}
              icon={Gauge}
              tone={totalCapacity && totalEnrolled / totalCapacity > 0.9 ? "gold" : "sky"}
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard label="Avg satisfaction" value={`★ ${avgSatisfaction.toFixed(1)}`} icon={Star} tone="gold" />
          </StaggerItem>
        </Stagger>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="Search school or district…" className="w-full sm:w-72" />
        <Select value={district} onChange={(e) => setDistrict(e.target.value)} aria-label="District" className="w-44">
          <option value="">All districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <Select value={type} onChange={(e) => setType(e.target.value as SchoolType | "")} aria-label="School type" className="w-40">
          <option value="">All types</option>
          {Object.entries(SCHOOL_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        keyField={(s) => s.id}
        onRowClick={setSelected}
        loading={isLoading}
        empty="No schools match these filters."
        pageSize={10}
      />

      {/* Read-only profile drawer */}
      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        description={selected ? `${selected.code} · ${selected.district} · ${selected.sector}` : undefined}
        wide
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedStatus && (
                <Badge variant={selectedStatus.variant} dot>
                  {selectedStatus.label}
                </Badge>
              )}
              <Badge variant="info">{SCHOOL_TYPE_LABEL[selected.type]}</Badge>
              {selected.levels.map((l) => (
                <Badge key={l} variant="neutral">
                  {LEVEL_LABEL[l]}
                </Badge>
              ))}
              {selected.boardingAvailable && (
                <Badge variant="gold" className="inline-flex items-center gap-1">
                  <BedDouble className="size-3" aria-hidden /> Boarding
                </Badge>
              )}
            </div>

            {selected.motto && <p className="text-[13.5px] italic text-muted">“{selected.motto}”</p>}
            <p className="text-[13.5px] text-muted leading-relaxed">{selected.description}</p>

            {/* Facts */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 rounded-xl border border-line bg-paper/50 p-4 text-[13px]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">Founded</p>
                <p className="font-semibold text-ink tnum">{selected.foundedYear}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">Satisfaction</p>
                <p className="font-semibold text-gold-deep tnum">★ {selected.satisfactionScore.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">Fees per term</p>
                <p className="font-semibold text-ink tnum">
                  {formatRWF(selected.feesRange.min)} – {formatRWF(selected.feesRange.max)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">Location</p>
                <p className="font-semibold text-ink inline-flex items-center gap-1">
                  <MapPin className="size-3.5 text-muted" aria-hidden />
                  {selected.district} · {selected.sector}
                </p>
              </div>
              <div className="col-span-2">
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">Enrollment</p>
                  <p className="font-semibold text-ink tnum">
                    {formatNumber(selected.enrolled)} / {formatNumber(selected.capacity)} · {percent(selectedUtilization)}
                  </p>
                </div>
                <ProgressBar value={selectedUtilization} capacity label={`${selected.name} capacity utilization`} />
              </div>
            </div>

            {/* Facilities */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint mb-2">Facilities</h4>
              {selected.facilities.length === 0 ? (
                <p className="text-[13px] text-muted">None listed.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selected.facilities.map((f) => (
                    <span key={f} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[12px] font-medium text-primary-deep">
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Achievements */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint mb-2">Achievements</h4>
              {selected.achievements.length === 0 ? (
                <p className="text-[13px] text-muted">None listed.</p>
              ) : (
                <ul className="space-y-1.5">
                  {selected.achievements.map((a) => (
                    <li key={a} className="flex items-start gap-2 text-[13px] text-ink">
                      <Trophy className="size-3.5 text-gold-deep shrink-0 mt-0.5" aria-hidden />
                      {a}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Contact */}
            <Card padded={false} className="p-4">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint mb-2">Contact</h4>
              <div className="space-y-1.5 text-[13px] text-ink">
                <p className="flex items-center gap-2">
                  <Mail className="size-3.5 text-muted" aria-hidden />
                  {selected.contactEmail}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="size-3.5 text-muted" aria-hidden />
                  <span className="tnum">{selected.contactPhone}</span>
                </p>
              </div>
            </Card>
          </div>
        )}
      </Drawer>
    </PageTransition>
  );
}
