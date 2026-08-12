import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { UnderDevelopment } from "@/components/ui/UnderDevelopment";

export default function AssessmentsPage() {
  return (
    <PageTransition>
      <PageHeader
        title="Assessments"
        description="Every exam, test, quiz and assignment you have recorded — click a row to grade it."
      />
      <UnderDevelopment
        title="Assessments & grading"
        description="Gradebook and assessment tracking aren't available in this backend yet."
      />
    </PageTransition>
  );
}
