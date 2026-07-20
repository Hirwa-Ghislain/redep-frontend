import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FileDrop } from "@/components/ui/FileDrop";
import { Input, Select } from "@/components/ui/Input";
import { Stepper } from "@/components/ui/Stepper";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/hooks/useAuth";
import { schoolService } from "@/services/schoolService";
import { admissionService } from "@/services/admissionService";
import { toast } from "@/stores/uiStore";
import { LEVEL_LABEL } from "@/lib/status";
import { fullName } from "@/lib/format";
import type { Gender, SchoolLevel } from "@/types";

const STEPS = ["Child details", "Documents", "Review & submit"];

export default function ApplyPage() {
  const { schoolId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const { data: school } = useQuery({ queryKey: ["school", schoolId], queryFn: () => schoolService.get(schoolId) });

  const [child, setChild] = useState({
    firstName: "", lastName: user?.lastName ?? "", gender: "F" as Gender,
    dateOfBirth: "", levelApplied: "" as SchoolLevel | "", previousSchool: "",
  });
  const [birthCert, setBirthCert] = useState<string[]>([]);
  const [records, setRecords] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = useMutation({
    mutationFn: () =>
      admissionService.submit({
        schoolId,
        parentId: user!.id,
        parentName: fullName(user!),
        childFirstName: child.firstName.trim(),
        childLastName: child.lastName.trim(),
        gender: child.gender,
        dateOfBirth: child.dateOfBirth,
        levelApplied: child.levelApplied as SchoolLevel,
        previousSchool: child.previousSchool || undefined,
        documents: [
          ...birthCert.map((fileName) => ({ type: "BIRTH_CERTIFICATE" as const, fileName })),
          ...records.map((fileName) => ({ type: "ACADEMIC_RECORDS" as const, fileName })),
        ],
      }),
    onSuccess: () => {
      toast({
        title: "Application submitted",
        description: `${school?.name} will review it and notify you here.`,
        variant: "success",
      });
      navigate("/parent/applications");
    },
    onError: () => toast({ title: "Submission failed", description: "Please try again.", variant: "error" }),
  });

  const validateStep0 = () => {
    const next: Record<string, string> = {};
    if (!child.firstName.trim()) next.firstName = "Required";
    if (!child.lastName.trim()) next.lastName = "Required";
    if (!child.dateOfBirth) next.dateOfBirth = "Required";
    if (!child.levelApplied) next.levelApplied = "Select a level";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStep1 = () => {
    const next: Record<string, string> = {};
    if (birthCert.length === 0) next.birthCert = "A birth certificate is required";
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
        description="Your application goes straight to the school's admissions office."
      />

      <Card className="max-w-xl">
        <Stepper steps={STEPS} current={step} className="mb-6" />

        {step === 0 && (
          <div className="space-y-3.5">
            <div className="grid sm:grid-cols-2 gap-3.5">
              <Input label="Child's first name" value={child.firstName} error={errors.firstName}
                onChange={(e) => setChild((c) => ({ ...c, firstName: e.target.value }))} required />
              <Input label="Child's last name" value={child.lastName} error={errors.lastName}
                onChange={(e) => setChild((c) => ({ ...c, lastName: e.target.value }))} required />
              <Select label="Gender" value={child.gender} onChange={(e) => setChild((c) => ({ ...c, gender: e.target.value as Gender }))}>
                <option value="F">Female</option>
                <option value="M">Male</option>
              </Select>
              <Input label="Date of birth" type="date" value={child.dateOfBirth} error={errors.dateOfBirth}
                onChange={(e) => setChild((c) => ({ ...c, dateOfBirth: e.target.value }))} required />
              <Select label="Level applying for" value={child.levelApplied} error={errors.levelApplied}
                onChange={(e) => setChild((c) => ({ ...c, levelApplied: e.target.value as SchoolLevel }))} required>
                <option value="" disabled>Select…</option>
                {(school?.levels ?? []).map((l) => (
                  <option key={l} value={l}>{LEVEL_LABEL[l]}</option>
                ))}
              </Select>
              <Input label="Previous school (optional)" value={child.previousSchool}
                onChange={(e) => setChild((c) => ({ ...c, previousSchool: e.target.value }))} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3.5">
            <FileDrop
              label="Birth certificate"
              hint={errors.birthCert ?? "Required — PDF or photo."}
              files={birthCert}
              onChange={setBirthCert}
              multiple={false}
            />
            <FileDrop
              label="Previous academic records"
              hint="Optional for Nursery/P1 — recommended for transfers."
              files={records}
              onChange={setRecords}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3.5">
            <div className="rounded-(--radius-card) border border-line bg-paper/60 p-4">
              <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-3 text-[13.5px]">
                <div><dt className="text-muted">Child</dt><dd className="font-semibold text-ink">{child.firstName} {child.lastName}</dd></div>
                <div><dt className="text-muted">Date of birth</dt><dd className="font-medium text-ink tnum">{child.dateOfBirth}</dd></div>
                <div><dt className="text-muted">Applying for</dt><dd className="font-medium text-ink">{child.levelApplied ? LEVEL_LABEL[child.levelApplied] : "—"}</dd></div>
                <div><dt className="text-muted">School</dt><dd className="font-medium text-ink">{school?.name}</dd></div>
                <div className="sm:col-span-2">
                  <dt className="text-muted mb-1">Documents</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {[...birthCert, ...records].map((f) => <Badge key={f} variant="info">{f}</Badge>)}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl bg-sky-soft px-4 py-3 text-[13px] text-sky-deep">
              <CheckCircle2 className="size-4.5 shrink-0 mt-0.5" />
              <p>
                The school will review your application and may approve it, request more information,
                or offer a waitlist place. You'll be notified at every step.
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
    </PageTransition>
  );
}
