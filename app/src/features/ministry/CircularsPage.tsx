import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { UnderDevelopment } from "@/components/ui/UnderDevelopment";

/**
 * National circular broadcast is a SUPER_ADMIN-only capability (`POST /admin/broadcast`, a
 * different portal) — the real backend has no education-authority-facing endpoint for
 * publishing national circulars. Show an honest "not available" state instead of a
 * broken/fake compose flow.
 */
export default function CircularsPage() {
  return (
    <PageTransition>
      <PageHeader
        title="Circulars"
        description="National notices published by the ministry to schools across the platform."
      />
      <UnderDevelopment
        title="National circulars aren't available yet"
        description="Publishing national circulars from an education-authority account isn't supported by the backend yet — national broadcasts are currently a platform-administrator capability. Contact a platform administrator if you need to send an urgent notice."
      />
    </PageTransition>
  );
}
