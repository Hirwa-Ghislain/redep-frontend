import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CalendarCheck, GraduationCap, Mail, Save, School, Settings } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { academicService } from "@/services/academicService";
import { authService } from "@/services/authService";
import { schoolService } from "@/services/schoolService";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/stores/uiStore";
import { formatDate } from "@/lib/format";
import { LEVEL_LABEL } from "@/lib/status";
import { USE_MOCKS, type ApiError } from "@/lib/api/client";

export default function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");

  const { data: teacher, isLoading } = useQuery({
    queryKey: ["teacher", user?.id],
    queryFn: () => academicService.teacher(user!.id),
    enabled: Boolean(user),
  });

  const { data: school } = useQuery({
    queryKey: ["school", user?.schoolId],
    queryFn: () => schoolService.get(user!.schoolId!),
    enabled: Boolean(user?.schoolId),
  });

  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ["teacher-classes", user?.id],
    queryFn: () => academicService.teacherClasses(user!.id),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (teacher) setPhone(teacher.phone);
  }, [teacher]);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
    }
  }, [user]);

  // Mock mode only: phone has no editable backend field (see below), but the demo db
  // supports it directly so the original UX stays intact for VITE_USE_MOCKS=true.
  const savePhone = useMutation({
    mutationFn: () => academicService.updateTeacher(user!.id, { phone: phone.trim() }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["teacher"] });
      toast({ title: "Phone number updated", description: "The school office will see your new number.", variant: "success" });
    },
    onError: (e) =>
      toast({ title: "Could not update phone", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  // Live mode: only first/last name are actually editable (`PATCH /auth/me`). Phone has
  // no update endpoint on the real backend at all, so it stays read-only there.
  const saveName = useMutation({
    mutationFn: () => authService.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() }),
    onSuccess: (updated) => {
      const session = useAuthStore.getState().session;
      if (session) useAuthStore.setState({ session: { ...session, user: updated } });
      toast({ title: "Profile updated", description: "Your name has been saved.", variant: "success" });
    },
    onError: (e) =>
      toast({ title: "Could not update profile", description: (e as unknown as ApiError).message, variant: "error" }),
  });

  const phoneChanged = Boolean(teacher) && phone.trim() !== teacher!.phone && phone.trim().length > 0;
  const nameChanged =
    Boolean(user) &&
    (firstName.trim() !== user!.firstName || lastName.trim() !== user!.lastName) &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0;

  if (isLoading || !teacher) {
    return (
      <PageTransition>
        <PageHeader title="My profile" description="Your teaching profile as the school sees it." />
        <Skeleton className="h-32 mb-4" />
        <div className="grid lg:grid-cols-3 gap-4">
          <CardSkeleton className="lg:col-span-2" />
          <CardSkeleton />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageHeader title="My profile" description="Your teaching profile as the school sees it." />

      {/* Identity */}
      <Card padded={false} className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3.5">
          <Avatar name={teacher.name} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[17px] font-bold text-ink leading-tight">{teacher.name}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {teacher.subjects.map((s) => (
                <Badge key={s} variant="success">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
          <dl className="grid gap-x-8 gap-y-1.5 text-[12.5px] sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <dt className="sr-only">Email</dt>
              <Mail className="size-3.5 text-faint" aria-hidden />
              <dd className="text-muted">{teacher.email}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">School</dt>
              <School className="size-3.5 text-faint" aria-hidden />
              <dd className="text-muted">{school?.name ?? "…"}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">{USE_MOCKS ? "Hired" : "Joined"}</dt>
              <CalendarCheck className="size-3.5 text-faint" aria-hidden />
              <dd className="text-muted">
                {USE_MOCKS ? "Hired" : "Joined"} <span className="tnum">{formatDate(teacher.hiredAt)}</span>
              </dd>
            </div>
          </dl>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          {/* Contact */}
          {USE_MOCKS ? (
            <Card>
              <CardHeader
                title="Contact details"
                description="Keep your phone number current — the school office uses it to reach you."
              />
              <div className="flex flex-wrap items-end gap-3">
                <Input
                  label="Phone number"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+250 7xx xxx xxx"
                  className="w-full sm:w-64"
                />
                <Button
                  size="sm"
                  icon={<Save className="size-3.5" />}
                  loading={savePhone.isPending}
                  disabled={!phoneChanged}
                  onClick={() => savePhone.mutate()}
                >
                  Save
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader title="Name & contact" description="Your phone number is managed by your school administrator." />
              <div className="space-y-3.5">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                <Input label="Phone number" type="tel" value={phone} disabled hint="Contact your school administrator to update this." />
                <Button
                  size="sm"
                  icon={<Save className="size-3.5" />}
                  loading={saveName.isPending}
                  disabled={!nameChanged}
                  onClick={() => saveName.mutate()}
                >
                  Save
                </Button>
              </div>
            </Card>
          )}

          {/* Classes taught */}
          <Card padded={false}>
            <CardHeader
              className="px-5 pt-4"
              title="Classes taught"
              action={
                <Link to="/teacher/classes" className="text-[12.5px] font-medium text-primary-deep hover:underline">
                  View rosters
                </Link>
              }
            />
            {loadingClasses ? (
              <div className="px-5 pb-5">
                <CardSkeleton />
              </div>
            ) : classes.length === 0 ? (
              <EmptyState icon={GraduationCap} title="No classes assigned" description="Assigned classes will appear here." />
            ) : (
              <div className="divide-y divide-line">
                {classes.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink">{c.name}</p>
                      <p className="text-[12px] text-muted">
                        <span className="tnum">{c.students.length}</span> students
                      </p>
                    </div>
                    <Badge variant="neutral">{c.level ? LEVEL_LABEL[c.level] : c.name}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Account settings link */}
        <Link to="/teacher/settings" className="block group" aria-label="Open account settings">
          <Card hover padded={false} className="flex items-center gap-3 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ink/6 text-ink">
              <Settings className="size-4.5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-ink">Account settings</span>
              <span className="block text-[12px] text-muted">Password, notifications and sign-in options.</span>
            </span>
            <ArrowRight className="size-4 text-faint group-hover:text-primary-deep group-hover:translate-x-0.5 transition-all" />
          </Card>
        </Link>
      </div>
    </PageTransition>
  );
}
