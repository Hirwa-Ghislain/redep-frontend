import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText, Paperclip } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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

      {isLoading ? (
        <div className="space-y-3 max-w-3xl"><CardSkeleton /><CardSkeleton /></div>
      ) : applications.length === 0 ? (
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
      ) : (
        <Card padded={false} className="max-w-3xl overflow-hidden">
          <Stagger className="divide-y divide-line">
            {applications.map((app) => {
              const meta = ADMISSION_STATUS[app.status];
              return (
                <StaggerItem key={app.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(app)}
                    className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-paper/70 transition-colors"
                  >
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
                </StaggerItem>
              );
            })}
          </Stagger>
        </Card>
      )}

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.childFirstName} ${selected.childLastName}` : ""}
        description={selected ? `${schoolName(selected.schoolId)} · ${LEVEL_LABEL[selected.levelApplied]}` : undefined}
      >
        {selected && (
          <div className="space-y-6">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted mb-3">Progress</p>
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
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted mb-3">Documents</p>
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
