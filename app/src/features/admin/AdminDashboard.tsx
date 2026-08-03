import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, CreditCard, Inbox, ShieldAlert, Users } from "lucide-react";
import { HeroBanner } from "@/components/layout/HeroBanner";
import { FadeIn, PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { BarsChart } from "@/components/charts/BarsChart";
import { USE_MOCKS } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";
import { adminService } from "@/services/adminService";
import { formatCompact, formatNumber, timeAgo } from "@/lib/format";
import { ONBOARDING_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";

const HEALTH_ROWS: { label: string; status: string; tone: "green" | "neutral" }[] = [
  { label: "API", status: "Operational", tone: "green" },
  { label: "Payments simulation", status: "Operational", tone: "green" },
  { label: "SMS gateway", status: "Phase 2", tone: "neutral" },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: kpis, isLoading: loadingKpis } = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () => adminService.kpis(),
  });

  const { data: requests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ["onboarding"],
    queryFn: () => adminService.onboardingRequests(),
    enabled: USE_MOCKS,
  });

  const { data: audit = [], isLoading: loadingAudit } = useQuery({
    queryKey: ["audit", ""],
    queryFn: () => adminService.auditLog(),
  });

  const pending = kpis?.pendingOnboarding ?? 0;
  const thirdStat = USE_MOCKS
    ? { label: "Pending onboarding", value: formatNumber(pending) }
    : { label: "Suspended schools", value: formatNumber(kpis?.suspendedSchools ?? 0) };

  return (
    <PageTransition>
      <HeroBanner
        eyebrow="Platform administration"
        title={`Muraho, ${user?.firstName}`}
        subtitle="Health, growth and pending work across the whole E-SHURI ecosystem."
        stats={
          kpis
            ? [
                { label: "Users", value: formatNumber(kpis.totalUsers) },
                { label: "Active schools", value: formatNumber(kpis.activeSchools) },
                thirdStat,
              ]
            : undefined
        }
        actions={
          USE_MOCKS ? (
            <Button
              variant={pending > 0 ? "gold" : "secondary"}
              icon={<Inbox className="size-4" />}
              onClick={() => navigate("/admin/schools")}
            >
              Review onboarding
            </Button>
          ) : (
            <Button variant="secondary" icon={<Building2 className="size-4" />} onClick={() => navigate("/admin/schools")}>
              Manage schools
            </Button>
          )
        }
      />

      {/* KPI row */}
      {loadingKpis || !kpis ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      ) : (
        <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StaggerItem>
            <StatCard label="Total users" value={formatNumber(kpis.totalUsers)} icon={Users} tone="primary" />
          </StaggerItem>
          <StaggerItem>
            <StatCard label="Active schools" value={formatNumber(kpis.activeSchools)} icon={Building2} tone="sky" />
          </StaggerItem>
          {USE_MOCKS ? (
            <StaggerItem>
              <StatCard
                label="Pending onboarding"
                value={formatNumber(kpis.pendingOnboarding)}
                icon={Inbox}
                tone={kpis.pendingOnboarding > 0 ? "gold" : "default"}
              />
            </StaggerItem>
          ) : (
            <StaggerItem>
              <StatCard
                label="Suspended schools"
                value={formatNumber(kpis.suspendedSchools ?? 0)}
                icon={ShieldAlert}
                tone={(kpis.suspendedSchools ?? 0) > 0 ? "gold" : "default"}
              />
            </StaggerItem>
          )}
          <StaggerItem>
            <StatCard
              label={USE_MOCKS ? "Payments today" : "Open job postings"}
              value={formatNumber(USE_MOCKS ? kpis.paymentsToday : kpis.openJobPostings ?? 0)}
              icon={CreditCard}
              tone="default"
            />
          </StaggerItem>
        </Stagger>
      )}

      {/* Signups/role chart + platform health rail */}
      <div className="grid lg:grid-cols-3 gap-4 mt-4 items-start">
        <Card className="lg:col-span-2">
          <CardHeader
            title={USE_MOCKS ? "New users by month" : "Users by role"}
            description={USE_MOCKS ? "Account signups across all roles, last six months." : "Platform-wide headcount for each account role."}
          />
          {loadingKpis || !kpis ? (
            <Skeleton className="h-[260px] w-full" />
          ) : USE_MOCKS ? (
            <BarsChart
              data={kpis.monthlySignups}
              xKey="month"
              series={[{ key: "users", name: "New users" }]}
              formatter={formatCompact}
            />
          ) : kpis.roleBreakdown && kpis.roleBreakdown.length > 0 ? (
            <BarsChart
              data={kpis.roleBreakdown}
              xKey="role"
              series={[{ key: "count", name: "Users" }]}
              formatter={formatCompact}
              horizontal
            />
          ) : (
            <p className="py-16 text-center text-[13px] text-muted">No role data yet.</p>
          )}
        </Card>

        <FadeIn>
          <Card padded={false}>
            <CardHeader
              className="px-4 pt-4"
              title="Platform health"
              description="Live service status."
            />
            <div className="divide-y divide-line">
              {HEALTH_ROWS.map((row) => (
                <div key={row.label} className="flex items-center gap-2.5 px-4 py-2.5">
                  <span
                    className={cn(
                      "size-2 rounded-full shrink-0",
                      row.tone === "green" ? "bg-primary" : "bg-ink/25",
                    )}
                    aria-hidden
                  />
                  <p className="flex-1 text-[13px] font-medium text-ink">{row.label}</p>
                  <span className={cn("text-[12px] font-medium", row.tone === "green" ? "text-primary-deep" : "text-muted")}>
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </FadeIn>
      </div>

      {/* Onboarding queue / explanation + audit activity */}
      <div className="grid lg:grid-cols-2 gap-4 mt-4 items-start">
        <FadeIn>
          <Card padded={false}>
            <CardHeader
              className="px-4 pt-4"
              title="Onboarding queue"
              description="Newest school registration requests."
              action={
                <Link to="/admin/schools" className="text-[12.5px] font-medium text-primary-deep hover:underline">
                  Review all
                </Link>
              }
            />
            {!USE_MOCKS ? (
              <p className="px-4 py-8 text-center text-[13px] text-muted">
                Not applicable here — NESA-accredited schools self-register and go live immediately. There's no admin
                verification queue on this backend.
              </p>
            ) : loadingRequests ? (
              <div className="px-4 pb-4 space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : requests.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-muted">No onboarding requests yet.</p>
            ) : (
              <div className="divide-y divide-line">
                {requests.slice(0, 5).map((r) => {
                  const meta = ONBOARDING_STATUS[r.status];
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-ink truncate">{r.schoolName}</p>
                        <p className="text-[12px] text-muted truncate">
                          {r.district} · {r.sector} — {timeAgo(r.submittedAt)}
                        </p>
                      </div>
                      <Badge variant={meta.variant} dot className="text-[11px]">{meta.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </FadeIn>

        <FadeIn delay={0.05}>
          <Card padded={false}>
            <CardHeader
              className="px-4 pt-4"
              title="Recent audit activity"
              description="Latest sensitive actions recorded platform-wide."
              action={
                <Link to="/admin/audit" className="text-[12.5px] font-medium text-primary-deep hover:underline">
                  Full log
                </Link>
              }
            />
            {loadingAudit ? (
              <div className="px-4 pb-4 space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : audit.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-muted">No audit activity recorded yet.</p>
            ) : (
              <div className="divide-y divide-line">
                {audit.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                    <Badge variant="ink" className="tnum text-[11px]">{e.action.replaceAll("_", " ")}</Badge>
                    <p className="min-w-0 flex-1 text-[13px] text-ink truncate">
                      <span className="font-medium">{e.actorName}</span>
                      <span className="text-muted"> → {e.target}</span>
                    </p>
                    <span className="text-[12px] text-faint tnum whitespace-nowrap">{timeAgo(e.at)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
