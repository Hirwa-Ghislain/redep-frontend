import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Mail } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authService } from "@/services/authService";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await authService.forgotPassword(email);
    setLoading(false);
    setSent(true);
  };

  return (
    <AuthLayout>
      {sent ? (
        <div className="text-center py-8">
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary-deep mb-4">
            <CheckCircle2 className="size-7" />
          </span>
          <h1 className="font-display text-[22px] font-bold text-ink">Check your inbox</h1>
          <p className="text-muted text-[14px] mt-2 max-w-sm mx-auto">
            If an account exists for <span className="font-medium text-ink">{email}</span>, we've sent a
            link to reset your password.
          </p>
          <Link to="/login" className="inline-block mt-6 text-[14px] font-medium text-primary-deep hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <h1 className="font-display text-[26px] font-bold text-ink">Reset your password</h1>
          <p className="text-muted text-[14px] mt-1 mb-7">
            Enter your account email and we'll send you a reset link.
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
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
              Send reset link
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
