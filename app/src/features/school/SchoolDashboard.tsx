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
import { TrendChart } from "@/components/charts/TrendChart";
import { useAuth } from "@/hooks/useAuth";
import { admissionService } from "@/services/admissionService";
import { paymentService } from "@/services/paymentService";
import { schoolService } from "@/services/schoolService";
import { transferService } from "@/services/transferService";
import { formatNumber, formatRWF, timeAgo } from "@/lib/format";

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

  const { data: applications = [], isLoading: loadingApplications } = useQuery({
    queryKey: ["real-admissions", schoolId],
    queryFn: () => admissionService.listRealBySchool(schoolId),
  });

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ["real-overview", schoolId],
    queryFn: () => paymentService.realOverview(schoolId),
  });

  const { data: ledger, isLoading: loadingLedger } = useQuery({
    queryKey: ["real-ledger", schoolId, "recent"],
    queryFn: () => paymentService.realLedger(schoolId, { limit: 6 }),
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ["transfers", schoolId],
    queryFn: () => transferService.listBySchool(schoolId),
  });

  const classes = school?.classes ?? [];
  const enrolled = classes.reduce((sum, c) => sum + c.currentEnrollment, 0);
  const seatsRemaining = classes.reduce((sum, c) => sum + c.availableSpots, 0);
  const pendingReview = applications.filter((a) => a.status === "VALIDATED" || a.status === "PENDING_PAYMENT").length;
  const pendingTransfers = transfers.filter((t) => t.status === "PENDING").length;

  return (
    <PageTransition>
      <HeroBanner
        title={`${greeting()}, ${user!.firstName}`}
        subtitle={school ? `${school.name} — admissions, enrolment and collections at a glance.` : undefined}
        stats={[
          { label: "Enrolled", value: loadingSchool ? "…" : formatNumber(enrolled) },
          { label: "Seats left", value: loadingSchool ? "…" : formatNumber(seatsRemaining) },
          { label: "Pending review", value: loadingApplications ? "…" : formatNumber(pendingReview) },
        ]}
        actions={
          <Button variant="gold" size="sm" onClick={() => navigate("/school/admissions")}>
            Review admissions
          </Button>
        }
      />

      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StaggerItem><StatCard label="Enrolled students" value={loadingSchool ? "…" : formatNumber(enrolled)} icon={GraduationCap} tone="primary" /></StaggerItem>
        <StaggerItem><StatCard label="Seats remaining" value={loadingSchool ? "…" : formatNumber(seatsRemaining)} icon={Inbox} tone={seatsRemaining === 0 ? "clay" : "sky"} /></StaggerItem>
        <StaggerItem><StatCard label="Pending review" value={loadingApplications ? "…" : String(pendingReview)} icon={FileText} tone="gold" /></StaggerItem>
        <StaggerItem><StatCard label="Total revenue" value={loadingOverview || !overview ? "…" : formatRWF(overview.summary.totalSchoolRevenue)} icon={Wallet} tone="primary" /></StaggerItem>
      </Stagger>

      <div className="grid lg:grid-cols-3 gap-4 mt-4 items-start">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <FadeIn>
            <Card>
              <CardHeader title="Monthly revenue" description="Completed payments over the last 12 months." />
              {loadingOverview || !overview ? (
                <Skeleton className="h-60 w-full" />
              ) : overview.charts.monthlyRevenue.length === 0 ? (
                <p className="py-16 text-center text-[13px] text-muted">No revenue history yet.</p>
              ) : (
                <TrendChart data={overview.charts.monthlyRevenue} xKey="month" series={[{ key: "revenue", name: "Revenue" }]} height={240} formatter={formatRWF} />
              )}
            </Card>
          </FadeIn>
        </div>

        <div className="space-y-4 min-w-0">
          <FadeIn delay={0.08}>
            <Card padded={false}>
              <CardHeader
                className="px-4 pt-4 mb-2"
                title="Recent payments"
                action={<Link to="/school/payments" className="text-[12.5px] font-medium text-primary-deep hover:underline">Open ledger</Link>}
              />
              {loadingLedger ? (
                <div className="px-4 pb-4"><CardSkeleton /></div>
              ) : !ledger || ledger.items.length === 0 ? (
                <p className="px-4 py-6 text-center text-[13px] text-muted">No payments recorded yet.</p>
              ) : (
                <div className="divide-y divide-line">
                  {ledger.items.slice(0, 6).map((p) => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-ink truncate">{p.charge.student.firstName} {p.charge.student.lastName}</p>
                        <p className="text-[12px] text-faint">{timeAgo(p.paidAt ?? p.createdAt)}</p>
                      </div>
                      <span className="text-[13px] font-semibold text-ink tnum">{formatRWF(p.amount)}</span>
                      <Badge variant={p.status === "COMPLETED" ? "success" : p.status === "PENDING" ? "warning" : "danger"} dot>{p.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </FadeIn>

          <FadeIn delay={0.12}>
            <Card padded={false}>
              <CardHeader className="px-4 pt-4 mb-2" title="Needs attention" />
              <div className="divide-y divide-line">
                <Link to="/school/admissions" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-paper/70 transition-colors group">
                  <FileText className="size-4 shrink-0 text-gold-deep" aria-hidden />
                  <span className="min-w-0 flex-1 text-[13px] font-medium text-ink truncate">Applications to review</span>
                  <Badge variant={pendingReview > 0 ? "warning" : "success"} className="tnum">{pendingReview}</Badge>
                  <ArrowRight className="size-3.5 text-faint group-hover:text-primary-deep group-hover:translate-x-0.5 transition-all" aria-hidden />
                </Link>
                <Link to="/school/transfers" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-paper/70 transition-colors group">
                  <ArrowRightLeft className="size-4 shrink-0 text-sky-deep" aria-hidden />
                  <span className="min-w-0 flex-1 text-[13px] font-medium text-ink truncate">Resignation requests</span>
                  <Badge variant={pendingTransfers > 0 ? "warning" : "success"} className="tnum">{pendingTransfers}</Badge>
                  <ArrowRight className="size-3.5 text-faint group-hover:text-primary-deep group-hover:translate-x-0.5 transition-all" aria-hidden />
                </Link>
              </div>
            </Card>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  );
}
