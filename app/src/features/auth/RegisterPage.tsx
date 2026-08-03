import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Briefcase, ShieldCheck, UsersRound } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/stores/authStore";
import { PORTAL_HOME } from "@/config/roles";
import type { ApiError } from "@/lib/api/client";
import { USE_MOCKS } from "@/lib/api/client";
import type { PendingVerification } from "@/services/authService";
import { cn } from "@/lib/utils";

type Step = "DETAILS" | "VERIFY";

export default function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const verifyAccount = useAuthStore((s) => s.verifyAccount);
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("DETAILS");
  const [role, setRole] = useState<"PARENT" | "APPLICANT">("PARENT");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    nationalId: "",
    dateOfBirth: "",
  });
  const [pending, setPending] = useState<PendingVerification | null>(null);
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = "Required";
    if (!form.lastName.trim()) next.lastName = "Required";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email";
    if (!/^\+?\d{9,15}$/.test(form.phone.replace(/\s/g, ""))) next.phone = "Enter a valid phone number";
    if (form.password.length < 8) next.password = "At least 8 characters";
    if (!USE_MOCKS) {
      if (!/^\d{16}$/.test(form.nationalId)) next.nationalId = "Enter your 16-digit National ID";
      if (!form.dateOfBirth) next.dateOfBirth = "Required";
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const result = await register({ ...form, role });
      if ("email" in result && !("id" in result)) {
        // Backend requires OTP verification before the account is usable.
        setPending(result);
        setStep("VERIFY");
      } else {
        navigate(PORTAL_HOME[role], { replace: true });
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setErrors(apiErr.fieldErrors ?? { email: apiErr.message });
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!pending) return;
    if (!/^\d{6}$/.test(otp)) {
      setErrors({ otp: "Enter the 6-digit code" });
      return;
    }
    setLoading(true);
    try {
      await verifyAccount({ verificationMethod: "EMAIL", identifier: pending.email, otp });
      navigate(PORTAL_HOME[role], { replace: true });
    } catch (err) {
      const apiErr = err as ApiError;
      setErrors({ otp: apiErr.message });
    } finally {
      setLoading(false);
    }
  };

  if (step === "VERIFY" && pending) {
    return (
      <AuthLayout>
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-deep mb-4">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <h1 className="font-display text-[26px] font-bold text-ink">Verify your account</h1>
        <p className="text-muted text-[14px] mt-1 mb-6">
          We sent a 6-digit code to {pending.email} and {pending.phone}. Enter it below to continue.
        </p>
        <form onSubmit={onVerify} className="space-y-4" noValidate>
          <Input
            label="Verification code"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            error={errors.otp}
            required
          />
          <Button type="submit" size="lg" loading={loading} iconRight={<ArrowRight className="size-4" />} className="w-full">
            Verify & continue
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setStep("DETAILS")}
          className="text-[13.5px] text-muted mt-6 hover:underline"
        >
          Back to registration
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-[26px] font-bold text-ink">Create your account</h1>
      <p className="text-muted text-[14px] mt-1 mb-6">
        Parents manage children and fees; applicants apply for school jobs.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-6" role="radiogroup" aria-label="Account type">
        {(
          [
            { value: "PARENT", label: "Parent / Guardian", icon: UsersRound, blurb: "Register & follow your children" },
            { value: "APPLICANT", label: "Job applicant", icon: Briefcase, blurb: "Find work in schools" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={role === opt.value}
            onClick={() => setRole(opt.value)}
            className={cn(
              "rounded-(--radius-card) border p-3.5 text-left transition-all duration-150",
              role === opt.value
                ? "border-primary bg-primary-soft/60 ring-2 ring-primary/15"
                : "border-line bg-surface hover:border-line-strong",
            )}
          >
            <opt.icon className={cn("size-5 mb-2", role === opt.value ? "text-primary-deep" : "text-muted")} />
            <p className="text-[13.5px] font-semibold text-ink">{opt.label}</p>
            <p className="text-[12px] text-muted mt-0.5">{opt.blurb}</p>
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name" value={form.firstName} onChange={set("firstName")} error={errors.firstName} required />
          <Input label="Last name" value={form.lastName} onChange={set("lastName")} error={errors.lastName} required />
        </div>
        <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} required />
        <Input
          label="Phone"
          type="tel"
          placeholder="+250 7xx xxx xxx"
          value={form.phone}
          onChange={set("phone")}
          error={errors.phone}
          required
        />
        {!USE_MOCKS && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="National ID"
              placeholder="16-digit NID"
              inputMode="numeric"
              maxLength={16}
              value={form.nationalId}
              onChange={set("nationalId")}
              error={errors.nationalId}
              hint="Verified against the national registry."
              required
            />
            <Input
              label="Date of birth"
              type="date"
              value={form.dateOfBirth}
              onChange={set("dateOfBirth")}
              error={errors.dateOfBirth}
              required
            />
          </div>
        )}
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          error={errors.password}
          hint="At least 8 characters."
          required
        />
        <Button type="submit" size="lg" loading={loading} iconRight={<ArrowRight className="size-4" />} className="w-full">
          Create account
        </Button>
      </form>

      <p className="text-[13.5px] text-muted mt-6">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-primary-deep hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
