import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ReceiptText, SearchCheck, ShieldX } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { UnderDevelopment } from "@/components/ui/UnderDevelopment";
import { paymentService } from "@/services/paymentService";
import { formatDateTime, formatRWF } from "@/lib/format";
import { CHANNEL_LABEL, FEE_CATEGORY_LABEL } from "@/lib/status";
import { USE_MOCKS } from "@/lib/api/client";
import type { Receipt } from "@/types";

/**
 * Public anti-fraud tool: anyone holding a paper/PDF receipt can confirm it was
 * really issued by a school on E-SHURI by entering its reference code.
 *
 * The real E-SHURI backend has no public lookup-by-reference-code endpoint — its receipt
 * routes (`GET /parents/payments/:id/receipt`, `GET /schools/:id/accounting/payments/:id/receipt`)
 * are authenticated file downloads for the parent or school that made the payment, not a public
 * verification API. In live mode this page is honest about that instead of faking a lookup.
 */
export default function VerifyReceiptPage() {
  return USE_MOCKS ? <MockVerifyReceipt /> : <LiveVerifyReceiptGap />;
}

function LiveVerifyReceiptGap() {
  return (
    <AuthLayout>
      <h1 className="font-display text-[26px] font-bold text-ink">Verify a receipt</h1>
      <p className="text-muted text-[14px] mt-1 mb-7">
        Enter the reference code printed on any E-SHURI receipt to confirm it's genuine.
      </p>
      <UnderDevelopment
        title="Public receipt verification"
        description="Looking up a receipt by its reference code without signing in isn't available yet. Sign in as the parent or school that made the payment to view it from your Payments/Receipts page instead."
        action={
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-(--radius-ctl) bg-primary px-3.5 h-9 text-[13.5px] font-medium text-white hover:bg-primary-deep transition-colors"
          >
            Sign in
          </Link>
        }
      />
      <p className="text-[13.5px] text-muted mt-8">
        <Link to="/login" className="font-medium text-primary-deep hover:underline">← Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}

function MockVerifyReceipt() {
  const [reference, setReference] = useState("");
  const [result, setResult] = useState<Receipt | null | "none">("none");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const receipt = await paymentService.verifyReceipt(reference);
    setResult(receipt);
    setLoading(false);
  };

  return (
    <AuthLayout>
      <h1 className="font-display text-[26px] font-bold text-ink">Verify a receipt</h1>
      <p className="text-muted text-[14px] mt-1 mb-7">
        Enter the reference code printed on any E-SHURI receipt (e.g. <span className="tnum font-medium">RDP-260001</span>)
        to confirm it's genuine.
      </p>

      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          placeholder="RDP-XXXXXX"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          icon={<ReceiptText />}
          className="flex-1"
          aria-label="Receipt reference"
          required
        />
        <Button type="submit" loading={loading} icon={<SearchCheck className="size-4" />}>
          Verify
        </Button>
      </form>

      {result !== "none" && (
        <div className="mt-6">
          {result ? (
            <div className="rounded-(--radius-card) border border-primary/40 bg-primary-soft/50 p-5">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-primary-deep uppercase tracking-wide">
                <SearchCheck className="size-4" /> Genuine receipt
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13.5px]">
                <div><dt className="text-muted">Reference</dt><dd className="font-semibold text-ink tnum">{result.reference}</dd></div>
                <div><dt className="text-muted">Amount</dt><dd className="font-semibold text-ink tnum">{formatRWF(result.amount)}</dd></div>
                <div><dt className="text-muted">School</dt><dd className="font-medium text-ink">{result.schoolName}</dd></div>
                <div><dt className="text-muted">Student</dt><dd className="font-medium text-ink">{result.studentName}</dd></div>
                <div><dt className="text-muted">Category</dt><dd className="font-medium text-ink">{FEE_CATEGORY_LABEL[result.category]}</dd></div>
                <div><dt className="text-muted">Paid via</dt><dd className="font-medium text-ink">{CHANNEL_LABEL[result.channelType]}</dd></div>
                <div className="col-span-2"><dt className="text-muted">Issued</dt><dd className="font-medium text-ink">{formatDateTime(result.issuedAt)} · {result.termLabel}</dd></div>
              </dl>
            </div>
          ) : (
            <div className="rounded-(--radius-card) border border-clay/40 bg-clay-soft/60 p-5">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-clay-deep uppercase tracking-wide">
                <ShieldX className="size-4" /> No matching receipt
              </p>
              <p className="text-[13.5px] text-ink mt-2">
                Nothing was issued with reference <span className="font-semibold tnum">{reference}</span>. Double-check
                the code — if it still doesn't match, treat the document as suspicious and contact the school.
              </p>
            </div>
          )}
        </div>
      )}

      <p className="text-[13.5px] text-muted mt-8">
        <Link to="/login" className="font-medium text-primary-deep hover:underline">← Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
