import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Compass, FileCheck2, FileText, Paperclip } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Timeline } from "@/components/ui/Timeline";
import { useAuth } from "@/hooks/useAuth";
import { admissionService } from "@/services/admissionService";
import { schoolService } from "@/services/schoolService";
import { formatDate, formatDateTime } from "@/lib/format";
import { ADMISSION_STATUS, DOC_STATUS, LEVEL_LABEL } from "@/lib/status";
import type { AdmissionApplication } from "@/types";

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<AdmissionApplication | null>(null);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["applications", user?.id],
    queryFn: () => admissionService.listByParent(user!.id),
    enabled: Boolean(user),
  });
  const { data: schools = [] } = useQuery({ queryKey: ["schools-all"], queryFn: () => schoolService.list() });
  const schoolName = (id: string) => schools.find((s) => s.id === id)?.name ?? "School";

  const open = applications.filter((a) => !["APPROVED", "REJECTED"].includes(a.status));
  const decided = applications.filter((a) => ["APPROVED", "REJECTED"].includes(a.status));

  const renderRow = (app: AdmissionApplication) => {
    const meta = ADMISSION_STATUS[app.status];
    return (
      <button
        key={app.id}
        type="button"
        onClick={() => setSelected(app)}
        className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-paper/70 transition-colors"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-deep">
          <FileText className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink">
            {app.childFirstName} {app.childLastName}
            <span className="font-normal text-muted text-[12.5px]"> · {LEVEL_LABEL[app.levelApplied]}</span>
          </p>
          <p className="text-[12px] text-muted mt-0.5">
            {schoolName(app.schoolId)} — submitted {formatDate(app.submittedAt)}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-[12px] text-faint tnum">
          <Paperclip className="size-3.5" /> {app.documents.length}
        </span>
        <Badge variant={meta.variant} dot>{meta.label}</Badge>
      </button>
    );
  };

  return (
    <PageTransition>
      <PageHeader
        title="Applications"
        description="Every admission application you've submitted, with live status."
        actions={
          <Link to="/parent/discover">
            <Button variant="secondary">New application</Button>
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_310px] items-start">
        {/* Applications */}
        <div className="space-y-4 min-w-0">
          {isLoading ? (
            <div className="space-y-3"><CardSkeleton /><CardSkeleton /></div>
          ) : applications.length === 0 ? (
            <Card padded={false}>
              <EmptyState
                icon={FileText}
                title="No applications yet"
                description="Find a school with open seats and submit your first application."
                action={
                  <Link to="/parent/discover">
                    <Button>Browse schools</Button>
                  </Link>
                }
              />
            </Card>
          ) : (
            <>
              <Card padded={false} className="overflow-hidden">
                <CardHeader
                  className="px-4 pt-4 mb-0"
                  title="In progress"
                  description="The school is reviewing these."
                  action={<Badge variant="warning" className="tnum">{open.length}</Badge>}
                />
                {open.length === 0 ? (
                  <p className="px-4 py-6 text-[12.5px] text-muted">Nothing in review right now.</p>
                ) : (
                  <Stagger className="divide-y divide-line mt-2">
                    {open.map((app) => (
                      <StaggerItem key={app.id}>{renderRow(app)}</StaggerItem>
                    ))}
                  </Stagger>
                )}
              </Card>

              {decided.length > 0 && (
                <Card padded={false} className="overflow-hidden">
                  <CardHeader
                    className="px-4 pt-4 mb-0"
                    title="Decided"
                    description="Approved children appear under My children automatically."
                    action={<Badge variant="neutral" className="tnum">{decided.length}</Badge>}
                  />
                  <div className="divide-y divide-line mt-2">{decided.map(renderRow)}</div>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Side rail */}
        <aside className="space-y-4">
          <Card>
            <CardHeader title="How admissions work" />
            <Timeline
              events={[
                { title: "Submit", description: "Child's details plus documents — five minutes.", tone: "success" },
                { title: "School review", description: "The admissions office verifies documents; they may request more information.", tone: "success" },
                { title: "Decision", description: "Approve, waitlist or decline — you're notified instantly.", tone: "warning" },
                { title: "Enrolled", description: "Approval reserves the seat and links your child to this account.", tone: "default" },
              ]}
            />
          </Card>

          <Card>
            <CardHeader title="Documents you'll need" />
            <ul className="space-y-2">
              {[
                ["Birth certificate", "Required for every application"],
                ["Previous school records", "For transfers and upper levels"],
                ["Parent / guardian ID", "Sometimes requested by the school"],
              ].map(([doc, hint]) => (
                <li key={doc} className="flex items-start gap-2.5">
                  <FileCheck2 className="size-4 text-primary-deep shrink-0 mt-0.5" aria-hidden />
                  <div>
                    <p className="text-[13px] font-medium text-ink leading-snug">{doc}</p>
                    <p className="text-[11.5px] text-muted">{hint}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="bg-primary-soft/40 border-primary/25">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
                <Compass className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-ink">Looking for a school?</p>
                <p className="text-[12px] text-muted mt-0.5 mb-2.5">
                  Compare fees, live seats and reputation across every listed school.
                </p>
                <Link to="/parent/discover">
                  <Button size="sm" variant="secondary">Browse schools</Button>
                </Link>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.childFirstName} ${selected.childLastName}` : ""}
        description={selected ? `${schoolName(selected.schoolId)} · ${LEVEL_LABEL[selected.levelApplied]}` : undefined}
      >
        {selected && (
          <div className="space-y-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-faint mb-3">Progress</p>
              <Timeline
                events={selected.timeline.map((e) => ({
                  title: e.status === "NOTE" ? "Note" : ADMISSION_STATUS[e.status as keyof typeof ADMISSION_STATUS]?.label ?? e.status,
                  meta: formatDateTime(e.at),
                  description: e.note ?? (e.actor ? `by ${e.actor}` : undefined),
                  tone:
                    e.status === "APPROVED" ? "success" :
                    e.status === "REJECTED" ? "danger" :
                    e.status === "INFO_REQUESTED" ? "warning" : "default",
                }))}
              />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-faint mb-3">Documents</p>
              <ul className="space-y-2">
                {selected.documents.map((d) => {
                  const meta = DOC_STATUS[d.status];
                  return (
                    <li key={d.id} className="flex items-center gap-2.5 rounded-(--radius-ctl) border border-line px-3 py-2.5 text-[13px]">
                      <FileText className="size-4 text-primary-deep shrink-0" />
                      <span className="truncate flex-1 text-ink">{d.fileName}</span>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            </div>
            {selected.status === "INFO_REQUESTED" && (
              <div className="rounded-xl bg-gold-soft px-4 py-3 text-[13px] text-gold-deep">
                The school asked for more information — check your messages, then update your documents here.
              </div>
            )}
          </div>
        )}
      </Drawer>
    </PageTransition>
  );
}
