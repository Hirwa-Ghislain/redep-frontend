import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, CheckCircle2, LogIn, ShieldAlert, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { authService } from "@/services/authService";
import { schoolService, type NesaLocationOption } from "@/services/schoolService";
import { useAuth } from "@/hooks/useAuth";
import { USE_MOCKS } from "@/lib/api/client";
import { PORTAL_HOME } from "@/config/roles";
import type { ApiError } from "@/lib/api/client";
import type { SchoolType } from "@/types";

const ASIDE = (
  <>
    <p className="font-display text-[19px] leading-snug font-bold text-white">
      Bring your school onto <span className="text-gold">E-SHURI.</span>
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
  </>
);

export default function SchoolOnboardingPage() {
  return USE_MOCKS ? <MockOnboardingRequest /> : <LiveSchoolCreation />;
}

/** Unchanged mock-mode flow: a public "request onboarding" form the E-SHURI team reviews. */
function MockOnboardingRequest() {
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
          {ASIDE}
          <div className="mt-6 rounded-xl bg-white/[0.07] border border-white/10 px-3.5 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gold">Verification</p>
            <p className="mt-1 text-[12px] leading-relaxed text-white/60">
              The E-SHURI team reviews your documents and activates your school —
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
            The E-SHURI team will verify your school's documents and contact{" "}
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

interface AchievementDraft {
  title: string;
  description: string;
}

/**
 * Live mode. There's no "request → E-SHURI reviews → activates" queue in the real backend —
 * a SCHOOL_ADMIN creates their (already NESA-accredited) school directly via `POST /schools`
 * and it goes live immediately, matched against the national NESA registry by exact name +
 * province/district/sector/cell/village.
 *
 * Self-serve registration in this app only offers Parent / Job applicant accounts (see
 * RegisterPage) even though the backend's own `role` enum technically allows `SCHOOL_ADMIN` —
 * so a school administrator account has to already exist. This page is for an already
 * authenticated SCHOOL_ADMIN to complete their school's real profile.
 */
function LiveSchoolCreation() {
  const { role, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <AuthLayout aside={ASIDE}>
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary-deep mb-4">
          <LogIn className="size-7" />
        </span>
        <h1 className="font-display text-[22px] font-bold text-ink">Sign in as a school administrator</h1>
        <p className="text-muted text-[14px] mt-2 max-w-sm">
          Creating a school on E-SHURI requires an existing School Administrator account. Self-serve
          registration on this site currently covers parents and job applicants only — school
          administrator accounts are provisioned separately by the E-SHURI team. If you already have
          one, sign in below to complete your school's profile.
        </p>
        <Link to="/login" className="inline-block mt-6 text-[14px] font-medium text-primary-deep hover:underline">
          Sign in →
        </Link>
      </AuthLayout>
    );
  }

  if (role !== "SCHOOL_ADMIN") {
    return (
      <AuthLayout aside={ASIDE}>
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-clay-soft/60 text-clay-deep mb-4">
          <ShieldAlert className="size-7" />
        </span>
        <h1 className="font-display text-[22px] font-bold text-ink">School administrator account required</h1>
        <p className="text-muted text-[14px] mt-2 max-w-sm">
          Your account isn't a School Administrator, so it can't create a school. Contact the E-SHURI
          team to have a school administrator account provisioned.
        </p>
        <Link to="/login" className="inline-block mt-6 text-[14px] font-medium text-primary-deep hover:underline">
          ← Back to sign in
        </Link>
      </AuthLayout>
    );
  }

  return <CreateSchoolForm onCreated={() => navigate(PORTAL_HOME.SCHOOL_ADMIN, { replace: true })} />;
}

function CreateSchoolForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [provinceCode, setProvinceCode] = useState("");
  const [districtCode, setDistrictCode] = useState("");
  const [sectorCode, setSectorCode] = useState("");
  const [cellCode, setCellCode] = useState("");
  const [villageCode, setVillageCode] = useState("");
  const [description, setDescription] = useState("");
  const [tuitionAmount, setTuitionAmount] = useState("");
  const [applicationFee, setApplicationFee] = useState("");
  const [achievements, setAchievements] = useState<AchievementDraft[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [achievementProofs, setAchievementProofs] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: provinces = [] } = useQuery({ queryKey: ["nesa-provinces"], queryFn: () => schoolService.nesaProvinces() });
  const { data: districts = [] } = useQuery({
    queryKey: ["nesa-children", provinceCode],
    queryFn: () => schoolService.nesaLocationChildren(provinceCode),
    enabled: Boolean(provinceCode),
  });
  const { data: sectors = [] } = useQuery({
    queryKey: ["nesa-children", districtCode],
    queryFn: () => schoolService.nesaLocationChildren(districtCode),
    enabled: Boolean(districtCode),
  });
  const { data: cells = [] } = useQuery({
    queryKey: ["nesa-children", sectorCode],
    queryFn: () => schoolService.nesaLocationChildren(sectorCode),
    enabled: Boolean(sectorCode),
  });
  const { data: villages = [] } = useQuery({
    queryKey: ["nesa-children", cellCode],
    queryFn: () => schoolService.nesaLocationChildren(cellCode),
    enabled: Boolean(cellCode),
  });

  const nameFor = (options: NesaLocationOption[], code: string) => options.find((o) => o.locationCode === code)?.locationName;

  const addAchievement = () => setAchievements((a) => [...a, { title: "", description: "" }]);
  const updateAchievement = (i: number, patch: Partial<AchievementDraft>) =>
    setAchievements((a) => a.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  const removeAchievement = (i: number) => setAchievements((a) => a.filter((_, idx) => idx !== i));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!provinceCode || !districtCode || !sectorCode || !cellCode || !villageCode) {
      setError("Select the full province → village location, matching your school's NESA registration exactly.");
      return;
    }
    if (images.length === 0) {
      setError("Upload at least one school photo.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("provinceCode", provinceCode);
      formData.set("districtCode", districtCode);
      formData.set("sectorCode", sectorCode);
      formData.set("cellCode", cellCode);
      formData.set("villageCode", villageCode);
      if (description.trim()) formData.set("description", description.trim());
      formData.set("tuitionAmount", tuitionAmount);
      formData.set("applicationFee", applicationFee);
      formData.set(
        "achievements",
        JSON.stringify(achievements.filter((a) => a.title.trim()).map((a) => ({ title: a.title, description: a.description || undefined }))),
      );
      for (const file of images) formData.append("images", file);
      for (const file of achievementProofs) formData.append("achievementProofs", file);

      await schoolService.createSchool(formData);
      onCreated();
    } catch (err) {
      setError((err as ApiError).message ?? "Couldn't create the school. Check the details match NESA's records exactly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout aside={ASIDE}>
      <h1 className="font-display text-[26px] font-bold text-ink">Complete your school's profile</h1>
      <p className="text-muted text-[14px] mt-1 mb-6">
        This creates your school on E-SHURI immediately — it's matched against the national NESA
        accreditation registry, so the name and location below must match your school's official
        NESA record exactly. Your school's official email and phone are pulled from that record
        automatically.
      </p>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input label="School name (exactly as NESA-registered)" value={name} onChange={(e) => setName(e.target.value)} required />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Province"
            value={provinceCode}
            onChange={(e) => {
              setProvinceCode(e.target.value);
              setDistrictCode(""); setSectorCode(""); setCellCode(""); setVillageCode("");
            }}
            required
          >
            <option value="" disabled>Select…</option>
            {provinces.map((p) => (
              <option key={p.locationCode} value={p.locationCode}>{p.locationName}</option>
            ))}
          </Select>
          <Select
            label="District"
            value={districtCode}
            onChange={(e) => { setDistrictCode(e.target.value); setSectorCode(""); setCellCode(""); setVillageCode(""); }}
            disabled={!provinceCode}
            required
          >
            <option value="" disabled>{provinceCode ? "Select…" : nameFor(provinces, provinceCode) ?? "Select a province first"}</option>
            {districts.map((d) => (
              <option key={d.locationCode} value={d.locationCode}>{d.locationName}</option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Select
            label="Sector"
            value={sectorCode}
            onChange={(e) => { setSectorCode(e.target.value); setCellCode(""); setVillageCode(""); }}
            disabled={!districtCode}
            required
          >
            <option value="" disabled>Select…</option>
            {sectors.map((s) => (
              <option key={s.locationCode} value={s.locationCode}>{s.locationName}</option>
            ))}
          </Select>
          <Select
            label="Cell"
            value={cellCode}
            onChange={(e) => { setCellCode(e.target.value); setVillageCode(""); }}
            disabled={!sectorCode}
            required
          >
            <option value="" disabled>Select…</option>
            {cells.map((c) => (
              <option key={c.locationCode} value={c.locationCode}>{c.locationName}</option>
            ))}
          </Select>
          <Select label="Village" value={villageCode} onChange={(e) => setVillageCode(e.target.value)} disabled={!cellCode} required>
            <option value="" disabled>Select…</option>
            {villages.map((v) => (
              <option key={v.locationCode} value={v.locationCode}>{v.locationName}</option>
            ))}
          </Select>
        </div>

        <Textarea label="Description" placeholder="Levels offered, capacity, facilities…" value={description} onChange={(e) => setDescription(e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Tuition amount (RWF)" type="number" min={0} value={tuitionAmount} onChange={(e) => setTuitionAmount(e.target.value)} required />
          <Input label="Application fee (RWF)" type="number" min={0} value={applicationFee} onChange={(e) => setApplicationFee(e.target.value)} required />
        </div>

        <div className="space-y-1.5">
          <span className="text-[13px] font-medium text-ink">School photos</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImages(e.target.files ? Array.from(e.target.files) : [])}
            className="block w-full text-[13px] text-muted file:mr-3 file:rounded-(--radius-ctl) file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium file:text-primary-deep"
          />
          <p className="text-[12px] text-muted">At least one photo is required.</p>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink">Achievements (optional)</span>
            <Button type="button" variant="secondary" size="sm" onClick={addAchievement}>Add achievement</Button>
          </div>
          {achievements.map((a, i) => (
            <div key={i} className="flex gap-2 items-start rounded-(--radius-card) border border-line p-3">
              <div className="flex-1 space-y-2">
                <Input label="Title" value={a.title} onChange={(e) => updateAchievement(i, { title: e.target.value })} />
                <Textarea label="Description" value={a.description} onChange={(e) => updateAchievement(i, { description: e.target.value })} />
              </div>
              <button type="button" onClick={() => removeAchievement(i)} aria-label="Remove achievement" className="p-1.5 text-faint hover:text-clay">
                <X className="size-4" />
              </button>
            </div>
          ))}
          {achievements.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[13px] font-medium text-ink">Achievement proof files (optional, same order as above)</span>
              <input
                type="file"
                multiple
                onChange={(e) => setAchievementProofs(e.target.files ? Array.from(e.target.files) : [])}
                className="block w-full text-[13px] text-muted file:mr-3 file:rounded-(--radius-ctl) file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium file:text-primary-deep"
              />
            </div>
          )}
        </div>

        {error && <p className="text-[13px] font-medium text-clay-deep">{error}</p>}

        <Button type="submit" size="lg" loading={loading} className="w-full">
          Create school
        </Button>
      </form>
    </AuthLayout>
  );
}
