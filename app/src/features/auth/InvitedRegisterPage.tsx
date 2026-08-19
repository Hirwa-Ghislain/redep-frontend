import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Mail } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PORTAL_HOME, primaryRole } from "@/config/roles";
import type { ApiError } from "@/lib/api/client";
import { RWANDA_PHONE, isAdult, passwordIssue } from "@/lib/validation";
import { useAuthStore } from "@/stores/authStore";
import { useI18nStore } from "@/stores/i18nStore";

interface InvitationClaims {
  email: string;
  role: "TEACHER" | "ACCOUNTANT";
}

const steps = [
  { title: "Profile", description: "Your contact details" },
  { title: "Identity", description: "National ID verification" },
  { title: "Security", description: "Protect your account" },
] as const;

function readInvitationClaims(token: string): InvitationClaims | null {
  try {
    const encoded = token.split(".")[1];
    if (!encoded) return null;
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(decodeURIComponent(Array.from(atob(normalized), (character) =>
      `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""))) as Record<string, unknown>;
    if (typeof payload.email !== "string" || (payload.role !== "TEACHER" && payload.role !== "ACCOUNTANT")) return null;
    return { email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

export default function InvitedRegisterPage() {
  const [params] = useSearchParams();
  const token = params.get("token")?.trim() ?? "";
  const invitation = readInvitationClaims(token);
  const registerInvited = useAuthStore((state) => state.registerInvited);
  const preferredLanguage = useI18nStore((state) => state.language);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: invitation?.email ?? "", phone: "", nationalId: "",
    dateOfBirth: "", password: "", confirmPassword: "",
  });

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      delete next.form;
      return next;
    });
  };

  const validateStep = (targetStep: number) => {
    const next: Record<string, string> = {};
    if (targetStep === 0) {
      if (!token) next.token = "This invitation link is incomplete. Ask the school to send a new invitation.";
      if (form.firstName.trim().length < 2) next.firstName = "Enter your first name";
      if (form.lastName.trim().length < 2) next.lastName = "Enter your last name";
      if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter the email address that received this invitation";
      if (!RWANDA_PHONE.test(form.phone.replace(/\s/g, ""))) next.phone = "Enter a valid Rwanda phone number";
    }
    if (targetStep === 1) {
      if (!/^\d{16}$/.test(form.nationalId)) next.nationalId = "Enter your 16-digit National ID";
      if (!form.dateOfBirth) next.dateOfBirth = "Required";
      else if (!isAdult(form.dateOfBirth)) next.dateOfBirth = "Must be at least 18 years old";
    }
    if (targetStep === 2) {
      const issue = passwordIssue(form.password);
      if (issue) next.password = issue;
      if (form.confirmPassword !== form.password) next.confirmPassword = "Passwords do not match";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const continueToNextStep = () => {
    if (validateStep(step)) setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (step < steps.length - 1) {
      continueToNextStep();
      return;
    }
    if (!validateStep(step)) return;

    setLoading(true);
    try {
      const user = await registerInvited({ ...form, token, preferredLanguage });
      navigate(PORTAL_HOME[primaryRole(user.roles)], { replace: true });
    } catch (error) {
      const apiError = error as ApiError;
      setErrors(apiError.fieldErrors ?? { form: apiError.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-deep mb-4">
        <BadgeCheck className="size-5" aria-hidden />
      </span>
      <h1 className="font-display text-[26px] font-bold text-ink">Join your school team</h1>
      <p className="text-muted text-[14px] mt-1 mb-5">
        Complete your verified staff profile. Your school and role are securely attached to this invitation.
      </p>

      {invitation && (
        <div className="mb-4 flex items-center justify-between rounded-(--radius-card) border border-primary/20 bg-primary-soft/60 px-4 py-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary-deep">Assigned role</p>
            <p className="text-[13.5px] font-semibold text-ink">{invitation.role === "TEACHER" ? "Teacher" : "Accountant"}</p>
          </div>
          <BadgeCheck className="size-5 text-primary-deep" aria-hidden />
        </div>
      )}

      {!token && (
        <div className="mb-4 rounded-(--radius-card) border border-clay/30 bg-clay-soft px-4 py-3 text-[13px] text-clay-deep">
          {errors.token ?? "This invitation link has no token. Ask the school administrator to send a new one."}
        </div>
      )}
      {errors.form && <p className="mb-4 text-[13px] text-clay-deep">{errors.form}</p>}

      <ol className="mb-5 grid grid-cols-3" aria-label="Registration progress">
        {steps.map((item, index) => (
          <li key={item.title} className="relative flex flex-col items-center text-center">
            {index > 0 && <span className={`absolute right-1/2 top-4 h-px w-full ${index <= step ? "bg-primary" : "bg-line-strong"}`} />}
            <span className={`relative z-10 flex size-8 items-center justify-center rounded-full border text-[12px] font-bold transition-colors ${
              index < step ? "border-primary bg-primary text-white" : index === step ? "border-primary bg-primary-soft text-primary-deep" : "border-line-strong bg-surface text-faint"
            }`}>
              {index < step ? <Check className="size-4" aria-hidden /> : index + 1}
            </span>
            <span className={`mt-1.5 text-[11.5px] font-semibold ${index <= step ? "text-ink" : "text-faint"}`}>{item.title}</span>
          </li>
        ))}
      </ol>

      <div className="mb-4">
        <p className="font-display text-[16px] font-semibold text-ink">{steps[step].title}</p>
        <p className="text-[12.5px] text-muted">{steps[step].description}</p>
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        {step === 0 && <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="First name" autoComplete="given-name" value={form.firstName} onChange={set("firstName")} error={errors.firstName} required />
            <Input label="Last name" autoComplete="family-name" value={form.lastName} onChange={set("lastName")} error={errors.lastName} required />
          </div>
          <Input label="Invited email" type="email" icon={<Mail className="size-4" />} value={form.email} onChange={set("email")} readOnly={Boolean(invitation)} error={errors.email} hint={invitation ? "Filled from the secure invitation and cannot be changed." : "It must exactly match the address where the school sent the invitation."} required />
          <Input label="Phone" type="tel" autoComplete="tel" placeholder="07XXXXXXXX" value={form.phone} onChange={set("phone")} error={errors.phone} required />
        </>}
        {step === 1 && <>
          <Input label="National ID" inputMode="numeric" maxLength={16} value={form.nationalId} onChange={set("nationalId")} error={errors.nationalId} hint="We verify that this identity matches the names on your invitation." required />
          <Input label="Date of birth" type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} error={errors.dateOfBirth} hint="Invited staff must be at least 18 years old." required />
        </>}
        {step === 2 && <>
          <Input label="Password" type="password" showPasswordToggle autoComplete="new-password" value={form.password} onChange={set("password")} error={errors.password} hint="10+ characters with upper/lower case, number and special character." required />
          <Input label="Confirm password" type="password" showPasswordToggle autoComplete="new-password" value={form.confirmPassword} onChange={set("confirmPassword")} error={errors.confirmPassword} required />
        </>}
        <div className="flex gap-3 pt-1">
          {step > 0 && <Button type="button" size="lg" variant="secondary" icon={<ArrowLeft className="size-4" />} onClick={() => { setErrors({}); setStep((current) => current - 1); }}>Back</Button>}
          <Button type="submit" size="lg" loading={loading} disabled={!token} iconRight={<ArrowRight className="size-4" />} className="flex-1">
            {step === steps.length - 1 ? "Create staff account" : "Continue"}
          </Button>
        </div>
      </form>
      <p className="text-[13.5px] text-muted mt-6">Already registered? <Link to="/login" className="font-medium text-primary-deep hover:underline">Sign in</Link></p>
    </AuthLayout>
  );
}
