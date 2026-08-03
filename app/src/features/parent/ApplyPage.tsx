import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, FileCheck2, MapPin, Send, Star, Upload, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Stepper } from "@/components/ui/Stepper";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { schoolService } from "@/services/schoolService";
import { admissionService } from "@/services/admissionService";
import { USE_MOCKS } from "@/lib/api/client";
import { toast } from "@/stores/uiStore";
import { SCHOOL_TYPE_LABEL } from "@/lib/status";
import { formatNumber, fullName } from "@/lib/format";
import type { PublicSchoolClass, SchoolClass } from "@/types";

const STEPS = ["Child & class", "Annual report", "Review & submit"];

export default function ApplyPage() {
  const { schoolId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const { data: school } = useQuery({ queryKey: ["school", schoolId], queryFn: () => schoolService.get(schoolId) });
  const { data: mockClasses = [] } = useQuery({
    queryKey: ["school-classes", schoolId],
    queryFn: () => schoolService.classes(schoolId),
    enabled: USE_MOCKS,
  });
  const classOptions: Array<SchoolClass | PublicSchoolClass> = USE_MOCKS ? mockClasses : (school?.classes ?? []);
  const openClasses = classOptions.filter((c) => !("isFull" in c) || !c.isFull);

  const [child, setChild] = useState({
    firstName: "", lastName: user?.lastName ?? "", dateOfBirth: "", classId: "", previousSchool: "",
  });
  const [annualReport, setAnnualReport] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedClass = classOptions.find((c) => c.id === child.classId);

  const submit = useMutation({
    mutationFn: () =>
      admissionService.submit({
        schoolId,
        classId: child.classId,
        parentId: user!.id,
        parentName: fullName(user!),
        firstName: child.firstName.trim(),
        lastName: child.lastName.trim(),
        dateOfBirth: child.dateOfBirth,
        previousSchool: child.previousSchool.trim(),
        annualReport: annualReport!,
      }),
    onSuccess: (result) => {
      toast({
        title: "Application submitted",
        description: result.message,
        variant: "success",
      });
      navigate("/parent/applications");
    },
    onError: (e) => {
      const message = (e as { message?: string })?.message ?? "Please check the details and try again.";
      toast({ title: "Submission failed", description: message, variant: "error" });
    },
  });

  const validateStep0 = () => {
    const next: Record<string, string> = {};
    if (!child.firstName.trim()) next.firstName = "Required";
    if (!child.lastName.trim()) next.lastName = "Required";
    if (!child.dateOfBirth) next.dateOfBirth = "Required";
    if (!child.classId) next.classId = "Select a class";
    if (child.previousSchool.trim().length < 2) next.previousSchool = "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStep1 = () => {
    const next: Record<string, string> = {};
    if (!annualReport) next.annualReport = "The child's most recent annual report/transcript is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (step === 0 && !validateStep0()) return;
    if (step === 1 && !validateStep1()) return;
    setStep((s) => Math.min(2, s + 1));
  };

  return (
    <PageTransition>
      <PageHeader
        backTo={`/parent/discover/${schoolId}`}
        backLabel={school?.name ?? "School profile"}
        title={`Apply to ${school?.name ?? "…"}`}
        description="Your child's report is validated automatically — no manual review queue."
      />

      <div className="grid lg:grid-cols-[1fr_310px] gap-4 items-start">
      <Card className="max-w-2xl">
        <Stepper steps={STEPS} current={step} className="mb-6" />

        {step === 0 && (
          <div className="space-y-3.5">
            <div className="grid sm:grid-cols-2 gap-3.5">
              <Input label="Child's first name" value={child.firstName} error={errors.firstName}
                onChange={(e) => setChild((c) => ({ ...c, firstName: e.target.value }))} required />
              <Input label="Child's last name" value={child.lastName} error={errors.lastName}
                onChange={(e) => setChild((c) => ({ ...c, lastName: e.target.value }))} required />
              <Input label="Date of birth" type="date" value={child.dateOfBirth} error={errors.dateOfBirth}
                onChange={(e) => setChild((c) => ({ ...c, dateOfBirth: e.target.value }))} required />
              <Select label="Class" value={child.classId} error={errors.classId}
                onChange={(e) => setChild((c) => ({ ...c, classId: e.target.value }))} required>
                <option value="" disabled>Select a class with open seats…</option>
                {openClasses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              <Input label="Previous school" value={child.previousSchool} error={errors.previousSchool}
                onChange={(e) => setChild((c) => ({ ...c, previousSchool: e.target.value }))} required
                className="sm:col-span-2" />
            </div>
            {openClasses.length === 0 && (
              <p className="text-[12.5px] text-clay-deep">This school has no open classes right now.</p>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3.5">
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink">Annual report / transcript</span>
              {annualReport ? (
                <div className="flex items-center gap-2 rounded-(--radius-ctl) border border-line bg-surface px-3 py-2 text-[13px]">
                  <FileCheck2 className="size-4 text-primary-deep shrink-0" />
                  <span className="truncate flex-1 text-ink">{annualReport.name}</span>
                  <button type="button" onClick={() => setAnnualReport(null)} aria-label="Remove file" className="p-0.5 rounded text-faint hover:text-clay transition-colors">
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-1.5 rounded-(--radius-card) border-2 border-dashed border-line-strong bg-paper/60 hover:border-faint px-4 py-6 cursor-pointer transition-colors">
                  <Upload className="size-5 text-muted" aria-hidden />
                  <span className="text-[13.5px] text-ink font-medium">Click to upload the report</span>
                  <span className="text-[12px] text-faint">PDF or photo</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="sr-only"
                    onChange={(e) => setAnnualReport(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
              {errors.annualReport && <p className="text-[12.5px] text-clay-deep">{errors.annualReport}</p>}
            </div>
            <div className="flex items-start gap-2.5 rounded-xl bg-sky-soft px-4 py-3 text-[13px] text-sky-deep">
              <CheckCircle2 className="size-4.5 shrink-0 mt-0.5" />
              <p>
                The report is scanned automatically: the child's name, average grade and conduct grade
                are extracted and checked against this class's admission criteria — no waiting for a
                human reviewer.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3.5">
            <div className="rounded-(--radius-card) border border-line bg-paper/60 p-4">
              <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-3 text-[13.5px]">
                <div><dt className="text-muted">Child</dt><dd className="font-semibold text-ink">{child.firstName} {child.lastName}</dd></div>
                <div><dt className="text-muted">Date of birth</dt><dd className="font-medium text-ink tnum">{child.dateOfBirth}</dd></div>
                <div><dt className="text-muted">Class</dt><dd className="font-medium text-ink">{selectedClass?.name ?? "—"}</dd></div>
                <div><dt className="text-muted">School</dt><dd className="font-medium text-ink">{school?.name}</dd></div>
                <div><dt className="text-muted">Previous school</dt><dd className="font-medium text-ink">{child.previousSchool}</dd></div>
                <div>
                  <dt className="text-muted mb-1">Annual report</dt>
                  <dd>{annualReport && <Badge variant="info">{annualReport.name}</Badge>}</dd>
                </div>
              </dl>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl bg-sky-soft px-4 py-3 text-[13px] text-sky-deep">
              <CheckCircle2 className="size-4.5 shrink-0 mt-0.5" />
              <p>
                Admission here is fully automatic: report validation, then payment of the application
                and tuition fees, then the seat is confirmed. There is no manual "under review by a
                person" step — pay from the Payments page as soon as this submits.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-6">
          <Button variant="ghost" icon={<ArrowLeft className="size-4" />} onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Button>
          {step < 2 ? (
            <Button iconRight={<ArrowRight className="size-4" />} onClick={goNext}>
              Continue
            </Button>
          ) : (
            <Button icon={<Send className="size-4" />} loading={submit.isPending} onClick={() => submit.mutate()}>
              Submit application
            </Button>
          )}
        </div>
      </Card>

      {/* Side rail */}
      <aside className="space-y-4">
        <Card>
          <CardHeader title="You're applying to" />
          {school ? (
            <div className="space-y-2 text-[12.5px]">
              <p className="font-display font-semibold text-[14px] text-ink">{school.name}</p>
              <p className="flex items-center gap-1.5 text-muted">
                <MapPin className="size-3.5 shrink-0" aria-hidden /> {school.district} · {school.sector}
              </p>
              <p className="text-muted">{SCHOOL_TYPE_LABEL[school.type]} school</p>
              {school.satisfactionScore !== undefined && (
                <p className="flex items-center gap-1.5 font-semibold text-gold-deep tnum">
                  <Star className="size-3.5 fill-gold text-gold" aria-hidden /> {school.satisfactionScore.toFixed(1)} parent satisfaction
                </p>
              )}
              <div className="flex items-center justify-between border-t border-line mt-2.5 pt-2.5">
                <span className="text-muted">Seats available (school-wide)</span>
                <span className="font-semibold text-ink tnum">
                  {formatNumber(Math.max(0, school.capacity - school.enrolled))}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-32" />
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="How this works" />
          <ul className="space-y-2">
            {[
              ["Annual report", "OCR-extracted name, average grade and conduct grade — required, single file"],
              ["Automatic validation", "Checked against the class's minimum entry/conduct grade instantly"],
              ["Pay to confirm", "Application + tuition fees payable from the Payments page once submitted"],
            ].map(([doc, hint]) => (
              <li key={doc} className="flex items-start gap-2.5">
                <FileCheck2 className="size-4 text-primary-deep shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="text-[13px] font-medium text-ink leading-snug">{doc}</p>
                  <p className="text-[11.5px] text-muted">{hint}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </aside>
      </div>
    </PageTransition>
  );
}
