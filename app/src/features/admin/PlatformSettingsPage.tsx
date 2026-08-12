import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { UnderDevelopment } from "@/components/ui/UnderDevelopment";

export default function PlatformSettingsPage() {
  return (
    <PageTransition>
      <PageHeader
        title="Platform settings"
        description="Global calendar, payment rails, feature rollout and compliance controls."
      />
      <UnderDevelopment
        title="No platform-wide settings yet"
        description="This backend has no central settings entity to manage here: payment channels are configured per school (see each school's Fees page), districts come from the read-only NESA-backed location registry, and there's no academic-year/term model at all — the Prisma schema has no Term or AcademicYear table. Once a real cross-platform settings concept exists, it will live here."
      />
    </PageTransition>
  );
}
