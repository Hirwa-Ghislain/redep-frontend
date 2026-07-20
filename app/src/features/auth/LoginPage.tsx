import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, KeyRound, Mail } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/stores/authStore";
import { primaryRole, PORTAL_HOME } from "@/config/roles";
import type { ApiError } from "@/lib/api/client";

const DEMO_ACCOUNTS = [
  { email: "parent@demo.rw", label: "Parent", dot: "bg-primary" },
  { email: "school@demo.rw", label: "School admin", dot: "bg-gold" },
  { email: "accountant@demo.rw", label: "School staff · Accountant", dot: "bg-gold" },
  { email: "teacher@demo.rw", label: "Teacher", dot: "bg-sky" },
  { email: "applicant@demo.rw", label: "Job applicant", dot: "bg-clay" },
  { email: "ministry@demo.rw", label: "Education authority", dot: "bg-primary" },
  { email: "admin@demo.rw", label: "System admin", dot: "bg-ink" },
];

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Demo deep-link: /login?as=parent@demo.rw signs straight into that account.
  const autoAs = searchParams.get("as");
  useEffect(() => {
    if (autoAs && DEMO_ACCOUNTS.some((a) => a.email === autoAs)) {
      void doLogin(autoAs, "demo123!");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAs]);

  async function doLogin(emailToUse: string, passwordToUse: string) {
    setError(null);
    setLoading(true);
    try {
      const user = await login(emailToUse, passwordToUse);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? PORTAL_HOME[primaryRole(user.roles)], { replace: true });
    } catch (e) {
      setError((e as ApiError).message ?? "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void doLogin(email, password);
  };

  return (
    <AuthLayout>
      <h1 className="font-display text-[26px] font-bold text-ink">Welcome back</h1>
      <p className="text-muted text-[14px] mt-1 mb-7">Sign in to your REDEP account.</p>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.rw"
          icon={<Mail />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          icon={<KeyRound />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error ?? undefined}
          required
        />
        <div className="flex items-center justify-between">
          <Link to="/forgot-password" className="text-[13px] font-medium text-primary-deep hover:underline">
            Forgot password?
          </Link>
          <Link to="/verify-receipt" className="text-[13px] text-muted hover:text-ink transition-colors">
            Verify a receipt
          </Link>
        </div>
        <Button type="submit" size="lg" loading={loading} iconRight={<ArrowRight className="size-4" />} className="w-full">
          Sign in
        </Button>
      </form>

      <p className="text-[13.5px] text-muted mt-6">
        New to REDEP?{" "}
        <Link to="/register" className="font-medium text-primary-deep hover:underline">
          Create a parent or applicant account
        </Link>
        {" · "}
        <Link to="/school-onboarding" className="font-medium text-primary-deep hover:underline">
          Register a school
        </Link>
      </p>

      <div className="mt-7 border-t border-line pt-5">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted mb-2.5">
          Demo — explore each portal
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              disabled={loading}
              onClick={() => void doLogin(acc.email, "demo123!")}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-[12.5px] font-medium text-ink hover:border-primary hover:bg-primary-soft/50 hover:text-primary-deep transition-colors disabled:opacity-50"
            >
              <span className={`size-1.5 rounded-full ${acc.dot}`} aria-hidden />
              {acc.label}
            </button>
          ))}
        </div>
        <p className="text-[11.5px] text-faint mt-2.5">One click signs you in with sample data.</p>
      </div>
    </AuthLayout>
  );
}
