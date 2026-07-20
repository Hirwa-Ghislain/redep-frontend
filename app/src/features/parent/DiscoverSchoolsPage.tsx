import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BedDouble, Compass, MapPin, Scale, Star, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SearchInput } from "@/components/ui/SearchInput";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { schoolService } from "@/services/schoolService";
import { formatNumber, formatRWF } from "@/lib/format";
import { LEVEL_LABEL, SCHOOL_TYPE_LABEL } from "@/lib/status";
import type { School, SchoolLevel, SchoolType } from "@/types";
import { cn } from "@/lib/utils";

export default function DiscoverSchoolsPage() {
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("");
  const [level, setLevel] = useState<SchoolLevel | "">("");
  const [type, setType] = useState<SchoolType | "">("");
  const [hasSeats, setHasSeats] = useState(false);
  const [boarding, setBoarding] = useState(false);
  const [compare, setCompare] = useState<School[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const { data: districts = [] } = useQuery({ queryKey: ["districts"], queryFn: () => schoolService.districts() });
  const { data: schools = [], isLoading } = useQuery({
    queryKey: ["schools", q, district, level, type, hasSeats, boarding],
    queryFn: () =>
      schoolService.list({
        q: q || undefined,
        district: district || undefined,
        level: level || undefined,
        type: type || undefined,
        hasSeats,
        boarding,
      }),
  });

  const toggleCompare = (school: School) =>
    setCompare((list) =>
      list.some((s) => s.id === school.id)
        ? list.filter((s) => s.id !== school.id)
        : list.length >= 3
          ? list
          : [...list, school],
    );

  return (
    <PageTransition>
      <PageHeader
        title="Find schools"
        description="Search every school on REDEP — live seat availability, fees and reputation in one place."
      />

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2.5 mb-5">
        <SearchInput value={q} onChange={setQ} placeholder="Search name, district, sector…" className="w-full sm:w-72" />
        <Select value={district} onChange={(e) => setDistrict(e.target.value)} aria-label="District" className="w-40">
          <option value="">All districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </Select>
        <Select value={level} onChange={(e) => setLevel(e.target.value as SchoolLevel | "")} aria-label="Level" className="w-36">
          <option value="">All levels</option>
          {Object.entries(LEVEL_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        <Select value={type} onChange={(e) => setType(e.target.value as SchoolType | "")} aria-label="Type" className="w-36">
          <option value="">All types</option>
          {Object.entries(SCHOOL_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        <Checkbox label="Seats available" checked={hasSeats} onChange={(e) => setHasSeats(e.target.checked)} />
        <Checkbox label="Boarding" checked={boarding} onChange={(e) => setBoarding(e.target.checked)} />
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          <CardSkeleton /> <CardSkeleton /> <CardSkeleton />
        </div>
      ) : schools.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No schools match"
          description="Try widening your filters — or clear the search."
        />
      ) : (
        <Stagger className="grid md:grid-cols-2 xl:grid-cols-3 gap-3.5 pb-20">
          {schools.map((school) => {
            const seatsLeft = school.capacity - school.enrolled;
            const utilization = school.capacity ? school.enrolled / school.capacity : 0;
            const comparing = compare.some((s) => s.id === school.id);
            return (
              <StaggerItem key={school.id}>
                <Card hover padded={false} className="flex flex-col h-full p-4 gap-3">
                  {/* Identity row */}
                  <div className="flex items-start gap-3">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-pine font-display text-[14px] font-bold text-gold select-none"
                      aria-hidden
                    >
                      {school.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-bold text-[14px] text-ink leading-snug truncate">{school.name}</h3>
                      <p className="flex items-center gap-1 text-[12px] text-muted mt-0.5">
                        <MapPin className="size-3 shrink-0" /> {school.district} · {school.sector}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-gold-deep tnum">
                      <Star className="size-3 fill-gold text-gold" /> {school.satisfactionScore.toFixed(1)}
                    </span>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="info">{SCHOOL_TYPE_LABEL[school.type]}</Badge>
                    {school.levels.map((l) => (
                      <Badge key={l} variant="neutral">{LEVEL_LABEL[l]}</Badge>
                    ))}
                    {school.boardingAvailable && (
                      <Badge variant="gold" className="inline-flex items-center gap-1">
                        <BedDouble className="size-3" /> Boarding
                      </Badge>
                    )}
                  </div>

                  <p className="text-[12.5px] text-muted line-clamp-2">{school.description}</p>

                  <div className="mt-auto space-y-3">
                    <div>
                      <div className="flex items-baseline justify-between text-[12px] mb-1">
                        <span className="text-muted">Seats remaining</span>
                        <span className={cn("font-semibold tnum", seatsLeft < 30 ? "text-clay-deep" : "text-primary-deep")}>
                          {formatNumber(seatsLeft)} of {formatNumber(school.capacity)}
                        </span>
                      </div>
                      <ProgressBar value={utilization} capacity label={`${school.name} capacity`} />
                    </div>
                    {/* Footer: fees + actions */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                      <p className="text-[12.5px] text-muted min-w-0 flex-1">
                        <span className="font-semibold text-ink tnum">{formatRWF(school.feesRange.min)}</span> –{" "}
                        <span className="font-semibold text-ink tnum">{formatRWF(school.feesRange.max)}</span> / term
                      </p>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Link to={`/parent/discover/${school.id}`}>
                          <Button variant="primary" size="sm" iconRight={<ArrowRight className="size-3.5" />}>
                            Profile
                          </Button>
                        </Link>
                        <Button
                          variant={comparing ? "gold" : "secondary"}
                          size="sm"
                          icon={<Scale className="size-3.5" />}
                          onClick={() => toggleCompare(school)}
                          aria-pressed={comparing}
                        >
                          {comparing ? "Added" : "Compare"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      {/* Compare tray */}
      {compare.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-full border border-pine-mist bg-pine pl-5 pr-2 py-2 shadow-(--shadow-pop)">
          <span className="text-[13px] text-paper">
            <span className="font-semibold tnum">{compare.length}</span>/3 selected
          </span>
          <Button size="sm" variant="gold" onClick={() => setCompareOpen(true)} disabled={compare.length < 2}>
            Compare
          </Button>
          <button
            onClick={() => setCompare([])}
            aria-label="Clear comparison"
            className="p-1.5 rounded-full text-paper/60 hover:text-paper hover:bg-white/10 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <Modal open={compareOpen} onClose={() => setCompareOpen(false)} title="Compare schools" size="xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-[12px] uppercase tracking-wide text-muted font-semibold py-2 pr-4 w-36">Criteria</th>
                {compare.map((s) => (
                  <th key={s.id} className="text-left font-display font-semibold text-ink py-2 px-3">{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_td]:py-2.5 [&_td]:px-3 [&_tr]:border-t [&_tr]:border-line">
              <tr>
                <td className="text-muted pr-4">Location</td>
                {compare.map((s) => <td key={s.id}>{s.district} · {s.sector}</td>)}
              </tr>
              <tr>
                <td className="text-muted pr-4">Type</td>
                {compare.map((s) => <td key={s.id}>{SCHOOL_TYPE_LABEL[s.type]}</td>)}
              </tr>
              <tr>
                <td className="text-muted pr-4">Levels</td>
                {compare.map((s) => <td key={s.id}>{s.levels.map((l) => LEVEL_LABEL[l]).join(", ")}</td>)}
              </tr>
              <tr>
                <td className="text-muted pr-4">Seats remaining</td>
                {compare.map((s) => (
                  <td key={s.id} className="tnum font-semibold">{formatNumber(s.capacity - s.enrolled)}</td>
                ))}
              </tr>
              <tr>
                <td className="text-muted pr-4">Fees / term</td>
                {compare.map((s) => (
                  <td key={s.id} className="tnum">{formatRWF(s.feesRange.min)} – {formatRWF(s.feesRange.max)}</td>
                ))}
              </tr>
              <tr>
                <td className="text-muted pr-4">Satisfaction</td>
                {compare.map((s) => (
                  <td key={s.id} className="tnum font-semibold text-gold-deep">★ {s.satisfactionScore.toFixed(1)}</td>
                ))}
              </tr>
              <tr>
                <td className="text-muted pr-4">Boarding</td>
                {compare.map((s) => <td key={s.id}>{s.boardingAvailable ? "Yes" : "No"}</td>)}
              </tr>
              <tr>
                <td className="text-muted pr-4">Founded</td>
                {compare.map((s) => <td key={s.id} className="tnum">{s.foundedYear}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </Modal>
    </PageTransition>
  );
}
