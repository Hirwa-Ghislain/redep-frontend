import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, KeyRound, Mail } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/stores/authStore";
import { primaryRole, PORTAL_HOME } from "@/config/roles";
import type { ApiError } from "@/lib/api/client";

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      <p className="text-muted text-[14px] mt-1 mb-7">Sign in to your E-SHURI account.</p>

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
          showPasswordToggle
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
        New to E-SHURI?{" "}
        <Link to="/register" className="font-medium text-primary-deep hover:underline">
          Create an account
        </Link>
        {" · "}
        <Link to="/school-onboarding" className="font-medium text-primary-deep hover:underline">
          Register a school
        </Link>
      </p>
    </AuthLayout>
  );
}
