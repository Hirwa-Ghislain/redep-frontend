import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authService } from "@/services/authService";
import { toast } from "@/stores/uiStore";
import type { ApiError } from "@/lib/api/client";
import { passwordIssue } from "@/lib/validation";

type Step = "REQUEST" | "SENT" | "RESET";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("REQUEST");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onRequest = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await authService.forgotPassword(email);
    setLoading(false);
    setStep("SENT");
  };

  const onReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code sent to your email.");
      return;
    }
    const pwIssue = passwordIssue(password);
    if (pwIssue) {
      setError(pwIssue);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword({ email: email.trim().toLowerCase(), otp, password, confirmPassword });
      toast({ title: "Password reset", description: "Sign in with your new password.", variant: "success" });
      navigate("/login", { replace: true });
    } catch (err) {
      setError((err as ApiError).message ?? "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "RESET") {
    return (
      <AuthLayout>
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-deep mb-4">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <h1 className="font-display text-[26px] font-bold text-ink">Set a new password</h1>
        <p className="text-muted text-[14px] mt-1 mb-6">
          Enter the 6-digit code we sent to <span className="font-medium text-ink">{email}</span> along with your
          new password.
        </p>
        <form onSubmit={onReset} className="space-y-4" noValidate>
          <Input
            label="Verification code"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            required
          />
          <Input
            label="New password"
            type="password"
            showPasswordToggle
            autoComplete="new-password"
            icon={<KeyRound />}
            hint="At least 10 characters, with upper & lower case, a number, and a special character."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error ?? undefined}
            required
          />
          <Input
            label="Confirm new password"
            type="password"
            showPasswordToggle
            autoComplete="new-password"
            icon={<KeyRound />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Button type="submit" size="lg" loading={loading} className="w-full">
            Reset password
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setStep("SENT")}
          className="text-[13.5px] text-muted mt-6 hover:underline"
        >
          Back
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {step === "SENT" ? (
        <div className="text-center py-8">
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary-deep mb-4">
            <CheckCircle2 className="size-7" />
          </span>
          <h1 className="font-display text-[22px] font-bold text-ink">Check your inbox</h1>
          <p className="text-muted text-[14px] mt-2 max-w-sm mx-auto">
            If an account exists for <span className="font-medium text-ink">{email}</span>, we've sent a 6-digit
            code to reset your password.
          </p>
          <Button className="mt-6" onClick={() => setStep("RESET")}>
            I have the code
          </Button>
          <p className="text-[13.5px] text-muted mt-4">
            <Link to="/login" className="font-medium text-primary-deep hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      ) : (
        <>
          <h1 className="font-display text-[26px] font-bold text-ink">Reset your password</h1>
          <p className="text-muted text-[14px] mt-1 mb-7">
            Enter your account email and we'll send you a 6-digit code to reset it.
          </p>
          <form onSubmit={onRequest} className="space-y-4">
            <Input
              label="Email"
              type="email"
              icon={<Mail />}
              placeholder="you@example.rw"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" size="lg" loading={loading} className="w-full">
              Send reset code
            </Button>
          </form>
          <p className="text-[13.5px] text-muted mt-6">
            Remembered it?{" "}
            <Link to="/login" className="font-medium text-primary-deep hover:underline">
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
