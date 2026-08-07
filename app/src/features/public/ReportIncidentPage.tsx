import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ShieldAlert, Upload } from "lucide-react";
import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Input";
import { schoolService } from "@/services/schoolService";
import { incidentService, type IncidentSubmissionResult } from "@/services/incidentService";
import type { ApiError } from "@/lib/api/client";
import type { IncidentCategory, IncidentReportInput, IncidentReporterType, IncidentSubjectType } from "@/types";

const REPORTER_TYPES: { value: IncidentReporterType; label: string }[] = [
  { value: "ANONYMOUS", label: "Prefer to stay anonymous" },
  { value: "STUDENT", label: "Student" },
  { value: "PARENT", label: "Parent / guardian" },
  { value: "TEACHER", label: "Teacher" },
  { value: "STAFF", label: "School staff" },
  { value: "WITNESS", label: "Witness" },
  { value: "OTHER", label: "Other" },
];

const CATEGORIES: { value: IncidentCategory; label: string }[] = [
  { value: "PHYSICAL_VIOLENCE", label: "Physical violence" },
  { value: "SEXUAL_ABUSE", label: "Sexual abuse" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "BULLYING", label: "Bullying" },
  { value: "DISCRIMINATION", label: "Discrimination" },
  { value: "THEFT", label: "Theft" },
  { value: "CORRUPTION", label: "Corruption" },
  { value: "DRUGS", label: "Drugs" },
  { value: "WEAPON", label: "Weapon" },
  { value: "EXAM_MALPRACTICE", label: "Exam malpractice" },
  { value: "NEGLECT", label: "Neglect" },
  { value: "UNSAFE_CONDITIONS", label: "Unsafe conditions" },
  { value: "CYBERBULLYING", label: "Cyberbullying" },
  { value: "OTHER", label: "Other" },
];

const SUBJECT_TYPES: { value: IncidentSubjectType; label: string }[] = [
  { value: "STUDENT", label: "Student" },
  { value: "TEACHER", label: "Teacher" },
  { value: "SCHOOL_ADMIN", label: "School administrator" },
  { value: "STAFF", label: "Staff" },
  { value: "PARENT", label: "Parent" },
  { value: "VISITOR", label: "Visitor" },
  { value: "UNKNOWN", label: "Not sure" },
  { value: "OTHER", label: "Other" },
];

const MAX_EVIDENCE_FILES = 5;

export default function ReportIncidentPage() {
  const { data: schools = [] } = useQuery({ queryKey: ["public-schools"], queryFn: () => schoolService.list() });

  const [reporterType, setReporterType] = useState<IncidentReporterType>("ANONYMOUS");
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [category, setCategory] = useState<IncidentCategory>("BULLYING");
  const [subjectType, setSubjectType] = useState<IncidentSubjectType>("STUDENT");
  const [subjectName, setSubjectName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [immediateDanger, setImmediateDanger] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IncidentSubmissionResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isAnonymous = reporterType === "ANONYMOUS";

  const onFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).slice(0, MAX_EVIDENCE_FILES);
    setFiles(picked);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!schoolId) next.schoolId = "Select a school";
    if (!isAnonymous && !reporterName.trim()) next.reporterName = "Required unless you report anonymously";
    if (!title.trim() || title.trim().length < 5) next.title = "At least 5 characters";
    if (!description.trim() || description.trim().length < 20) next.description = "Please describe what happened (at least 20 characters)";
    setErrors(next);
    if (Object.keys(next).length) return;

    const input: IncidentReportInput = {
      schoolId,
      reporterType,
      reporterName: isAnonymous ? undefined : reporterName.trim() || undefined,
      reporterEmail: isAnonymous ? undefined : reporterEmail.trim() || undefined,
      reporterPhone: isAnonymous ? undefined : reporterPhone.trim() || undefined,
      identityProtected: isAnonymous,
      category,
      subjectType,
      subjectName: subjectName.trim() || undefined,
      title: title.trim(),
      description: description.trim(),
      location: location.trim() || undefined,
      occurredAt: occurredAt || undefined,
      immediateDanger,
    };

    setLoading(true);
    setSubmitError(null);
    try {
      const res = await incidentService.reportPublic(input, files);
      setResult(res);
    } catch (err) {
      setSubmitError((err as ApiError).message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <PublicPageLayout>
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-deep mb-4">
          <CheckCircle2 className="size-5" aria-hidden />
        </span>
        <h1 className="font-display text-[24px] font-bold text-ink">Report received</h1>
        <p className="text-muted text-[14px] mt-1 mb-6">
          Thank you for speaking up. Save these two codes somewhere safe — you'll need both to check the status of
          your report, and the tracking code cannot be shown to you again.
        </p>
        <div className="rounded-(--radius-card) border border-clay/40 bg-clay-soft/60 p-5 space-y-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-clay-deep">Reference code</p>
            <p className="font-display text-[20px] font-bold text-ink tnum">{result.referenceCode}</p>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-clay-deep">Tracking code</p>
            <p className="font-display text-[20px] font-bold text-ink tnum">{result.trackingCode}</p>
          </div>
        </div>
        <Link to="/report-incident/track" className="mt-6 inline-block">
          <Button>Track this report</Button>
        </Link>
      </PublicPageLayout>
    );
  }

  return (
    <PublicPageLayout>
      <span className="flex size-11 items-center justify-center rounded-2xl bg-clay-soft text-clay-deep mb-4">
        <ShieldAlert className="size-5" aria-hidden />
      </span>
      <h1 className="font-display text-[24px] font-bold text-ink">Report a safety concern</h1>
      <p className="text-muted text-[14px] mt-1 mb-6">
        Use this form to report bullying, abuse, unsafe conditions or any other safeguarding concern at a school. You
        may report anonymously.
      </p>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Select label="Who are you?" value={reporterType} onChange={(e) => setReporterType(e.target.value as IncidentReporterType)}>
          {REPORTER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Select>

        {!isAnonymous && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Your name" value={reporterName} onChange={(e) => setReporterName(e.target.value)} error={errors.reporterName} required />
            <Input label="Email (optional)" type="email" value={reporterEmail} onChange={(e) => setReporterEmail(e.target.value)} />
            <Input label="Phone (optional)" type="tel" value={reporterPhone} onChange={(e) => setReporterPhone(e.target.value)} className="sm:col-span-2" />
          </div>
        )}

        <Select label="School" value={schoolId} onChange={(e) => setSchoolId(e.target.value)} error={errors.schoolId} required>
          <option value="">Select the school this concerns…</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>{s.name} — {s.district}</option>
          ))}
        </Select>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value as IncidentCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
          <Select label="Who is this about?" value={subjectType} onChange={(e) => setSubjectType(e.target.value as IncidentSubjectType)}>
            {SUBJECT_TYPES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </div>

        <Input label="Their name (optional)" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />

        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} required />
        <Textarea
          label="What happened?"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
          hint="Include what happened, when, and who was involved, as best you can."
          required
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
          <Input label="Date it happened (optional)" type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
        </div>

        <Checkbox
          label="Someone is in immediate danger right now"
          description="If this is an emergency, also contact local emergency services immediately — this form alone will not summon help in real time."
          checked={immediateDanger}
          onChange={(e) => setImmediateDanger(e.target.checked)}
        />

        <div>
          <label className="text-[13px] font-medium text-ink">Evidence (optional, up to {MAX_EVIDENCE_FILES} files)</label>
          <label className="mt-1.5 flex items-center gap-2.5 rounded-(--radius-ctl) border border-dashed border-line-strong bg-paper px-3 h-10 cursor-pointer text-[13px] text-muted hover:border-primary hover:text-ink transition-colors">
            <Upload className="size-4 shrink-0" aria-hidden />
            {files.length ? `${files.length} file(s) selected` : "Choose photos or documents"}
            <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={onFilesChange} />
          </label>
        </div>

        {submitError && (
          <p className="flex items-start gap-2 text-[13px] text-clay-deep">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden /> {submitError}
          </p>
        )}

        <Button type="submit" size="lg" loading={loading} className="w-full">
          Submit report
        </Button>
      </form>

      <p className="text-[13.5px] text-muted mt-6">
        Already reported?{" "}
        <Link to="/report-incident/track" className="font-medium text-primary-deep hover:underline">
          Track your report
        </Link>
      </p>
    </PublicPageLayout>
  );
}
