import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Building2, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { authService } from "@/services/authService";
import { schoolService } from "@/services/schoolService";
import type { SchoolType } from "@/types";

export default function SchoolOnboardingPage() {
  const { data: districts = [] } = useQuery({ queryKey: ["districts"], queryFn: () => schoolService.districts() });
  const [form, setForm] = useState({
    schoolName: "", type: "PRIVATE" as SchoolType, district: "", sector: "",
    contactName: "", contactEmail: "", contactPhone: "", message: "",
  });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await authService.requestSchoolOnboarding(form);
    setLoading(false);
    setDone(true);
  };

  return (
    <AuthLayout
      aside={
        <>
          <p className="font-display text-[19px] leading-snug font-bold text-white">
            Bring your school onto <span className="text-gold">REDEP.</span>
          </p>
          <ul className="mt-5 space-y-3 text-[13px] leading-relaxed text-white/70">
            {[
              "A public profile parents can discover and compare",
              "Digital admissions with document review",
              "Fees, MoMo/bank payments and automatic receipts",
              "Announcements, messaging and a recruitment portal",
            ].map((line) => (
              <li key={line} className="flex gap-2.5">
                <CheckCircle2 className="size-4 text-gold shrink-0 mt-0.5" />
                {line}
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl bg-white/[0.07] border border-white/10 px-3.5 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gold">Verification</p>
            <p className="mt-1 text-[12px] leading-relaxed text-white/60">
              The REDEP team reviews your documents and activates your school —
              usually within 3 working days.
            </p>
          </div>
        </>
      }
    >
      {done ? (
        <div className="text-center py-8">
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary-deep mb-4">
            <Building2 className="size-7" />
          </span>
          <h1 className="font-display text-[22px] font-bold text-ink">Request received</h1>
          <p className="text-muted text-[14px] mt-2 max-w-sm mx-auto">
            The REDEP team will verify your school's documents and contact{" "}
            <span className="font-medium text-ink">{form.contactEmail}</span> with the next steps —
            usually within 3 working days.
          </p>
          <Link to="/login" className="inline-block mt-6 text-[14px] font-medium text-primary-deep hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <h1 className="font-display text-[26px] font-bold text-ink">Register your school</h1>
          <p className="text-muted text-[14px] mt-1 mb-6">
            Tell us about your school. After verification, you'll receive a school administrator account.
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input label="School name" value={form.schoolName} onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))} required />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as SchoolType }))}>
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Private</option>
                <option value="GOVERNMENT_AIDED">Government-aided</option>
              </Select>
              <Select label="District" value={form.district} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))} required>
                <option value="" disabled>Select…</option>
                {districts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
            </div>
            <Input label="Sector" value={form.sector} onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))} required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Contact person" value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} required />
              <Input label="Contact phone" type="tel" value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} required />
            </div>
            <Input label="Contact email" type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} required />
            <Textarea
              label="Anything we should know?"
              placeholder="Levels offered, capacity, opening date…"
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            />
            <Button type="submit" size="lg" loading={loading} className="w-full">
              Submit request
            </Button>
          </form>
          <p className="text-[13.5px] text-muted mt-6">
            Already onboarded?{" "}
            <Link to="/login" className="font-medium text-primary-deep hover:underline">Sign in</Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
