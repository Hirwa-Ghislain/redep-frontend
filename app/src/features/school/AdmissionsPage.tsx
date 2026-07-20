import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Inbox, Paperclip } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select, Textarea } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { Timeline } from "@/components/ui/Timeline";
import { Can } from "@/components/auth/guards";
import { useAuth, usePermission } from "@/hooks/useAuth";
import { admissionService } from "@/services/admissionService";
import { schoolService } from "@/services/schoolService";
import { toast } from "@/stores/uiStore";
import { formatDate, formatDateTime, fullName } from "@/lib/format";
import { ADMISSION_STATUS, DOC_STATUS, LEVEL_LABEL } from "@/lib/status";
import { P } from "@/config/permissions";
import type { ApiError } from "@/lib/api/client";
import type { AdmissionApplication, AdmissionStatus } from "@/types";

const TAB_ORDER: AdmissionStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "INFO_REQUESTED",
  "WAITLISTED",
  "APPROVED",
  "REJECTED",
];

type ReviewAction = Extract<
  AdmissionStatus,
  "UNDER_REVIEW" | "INFO_REQUESTED" | "APPROVED" | "REJECTED" | "WAITLISTED"
>;

export default function AdmissionsPage() {
  const { user } = useAuth();
  const { has } = usePermission();
  const qc = useQueryClient();
  const schoolId = user!.schoolId!;

  const [tab, setTab] = useState<AdmissionStatus>("SUBMITTED");
  const [selected, setSelected] = useState<AdmissionApplication | null>(null);
  const [note, setNote] = useState("");
  const [classId, setClassId] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["admission-stats", schoolId],
    queryFn: () => admissionService.stats(schoolId),
  });

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["admissions", schoolId, tab],
    queryFn: () => admissionService.listBySchool(schoolId, tab),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn: () => schoolService.classes(schoolId),
  });

  const review = useMutation({
    mutationFn: (input: { applicationId: string; action: ReviewAction; note?: string; classId?: string }) =>
      admissionService.review({ ...input, actor: fullName(user!) }),
    onSuccess: (_app, input) => {
      setSelected(null);
      void qc.invalidateQueries({ queryKey: ["admissions"] });
      void qc.invalidateQueries({ queryKey: ["admission-stats"] });
      if (input.action === "APPROVED") {
        void qc.invalidateQueries({ queryKey: ["classes"] });
        void qc.invalidateQueries({ queryKey: ["students"] });
        void qc.invalidateQueries({ queryKey: ["school"] });
      }
      toast({
        title: `Application ${ADMISSION_STATUS[input.action].label.toLowerCase()}`,
        description: input.action === "APPROVED" ? "The student was enrolled and the seat reserved." : undefined,
        variant: "success",
      });
    },
    onError: (e) =>
      toast({ title: "Review failed", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const openApplication = (app: AdmissionApplication) => {
    setSelected(app);
    setNote("");
    setClassId("");
  };

  const act = (action: ReviewAction) => {
    if (!selected) return;
    review.mutate({
      applicationId: selected.id,
      action,
      note: note.trim() || undefined,
      classId: action === "APPROVED" ? classId : undefined,
    });
  };

  const pendingAction = review.isPending ? review.variables?.action : undefined;
  const eligibleClasses = selected ? classes.filter((c) => c.level === selected.levelApplied) : [];
  const reviewable = selected ? !["APPROVED", "REJECTED"].includes(selected.status) : false;

  return (
    <PageTransition>
      <PageHeader
        title="Admissions"
        description="Review incoming applications, request missing information and place admitted students."
      />

      <Tabs
        className="mb-4"
        items={TAB_ORDER.map((s) => ({ value: s, label: ADMISSION_STATUS[s].label, count: stats?.[s] ?? 0 }))}
        value={tab}
        onChange={(v) => setTab(v as AdmissionStatus)}
      />

      {!isLoading && applications.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={`No ${ADMISSION_STATUS[tab].label.toLowerCase()} applications`}
          description="Applications appear here as parents submit them from the discovery portal."
        />
      ) : (
        <DataTable<AdmissionApplication>
          loading={isLoading}
          columns={[
            {
              key: "child",
              header: "Applicant",
              render: (a) => (
                <span className="font-medium text-ink">
                  {a.childFirstName} {a.childLastName}
                </span>
              ),
            },
            { key: "level", header: "Level", render: (a) => LEVEL_LABEL[a.levelApplied] },
            { key: "parent", header: "Parent", render: (a) => a.parentName },
            {
              key: "submittedAt",
              header: "Submitted",
              render: (a) => <span className="tnum">{formatDate(a.submittedAt)}</span>,
            },
            {
              key: "docs",
              header: "Docs",
              align: "center",
              render: (a) => (
                <span className="inline-flex items-center gap-1.5 text-muted tnum">
                  <Paperclip className="size-3.5" aria-hidden /> {a.documents.length}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (a) => {
                const meta = ADMISSION_STATUS[a.status];
                return <Badge variant={meta.variant} dot>{meta.label}</Badge>;
              },
            },
          ]}
          rows={applications}
          keyField={(a) => a.id}
          onRowClick={openApplication}
          pageSize={10}
          empty="No applications in this stage."
        />
      )}

      <Drawer
        open={Boolean(selected)}
        onClose={() => !review.isPending && setSelected(null)}
        title={selected ? `${selected.childFirstName} ${selected.childLastName}` : ""}
        description={selected ? `${LEVEL_LABEL[selected.levelApplied]} · submitted ${formatDate(selected.submittedAt)}` : undefined}
        wide
      >
        {selected && (
          <div className="space-y-5">
            {/* Applicant details */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint mb-2">Applicant</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px]">
                <div>
                  <dt className="text-[11.5px] text-faint">Parent / guardian</dt>
                  <dd className="font-medium text-ink">{selected.parentName}</dd>
                </div>
                <div>
                  <dt className="text-[11.5px] text-faint">Gender</dt>
                  <dd className="font-medium text-ink">{selected.gender === "F" ? "Female" : "Male"}</dd>
                </div>
                <div>
                  <dt className="text-[11.5px] text-faint">Date of birth</dt>
                  <dd className="font-medium text-ink tnum">{formatDate(selected.dateOfBirth)}</dd>
                </div>
                <div>
                  <dt className="text-[11.5px] text-faint">Previous school</dt>
                  <dd className="font-medium text-ink">{selected.previousSchool ?? "—"}</dd>
                </div>
              </dl>
            </div>

            {/* Documents */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint mb-2">Documents</p>
              {selected.documents.length === 0 ? (
                <p className="text-[13px] text-muted">No documents were attached.</p>
              ) : (
                <ul className="space-y-1.5">
                  {selected.documents.map((d) => {
                    const meta = DOC_STATUS[d.status];
                    return (
                      <li
                        key={d.id}
                        className="flex items-center gap-2.5 rounded-(--radius-ctl) border border-line px-3 py-2 text-[13px]"
                      >
                        <FileText className="size-4 text-primary-deep shrink-0" aria-hidden />
                        <span className="truncate flex-1 text-ink">{d.fileName}</span>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Timeline */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint mb-2">Timeline</p>
              <Timeline
                events={selected.timeline.map((e) => ({
                  title:
                    e.status === "NOTE"
                      ? "Note"
                      : ADMISSION_STATUS[e.status as keyof typeof ADMISSION_STATUS]?.label ?? e.status,
                  meta: formatDateTime(e.at),
                  description: e.note ?? (e.actor ? `by ${e.actor}` : undefined),
                  tone:
                    e.status === "APPROVED" ? "success" :
                    e.status === "REJECTED" ? "danger" :
                    e.status === "INFO_REQUESTED" || e.status === "UNDER_REVIEW" ? "warning" : "default",
                }))}
              />
            </div>

            {/* Review actions */}
            {reviewable && (
              <Can permission={P.ADMISSIONS_REVIEW}>
                <div className="rounded-(--radius-card) border border-line bg-paper/50 p-4 space-y-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Review decision</p>

                  {selected.status === "SUBMITTED" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={pendingAction === "UNDER_REVIEW"}
                      disabled={review.isPending}
                      onClick={() => act("UNDER_REVIEW")}
                    >
                      Start review
                    </Button>
                  )}

                  <Textarea
                    label="Note to parent"
                    hint="Required when requesting information or rejecting."
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Please upload a clearer copy of the birth certificate."
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={pendingAction === "INFO_REQUESTED"}
                      disabled={review.isPending || !note.trim()}
                      onClick={() => act("INFO_REQUESTED")}
                    >
                      Request info
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={pendingAction === "WAITLISTED"}
                      disabled={review.isPending || selected.status === "WAITLISTED"}
                      onClick={() => act("WAITLISTED")}
                    >
                      Waitlist
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      loading={pendingAction === "REJECTED"}
                      disabled={review.isPending || !note.trim()}
                      onClick={() => act("REJECTED")}
                    >
                      Reject
                    </Button>
                  </div>

                  <div className="border-t border-line pt-3.5 space-y-3">
                    <Select
                      label={`Place in class — ${LEVEL_LABEL[selected.levelApplied]}`}
                      hint={eligibleClasses.length === 0 ? "No classes exist for this level yet." : undefined}
                      value={classId}
                      onChange={(e) => setClassId(e.target.value)}
                    >
                      <option value="">Select a class…</option>
                      {eligibleClasses.map((c) => {
                        const left = c.capacity - c.enrolled;
                        return (
                          <option key={c.id} value={c.id} disabled={left <= 0}>
                            {c.name} — {left <= 0 ? "full" : `${left} seat${left === 1 ? "" : "s"} left`}
                          </option>
                        );
                      })}
                    </Select>
                    <Button
                      size="sm"
                      loading={pendingAction === "APPROVED"}
                      disabled={review.isPending || !classId}
                      onClick={() => act("APPROVED")}
                    >
                      Approve &amp; enrol
                    </Button>
                  </div>
                </div>
              </Can>
            )}
            {!reviewable && has(P.ADMISSIONS_REVIEW) && (
              <p className="text-[13px] text-muted">
                This application is {ADMISSION_STATUS[selected.status].label.toLowerCase()} — no further action needed.
              </p>
            )}
          </div>
        )}
      </Drawer>
    </PageTransition>
  );
}
