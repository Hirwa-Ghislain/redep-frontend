import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Award, BedDouble, Building2, Mail, MapPin, Phone, Star, Trophy } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { schoolService } from "@/services/schoolService";
import { formatNumber, formatRWF } from "@/lib/format";
import { FEE_CATEGORY_LABEL, SCHOOL_TYPE_LABEL } from "@/lib/status";
import type { FeeStructure, PublicSchoolClass, SchoolClass } from "@/types";

type ClassRow = SchoolClass | PublicSchoolClass;
const rowEnrolled = (c: ClassRow) => ("enrolled" in c ? c.enrolled : c.currentEnrollment);

export default function SchoolProfilePage() {
  const { schoolId = "" } = useParams();

  const { data: school, isLoading } = useQuery({
    queryKey: ["school", schoolId],
    queryFn: () => schoolService.get(schoolId),
  });
  // The public school profile already embeds live class/seat availability — see `school.classes`.
  const classes: ClassRow[] = school?.classes ?? [];

  // The real backend has no academic-term concept for fees — just its flat fee summaries.
  const fees: FeeStructure[] = (school?.feeSummaries ?? []).map((f) => ({
    id: f.id, schoolId, name: f.name, category: f.type, amount: f.amount, termId: "", optional: false,
  }));

  if (isLoading || !school) {
    return (
      <PageTransition>
        <Skeleton className="h-40 mb-4" />
        <Skeleton className="h-64" />
      </PageTransition>
    );
  }

  const seatsLeft = school.capacity - school.enrolled;

  return (
    <PageTransition>
      <PageHeader backTo="/parent/discover" backLabel="Back to search" title="" className="mb-2" />

      {/* Hero */}
      <div className="rounded-(--radius-card) bg-pine overflow-hidden mb-4">
        <div
          className="px-5 sm:px-6 py-6"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(247,245,240,0.10) 1.1px, transparent 1.1px)",
            backgroundSize: "22px 22px",
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <Badge variant="gold">{SCHOOL_TYPE_LABEL[school.type]}</Badge>
                {school.levels.map((l) => (
                  <span key={l} className="rounded-full border border-white/20 px-2 py-px text-[11px] font-medium text-paper/75">
                    {LEVEL_LABEL[l]}
                  </span>
                ))}
                {school.boardingAvailable && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/20 px-2 py-px text-[11px] font-medium text-paper/75">
                    <BedDouble className="size-3" /> Boarding
                  </span>
                )}
              </div>
              <h1 className="font-display text-[24px] font-bold text-paper leading-tight">{school.name}</h1>
              {school.motto && <p className="text-[13px] text-gold italic mt-1">“{school.motto}”</p>}
              <p className="flex items-center gap-1.5 text-[12.5px] text-paper/60 mt-1.5">
                <MapPin className="size-3.5" /> {school.district} district · {school.sector} sector
                {school.foundedYear > 0 ? ` · est. ${school.foundedYear}` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2.5">
              {school.satisfactionScore !== undefined && (
                <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[13px] font-semibold text-gold tnum">
                  <Star className="size-3.5 fill-gold text-gold" /> {school.satisfactionScore.toFixed(1)}
                  <span className="text-[11px] font-normal text-paper/50">parent score</span>
                </span>
              )}
              <Link to={`/parent/discover/${school.id}/apply`}>
                <Button variant="gold">Apply for admission</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          <FadeIn>
            <Card>
              <CardHeader title="About the school" />
              <p className="text-[14px] text-muted leading-relaxed">{school.description}</p>
              {school.facilities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {school.facilities.map((f) => (
                    <Badge key={f} variant="neutral">{f}</Badge>
                  ))}
                </div>
              )}
            </Card>
          </FadeIn>

          <FadeIn delay={0.05}>
            <Card padded={false}>
              <CardHeader className="px-5 pt-5" title="Classes & available seats" description="Live availability — E-SHURI prevents over-registration automatically." />
              <DataTable<ClassRow>
                columns={[
                  { key: "name", header: "Class" },
                  {
                    key: "seats",
                    header: "Seats left",
                    align: "right",
                    render: (c) => (
                      <span className={c.capacity - rowEnrolled(c) < 5 ? "text-clay-deep font-semibold tnum" : "font-semibold tnum text-primary-deep"}>
                        {c.capacity - rowEnrolled(c)}
                      </span>
                    ),
                  },
                  {
                    key: "fill",
                    header: "Occupancy",
                    render: (c) => <ProgressBar value={c.capacity ? rowEnrolled(c) / c.capacity : 0} capacity className="w-28" label={`${c.name} occupancy`} />,
                  },
                ]}
                rows={classes}
                keyField={(c) => c.id}
                empty="No classes published yet."
              />
            </Card>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card padded={false}>
              <CardHeader className="px-5 pt-5" title="Fees" />
              <DataTable<FeeStructure>
                columns={[
                  { key: "name", header: "Fee" },
                  { key: "category", header: "Category", render: (f) => FEE_CATEGORY_LABEL[f.category] },
                  { key: "amount", header: "Amount", align: "right", render: (f) => <span className="tnum font-semibold">{formatRWF(f.amount)}</span> },
                ]}
                rows={fees}
                keyField={(f) => f.id}
                empty="No fees published yet."
              />
            </Card>
          </FadeIn>
        </div>

        <div className="space-y-4">
          <FadeIn delay={0.05}>
            <Card padded={false} className="p-4">
              <CardHeader className="mb-2.5" title="Capacity" />
              <p className="font-display text-[22px] leading-7 font-bold text-ink tnum">{formatNumber(seatsLeft)}</p>
              <p className="text-[12px] text-muted mb-2.5">seats remaining of {formatNumber(school.capacity)}</p>
              <ProgressBar value={school.capacity ? school.enrolled / school.capacity : 0} capacity label="School capacity" />
            </Card>
          </FadeIn>

          {school.achievements.length > 0 && (
            <FadeIn delay={0.1}>
              <Card padded={false} className="p-4">
                <CardHeader className="mb-2.5" title="Achievements" />
                <ul className="space-y-2">
                  {school.achievements.map((a) => (
                    <li key={a} className="flex gap-2 text-[13px] text-ink">
                      <Trophy className="size-3.5 text-gold-deep shrink-0 mt-0.5" />
                      {a}
                    </li>
                  ))}
                </ul>
              </Card>
            </FadeIn>
          )}

          <FadeIn delay={0.15}>
            <Card padded={false} className="p-4">
              <CardHeader className="mb-2.5" title="Contact" />
              <div className="space-y-2 text-[13px]">
                <p className="flex items-center gap-2 text-ink"><Mail className="size-3.5 text-muted" /> {school.contactEmail}</p>
                <p className="flex items-center gap-2 text-ink"><Phone className="size-3.5 text-muted" /> {school.contactPhone}</p>
                <p className="flex items-center gap-2 text-ink"><Building2 className="size-3.5 text-muted" /> School code {school.code}</p>
              </div>
              <div className="mt-3.5 flex items-center gap-2 rounded-xl bg-gold-soft px-3 py-2 text-[12px] text-gold-deep">
                <Award className="size-4 shrink-0" />
                Verified by the Ministry of Education
              </div>
            </Card>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  );
}
