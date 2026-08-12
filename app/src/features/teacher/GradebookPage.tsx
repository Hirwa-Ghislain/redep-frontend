import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { UnderDevelopment } from "@/components/ui/UnderDevelopment";

export default function GradebookPage() {
  return (
    <PageTransition>
      <PageHeader backTo="/teacher/assessments" backLabel="Assessments" title="Gradebook" />
      <UnderDevelopment
        title="Assessments & grading"
        description="Gradebook and assessment tracking aren't available in this backend yet."
      />
    </PageTransition>
  );
}
