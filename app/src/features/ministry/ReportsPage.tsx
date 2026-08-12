import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { UnderDevelopment } from "@/components/ui/UnderDevelopment";

/**
 * The real backend has no report-generation/export capability — generating and exporting
 * national reports isn't supported. Show an honest "not available" state.
 */
export default function ReportsPage() {
  return (
    <PageTransition>
      <PageHeader
        title="Reports"
        description="Export national statistics as CSV for offline analysis, or manage recurring digests."
      />
      <UnderDevelopment
        title="Report generation isn't available yet"
        description="Generating and exporting national reports (CSV/PDF exports, scheduled digests) isn't supported by the backend yet. Use the Enrollment, Capacity and Staffing pages to view live national data in the meantime."
      />
    </PageTransition>
  );
}
