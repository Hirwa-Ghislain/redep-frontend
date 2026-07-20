import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Briefcase, UsersRound } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/stores/authStore";
import { PORTAL_HOME } from "@/config/roles";
import type { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();
  const [role, setRole] = useState<"PARENT" | "APPLICANT">("PARENT");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });
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
    if (form.password.length < 8) next.password = "At least 8 characters";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await register({ ...form, role });
      navigate(PORTAL_HOME[role], { replace: true });
    } catch (err) {
      const apiErr = err as ApiError;
      setErrors(apiErr.fieldErrors ?? { email: apiErr.message });
    } finally {
      setLoading(false);
    }
  };

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
        <Input label="Phone" type="tel" placeholder="+250 7xx xxx xxx" value={form.phone} onChange={set("phone")} />
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
