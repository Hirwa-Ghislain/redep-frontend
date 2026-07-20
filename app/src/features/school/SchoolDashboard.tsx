import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowRightLeft, FileText, GraduationCap, Inbox, Wallet } from "lucide-react";
import { HeroBanner } from "@/components/layout/HeroBanner";
import { FadeIn, PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { BarsChart } from "@/components/charts/BarsChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { useAuth } from "@/hooks/useAuth";
import { academicService } from "@/services/academicService";
import { admissionService } from "@/services/admissionService";
import { paymentService } from "@/services/paymentService";
import { schoolService } from "@/services/schoolService";
import { transferService } from "@/services/transferService";
import { formatNumber, formatRWF, timeAgo } from "@/lib/format";
import { ADMISSION_STATUS, PAYMENT_STATUS } from "@/lib/status";
import type { AdmissionStatus } from "@/types";

const FUNNEL_ORDER: AdmissionStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "INFO_REQUESTED",
  "WAITLISTED",
  "APPROVED",
  "REJECTED",
];

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export default function SchoolDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const schoolId = user!.schoolId!;

  const { data: school, isLoading: loadingSchool } = useQuery({
    queryKey: ["school", schoolId],
    queryFn: () => schoolService.get(schoolId),
  });

  const { data: term } = useQuery({ queryKey: ["current-term"], queryFn: () => academicService.currentTerm() });

  const { data: admissionStats, isLoading: loadingStats } = useQuery({
    queryKey: ["admission-stats", schoolId],
    queryFn: () => admissionService.stats(schoolId),
  });

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["accounting-summary", schoolId, term?.id],
    queryFn: () => paymentService.accountingSummary(schoolId, term!.id),
    enabled: Boolean(term),
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["payments", schoolId],
    queryFn: () => paymentService.listBySchool(schoolId),
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ["transfers", schoolId],
    queryFn: () => transferService.listBySchool(schoolId),
  });

  const seatsRemaining = school ? Math.max(0, school.capacity - school.enrolled) : 0;
  const pendingReview = admissionStats ? admissionStats.SUBMITTED + admissionStats.UNDER_REVIEW : 0;
  const pendingTransfers = transfers.filter((t) => t.status === "PENDING").length;

  const funnelData = FUNNEL_ORDER.map((status) => ({
    stage: ADMISSION_STATUS[status].label,
    count: admissionStats?.[status] ?? 0,
  }));

  return (
    <PageTransition>
      <HeroBanner
        eyebrow={term?.label}
        title={`${greeting()}, ${user!.firstName}`}
        subtitle={school ? `${school.name} — admissions, enrolment and collections at a glance.` : undefined}
        stats={[
          { label: "Enrolled", value: loadingSchool ? "…" : formatNumber(school?.enrolled ?? 0) },
          { label: "Seats left", value: loadingSchool ? "…" : formatNumber(seatsRemaining) },
          { label: "Pending review", value: loadingStats ? "…" : formatNumber(pendingReview) },
        ]}
        actions={
          <Button variant="gold" size="sm" onClick={() => navigate("/school/admissions")}>
            Review admissions
          </Button>
        }
      />

      {/* KPI row */}
      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StaggerItem>
          <StatCard
            label="Enrolled students"
            value={loadingSchool ? "…" : formatNumber(school?.enrolled ?? 0)}
            icon={GraduationCap}
            tone="primary"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Seats remaining"
            value={loadingSchool ? "…" : formatNumber(seatsRemaining)}
            icon={Inbox}
            tone={seatsRemaining === 0 ? "clay" : "sky"}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Pending review"
            value={loadingStats ? "…" : String(pendingReview)}
            icon={FileText}
            tone="gold"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label={`Collections${term ? ` — ${term.label}` : ""}`}
            value={loadingSummary || !summary ? "…" : formatRWF(summary.totalCollected)}
            icon={Wallet}
            tone="primary"
          />
        </StaggerItem>
      </Stagger>

      <div className="grid lg:grid-cols-3 gap-4 mt-4 items-start">
        {/* Charts — left, 2 cols */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <FadeIn>
            <Card>
              <CardHeader title="Collections — last 8 weeks" description="Completed payments bucketed by week." />
              {loadingSummary || !summary ? (
                <Skeleton className="h-[240px] w-full" />
              ) : (
                <TrendChart
                  data={summary.byWeek}
                  xKey="week"
                  series={[{ key: "amount", name: "Collected" }]}
                  height={240}
                  formatter={formatRWF}
                />
              )}
            </Card>
          </FadeIn>
          <FadeIn delay={0.05}>
            <Card>
              <CardHeader title="Admissions funnel" description="Applications by current status." />
              {loadingStats ? (
                <Skeleton className="h-[240px] w-full" />
              ) : (
                <BarsChart
                  data={funnelData}
                  xKey="stage"
                  series={[{ key: "count", name: "Applications" }]}
                  height={240}
                  horizontal
                />
              )}
            </Card>
          </FadeIn>
        </div>

        {/* Right rail */}
        <div className="space-y-4 min-w-0">
          <FadeIn delay={0.08}>
            <Card padded={false}>
              <CardHeader
                className="px-4 pt-4 mb-2"
                title="Recent payments"
                action={
                  <Link to="/school/payments" className="text-[12.5px] font-medium text-primary-deep hover:underline">
                    Open ledger
                  </Link>
                }
              />
              {loadingPayments ? (
                <div className="px-4 pb-4">
                  <CardSkeleton />
                </div>
              ) : payments.length === 0 ? (
                <p className="px-4 py-6 text-center text-[13px] text-muted">No payments recorded yet this term.</p>
              ) : (
                <div className="divide-y divide-line">
                  {payments.slice(0, 6).map((p) => {
                    const meta = PAYMENT_STATUS[p.status];
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-ink truncate">{p.studentName}</p>
                          <p className="text-[12px] text-faint">{timeAgo(p.paidAt)}</p>
                        </div>
                        <span className="text-[13px] font-semibold text-ink tnum">{formatRWF(p.amount)}</span>
                        <Badge variant={meta.variant} dot>{meta.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </FadeIn>

          <FadeIn delay={0.12}>
            <Card padded={false}>
              <CardHeader className="px-4 pt-4 mb-2" title="Needs attention" />
              <div className="divide-y divide-line">
                <Link
                  to="/school/admissions"
                  className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-paper/70 transition-colors group"
                >
                  <FileText className="size-4 shrink-0 text-gold-deep" aria-hidden />
                  <span className="min-w-0 flex-1 text-[13px] font-medium text-ink truncate">
                    Applications to review
                  </span>
                  <Badge variant={pendingReview > 0 ? "warning" : "success"} className="tnum">{pendingReview}</Badge>
                  <ArrowRight
                    className="size-3.5 text-faint group-hover:text-primary-deep group-hover:translate-x-0.5 transition-all"
                    aria-hidden
                  />
                </Link>
                <Link
                  to="/school/transfers"
                  className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-paper/70 transition-colors group"
                >
                  <ArrowRightLeft className="size-4 shrink-0 text-sky-deep" aria-hidden />
                  <span className="min-w-0 flex-1 text-[13px] font-medium text-ink truncate">
                    Transfer requests
                  </span>
                  <Badge variant={pendingTransfers > 0 ? "warning" : "success"} className="tnum">{pendingTransfers}</Badge>
                  <ArrowRight
                    className="size-3.5 text-faint group-hover:text-primary-deep group-hover:translate-x-0.5 transition-all"
                    aria-hidden
                  />
                </Link>
              </div>
            </Card>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  );
}
