import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { useAuth } from "@/hooks/useAuth";
import { admissionService, type RealApplicationRow } from "@/services/admissionService";
import { formatDate } from "@/lib/format";

const STATUS_META: Record<RealApplicationRow["status"], { label: string; variant: "info" | "warning" | "success" | "danger" | "neutral" }> = {
  DRAFT: { label: "Draft", variant: "neutral" },
  VALIDATED: { label: "Validated", variant: "info" },
  PENDING_PAYMENT: { label: "Pending payment", variant: "warning" },
  ADMITTED: { label: "Admitted", variant: "success" },
  REJECTED: { label: "Rejected", variant: "danger" },
};

const TAB_ORDER: RealApplicationRow["status"][] = ["VALIDATED", "PENDING_PAYMENT", "ADMITTED", "REJECTED", "DRAFT"];

export default function AdmissionsPage() {
  const { user } = useAuth();
  const schoolId = user!.schoolId!;
  const [tab, setTab] = useState<RealApplicationRow["status"] | "ALL">("ALL");

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["real-admissions", schoolId],
    queryFn: () => admissionService.listRealBySchool(schoolId),
  });

  const counts = TAB_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = applications.filter((a) => a.status === s).length;
    return acc;
  }, {});
  const rows = tab === "ALL" ? applications : applications.filter((a) => a.status === tab);

  return (
    <PageTransition>
      <PageHeader
        title="Admissions"
        description="Applications and their automatic admission status."
      />

      <div className="mb-4 flex items-start gap-2.5 rounded-(--radius-card) border border-line bg-sky-soft/60 px-4 py-3 text-[13px] text-sky-deep">
        <Info className="size-4 shrink-0 mt-0.5" aria-hidden />
        <span>
          Admission is fully automatic: a parent's application documents are OCR-scanned and checked against the
          class's minimum entry/conduct grades, then the applicant is admitted once the application fee is paid.
          There is no manual review, approval, rejection or waitlist step here — this page is a read-only status
          list. Set a class's entry criteria from the Classes page.
        </span>
      </div>

      <Tabs
        className="mb-4"
        items={[
          { value: "ALL", label: "All", count: applications.length },
          ...TAB_ORDER.map((s) => ({ value: s, label: STATUS_META[s].label, count: counts[s] ?? 0 })),
        ]}
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
      />

      {!isLoading && rows.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No applications in this status"
          description="Applications appear here as parents apply and their documents are processed."
        />
      ) : (
        <DataTable<RealApplicationRow>
          loading={isLoading}
          columns={[
            { key: "studentName", header: "Applicant", render: (a) => <span className="font-medium text-ink">{a.studentName}</span> },
            { key: "className", header: "Class applied", render: (a) => a.className },
            {
              key: "extractedGrade",
              header: "OCR grade / conduct",
              render: (a) => (
                <span className="tnum text-muted">
                  {a.extractedGrade ?? "—"} / {a.extractedConduct ?? "—"}
                </span>
              ),
            },
            {
              key: "submittedAt",
              header: "Submitted",
              render: (a) => <span className="tnum">{a.submittedAt ? formatDate(a.submittedAt) : "—"}</span>,
            },
            {
              key: "status",
              header: "Status",
              render: (a) => {
                const meta = STATUS_META[a.status];
                return <Badge variant={meta.variant} dot>{meta.label}</Badge>;
              },
            },
          ]}
          rows={rows}
          keyField={(a) => a.id}
          pageSize={12}
          empty="No applications found."
        />
      )}
    </PageTransition>
  );
}
