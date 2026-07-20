import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, GraduationCap, School as SchoolIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { studentService } from "@/services/studentService";
import { formatDate, fullName } from "@/lib/format";
import { STUDENT_STATUS } from "@/lib/status";

export default function ChildrenPage() {
  const { user } = useAuth();
  const { data: children = [], isLoading } = useQuery({
    queryKey: ["children", user?.id],
    queryFn: () => studentService.listByParent(user!.id),
    enabled: Boolean(user),
  });

  const current = children.filter((c) => c.status === "ENROLLED");
  const former = children.filter((c) => c.status !== "ENROLLED");

  return (
    <PageTransition>
      <PageHeader
        title="My children"
        description="One account for every child, across every school."
      />

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4"><CardSkeleton /><CardSkeleton /></div>
      ) : children.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No children linked yet"
          description="When a school approves your admission application, your child appears here automatically."
        />
      ) : (
        <>
          <Stagger className="grid md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {current.map((child) => (
              <StaggerItem key={child.id}>
                <Link to={`/parent/children/${child.id}`}>
                  <Card hover padded={false} className="h-full p-4 group">
                    <div className="flex items-start gap-3">
                      <Avatar name={fullName(child)} />
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-semibold text-[14px] text-ink leading-snug">{fullName(child)}</p>
                        <p className="flex items-center gap-1.5 text-[12.5px] text-muted mt-0.5">
                          <SchoolIcon className="size-3.5 shrink-0" />
                          <span className="truncate">{child.schoolName}</span>
                        </p>
                        <p className="text-[12px] text-faint mt-0.5">
                          {child.className} · joined {formatDate(child.admissionDate)}
                        </p>
                      </div>
                      <ArrowRight className="size-4 text-faint opacity-0 group-hover:opacity-100 group-hover:text-primary-deep group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                      <Badge variant="success" dot>Enrolled</Badge>
                      <span className="text-[12px] font-medium text-primary-deep">Academics · Teachers · Fees</span>
                    </div>
                  </Card>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>

          {former.length > 0 && (
            <>
              <h2 className="font-display font-semibold text-[15px] text-ink mt-7 mb-3">Former enrollments</h2>
              <Card padded={false} className="max-w-2xl overflow-hidden">
                <div className="divide-y divide-line">
                  {former.map((child) => {
                    const meta = STUDENT_STATUS[child.status];
                    return (
                      <Link
                        key={child.id}
                        to={`/parent/children/${child.id}`}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-paper/70 transition-colors"
                      >
                        <Avatar name={fullName(child)} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-ink">{fullName(child)}</p>
                          <p className="text-[12px] text-muted">
                            {child.schoolName}
                            {child.leftAt ? ` · left ${formatDate(child.leftAt)}` : ""}
                          </p>
                        </div>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        <span className="text-[12px] text-faint">History available</span>
                      </Link>
                    );
                  })}
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </PageTransition>
  );
}
