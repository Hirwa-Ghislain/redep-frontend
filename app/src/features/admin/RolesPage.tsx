import { Construction, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { BackendRole } from "@/types";

/** The backend's `Role` enum (`prisma/schema.prisma`) is fixed — there is no dynamic
 *  role/permission catalog server-side. These summaries are written from what each role is
 *  actually authorized to do across the E-SHURI backend's modules. */
const BACKEND_ROLES: { role: BackendRole; description: string }[] = [
  { role: "SUPER_ADMIN", description: "Full platform administration — manage schools, users, ministry accounts, national broadcasts and the audit log." },
  { role: "SCHOOL_ADMIN", description: "Runs a single school — fees, classes, staff invitations, admissions, announcements and accounting for that school only." },
  { role: "TEACHER", description: "Views assigned classes/courses and marks attendance for their own roster." },
  { role: "ACCOUNTANT", description: "School-scoped finance role — views fees, payments and accounting, and can invite staff, without full school-admin access." },
  { role: "PARENT", description: "Manages their children's enrollment, applications, payments and messages with schools." },
  { role: "APPLICANT", description: "Applies to published teaching/staff vacancies and tracks their own applications." },
  { role: "EDUCATION_AUTHORITY", description: "Read-only national oversight — enrollment, capacity, staffing and resignation statistics across every school." },
];

export default function RolesPage() {
  return (
    <PageTransition>
      <PageHeader
        title="Roles & permissions"
        description="Every account is assigned one or more of the platform's fixed roles."
      />

      <div className="mb-5 flex items-start gap-2.5 rounded-(--radius-card) border border-line bg-paper/70 px-4 py-3">
        <Construction className="size-4 text-gold-deep shrink-0 mt-0.5" aria-hidden />
        <p className="text-[12.5px] text-muted">
          Roles are fixed for now — a custom permission-catalog editor isn't available. The backend defines a single,
          server-enforced set of 7 roles; schools cannot create their own delegated roles beyond the built-in
          Teacher/Accountant staff types.
        </p>
      </div>

      <Stagger className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {BACKEND_ROLES.map(({ role, description }) => (
          <StaggerItem key={role} className="h-full">
            <Card padded={false} className="p-4 h-full flex flex-col">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-deep">
                  <ShieldCheck className="size-4" aria-hidden />
                </span>
                <h3 className="font-display font-semibold text-[14px] text-ink truncate">{role}</h3>
              </div>
              <p className="text-[12.5px] text-muted mt-2 flex-1">{description}</p>
              <div className="mt-3 border-t border-line pt-3">
                <Badge variant="ink">Built-in · fixed</Badge>
              </div>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
    </PageTransition>
  );
}
