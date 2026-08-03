import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BedDouble, Building2, CheckCircle2, Gauge, Mail, MapPin, Phone, ShieldCheck, Sparkles } from "lucide-react";
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
import { formatDate, formatNumber, percent } from "@/lib/format";
import { LEVEL_LABEL, SCHOOL_STATUS, SCHOOL_TYPE_LABEL } from "@/lib/status";
import type { MinistrySchoolRecord } from "@/types";

export default function SchoolsRegistryPage() {
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("");
  const [type, setType] = useState<string>("");
  const [selected, setSelected] = useState<MinistrySchoolRecord | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["ministry-registry"],
    queryFn: () => ministryService.schoolsRegistry(),
  });

  const schools = data?.schools ?? [];
  const districts = useMemo(() => [...new Set(schools.map((s) => s.district))].sort(), [schools]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return schools.filter((s) => {
      if (needle && !`${s.name} ${s.district} ${s.registrationNumber}`.toLowerCase().includes(needle)) return false;
      if (district && s.district !== district) return false;
      if (type && s.ownership !== type) return false;
      return true;
    });
  }, [schools, q, district, type]);

  // Registry-wide KPI strip (unfiltered).
  const totalEnrolled = schools.reduce((s, x) => s + x.students, 0);
  const totalCapacity = schools.reduce((s, x) => s + x.capacity, 0);
  const activeCount = schools.filter((s) => s.status === "ACTIVE").length;
  const verifiedCount = schools.filter((s) => s.governmentVerifiedAt !== null).length;

  const columns: Column<MinistrySchoolRecord>[] = [
    {
      key: "name",
      header: "School",
      render: (s) => (
        <div>
          <p className="font-medium text-ink">{s.name}</p>
          <p className="text-[12px] text-muted">{s.sector || s.district}</p>
        </div>
      ),
    },
    { key: "registrationNumber", header: "Reg. no.", render: (s) => <span className="tnum text-muted">{s.registrationNumber}</span> },
    { key: "district", header: "District" },
    { key: "ownership", header: "Ownership", render: (s) => SCHOOL_TYPE_LABEL[s.ownership] ?? s.ownership },
    {
      key: "enrolled",
      header: "Enrolled / capacity",
      render: (s) => (
        <div className="flex items-center gap-2.5">
          <span className="tnum whitespace-nowrap">
            {formatNumber(s.students)} / {formatNumber(s.capacity)}
          </span>
          <ProgressBar
            value={s.capacity ? s.students / s.capacity : 0}
            capacity
            className="w-24"
            label={`${s.name} capacity utilization`}
          />
        </div>
      ),
    },
    {
      key: "verified",
      header: "Verified",
      render: (s) =>
        s.governmentVerifiedAt !== null ? (
          <Badge variant="success" dot>
            Verified
          </Badge>
        ) : (
          <Badge variant="neutral">Unverified</Badge>
        ),
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

  const selectedUtilization = selected && selected.capacity ? selected.students / selected.capacity : 0;
  const selectedStatus = selected ? SCHOOL_STATUS[selected.status] : null;

  return (
    <PageTransition>
      <PageHeader
        title="Schools registry"
        description="Every school registered on the platform — capacity, ownership and government verification status."
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
            <StatCard label="Government-verified" value={formatNumber(verifiedCount)} icon={ShieldCheck} tone="gold" />
          </StaggerItem>
        </Stagger>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="Search school, district or reg. no.…" className="w-full sm:w-72" />
        <Select value={district} onChange={(e) => setDistrict(e.target.value)} aria-label="District" className="w-44">
          <option value="">All districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Ownership" className="w-40">
          <option value="">All ownership types</option>
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
        description={selected ? `${selected.registrationNumber} · ${selected.district} · ${selected.sector}` : undefined}
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
              <Badge variant="info">{SCHOOL_TYPE_LABEL[selected.ownership] ?? selected.ownership}</Badge>
              {selected.accreditedLevels.map((l) => (
                <Badge key={l} variant="neutral">
                  {LEVEL_LABEL[l] ?? l}
                </Badge>
              ))}
              {selected.hasCambridgeProgram && (
                <Badge variant="gold" className="inline-flex items-center gap-1">
                  <Sparkles className="size-3" aria-hidden /> Cambridge
                </Badge>
              )}
              {selected.boardingType && selected.boardingType !== "DAY" && (
                <Badge variant="gold" className="inline-flex items-center gap-1">
                  <BedDouble className="size-3" aria-hidden /> {selected.boardingType}
                </Badge>
              )}
            </div>

            {/* Facts */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 rounded-xl border border-line bg-paper/50 p-4 text-[13px]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">Registered</p>
                <p className="font-semibold text-ink tnum">{formatDate(selected.createdAt)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">Government verification</p>
                <p className="font-semibold text-ink tnum">
                  {selected.governmentVerifiedAt ? formatDate(selected.governmentVerifiedAt) : "Not yet verified"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">Staff</p>
                <p className="font-semibold text-ink tnum">
                  {formatNumber(selected.teachers)} teachers · {formatNumber(selected.accountants)} accountants
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
                    {formatNumber(selected.students)} / {formatNumber(selected.capacity)} · {percent(selectedUtilization)}
                  </p>
                </div>
                <ProgressBar value={selectedUtilization} capacity label={`${selected.name} capacity utilization`} />
              </div>
            </div>

            {/* Contact */}
            <Card padded={false} className="p-4">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint mb-2">Contact</h4>
              <div className="space-y-1.5 text-[13px] text-ink">
                <p className="flex items-center gap-2">
                  <Mail className="size-3.5 text-muted" aria-hidden />
                  {selected.email}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="size-3.5 text-muted" aria-hidden />
                  <span className="tnum">{selected.phone}</span>
                </p>
              </div>
            </Card>
          </div>
        )}
      </Drawer>
    </PageTransition>
  );
}
