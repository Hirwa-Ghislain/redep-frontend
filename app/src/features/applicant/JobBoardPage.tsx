import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Briefcase, CalendarDays, MapPin } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { recruitmentService } from "@/services/recruitmentService";
import { schoolService } from "@/services/schoolService";
import { formatDate, formatNumber, formatRWF } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EmploymentType, PositionType } from "@/types";
import { daysUntil, EMPLOYMENT_TYPE_LABEL, POSITION_TYPE_LABEL } from "./shared";

export default function JobBoardPage() {
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("");
  const [positionType, setPositionType] = useState<PositionType | "">("");
  const [employmentType, setEmploymentType] = useState<EmploymentType | "">("");

  const { data: districts = [] } = useQuery({ queryKey: ["districts"], queryFn: () => schoolService.districts() });
  const { data: vacancies = [], isLoading } = useQuery({
    queryKey: ["vacancies", q, district, positionType, employmentType],
    queryFn: () =>
      recruitmentService.vacancies({
        q: q || undefined,
        district: district || undefined,
        positionType: positionType || undefined,
        employmentType: employmentType || undefined,
      }),
  });

  return (
    <PageTransition>
      <PageHeader
        title="Job board"
        description="Every open position across REDEP schools — teaching and beyond."
      />

      {/* Filter row — single line on desktop */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="Search title, school, subject…" className="w-full sm:flex-1 sm:min-w-44" />
        <Select value={district} onChange={(e) => setDistrict(e.target.value)} aria-label="District" className="w-36 shrink-0">
          <option value="">All districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </Select>
        <Select
          value={positionType}
          onChange={(e) => setPositionType(e.target.value as PositionType | "")}
          aria-label="Position type"
          className="w-36 shrink-0"
        >
          <option value="">All positions</option>
          {Object.entries(POSITION_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        <Select
          value={employmentType}
          onChange={(e) => setEmploymentType(e.target.value as EmploymentType | "")}
          aria-label="Employment type"
          className="w-36 shrink-0"
        >
          <option value="">All contracts</option>
          {Object.entries(EMPLOYMENT_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      ) : vacancies.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No vacancies match"
          description="Try widening your filters — new positions are posted every week."
        />
      ) : (
        <Stagger className="grid md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {vacancies.map((v) => {
            const closingSoon = daysUntil(v.deadline) <= 5;
            return (
              <StaggerItem key={v.id} className="h-full">
                <Card hover padded={false} className="flex flex-col h-full gap-2.5 p-4">
                  <div>
                    <h3 className="font-display font-bold text-[14px] text-ink leading-snug">{v.title}</h3>
                    <p className="flex items-center gap-1 text-[12px] text-muted mt-0.5">
                      <MapPin className="size-3.5 shrink-0" aria-hidden /> {v.schoolName} · {v.district}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="info" className="text-[11px]">{POSITION_TYPE_LABEL[v.positionType]}</Badge>
                    <Badge variant="neutral" className="text-[11px]">{EMPLOYMENT_TYPE_LABEL[v.employmentType]}</Badge>
                    {v.subject && <Badge variant="success" className="text-[11px]">{v.subject}</Badge>}
                  </div>

                  <p className="text-[12.5px] text-muted line-clamp-2">{v.description}</p>

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
                    <div className="min-w-0 text-[12px]">
                      {v.salaryRange && (
                        <p className="font-semibold text-ink tnum truncate">
                          {formatRWF(v.salaryRange.min)} – {formatRWF(v.salaryRange.max)}
                        </p>
                      )}
                      <p className={cn("flex items-center gap-1 mt-0.5", closingSoon ? "text-clay-deep font-semibold" : "text-muted")}>
                        <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                        Closes {formatDate(v.deadline)}
                        <span className="text-faint font-normal tnum">· {formatNumber(v.applicantsCount)} applicants</span>
                      </p>
                    </div>
                    <Link to={`/applicant/jobs/${v.id}`} className="shrink-0">
                      <Button size="sm" variant="secondary" iconRight={<ArrowRight className="size-3.5" />}>
                        View
                      </Button>
                    </Link>
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </PageTransition>
  );
}
