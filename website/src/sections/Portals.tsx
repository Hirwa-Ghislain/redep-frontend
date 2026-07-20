import { Briefcase, Building2, GraduationCap, Landmark, ShieldCheck, UsersRound } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const PORTALS = [
  {
    icon: UsersRound,
    tint: "bg-primary-soft text-primary-deep",
    name: "Parents & guardians",
    blurb: "Discover schools, compare fees and live seats, apply once, then manage every child — across different schools — from one account.",
    points: ["School discovery & comparison", "Digital admissions", "MoMo/bank fee payments", "Academic progress & teacher chat"],
  },
  {
    icon: Building2,
    tint: "bg-gold-soft text-gold-deep",
    name: "Schools",
    blurb: "A complete school office: admissions review, students & classes, fee collection with automatic receipts, and custom staff roles you define.",
    points: ["Admissions pipeline", "Seat & capacity control", "Accounting & exports", "Custom role permissions"],
  },
  {
    icon: GraduationCap,
    tint: "bg-sky-soft text-sky-deep",
    name: "Teachers",
    blurb: "Attendance in seconds, gradebooks that write report cards, and a direct — but professional — line to every parent.",
    points: ["Class rosters", "Attendance register", "Assessments & grades", "Parent messaging"],
  },
  {
    icon: Briefcase,
    tint: "bg-clay-soft text-clay-deep",
    name: "Job applicants",
    blurb: "A national job board for schools. Build a CV profile once and track every application through shortlist, interview and offer.",
    points: ["National vacancy board", "CV & profile builder", "Application tracking", "Stage notifications"],
  },
  {
    icon: Landmark,
    tint: "bg-primary-soft text-primary-deep",
    name: "Education authorities",
    blurb: "Live national statistics instead of quarterly paperwork: enrollment, capacity pressure, staffing gaps and transfer flows by district.",
    points: ["National dashboards", "Capacity monitoring", "Staffing analytics", "District & national reports"],
  },
  {
    icon: ShieldCheck,
    tint: "bg-gold-soft text-gold-deep",
    name: "Platform administration",
    blurb: "The trust layer — school verification and onboarding, user management, global roles and a full audit trail.",
    points: ["School verification", "Roles & permissions", "Audit log", "National broadcasts"],
  },
];

export function Portals() {
  return (
    <section id="portals" className="bg-ink py-24 dot-texture">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-gold">One system · six portals</p>
          <h2 className="mt-3 font-display text-[clamp(26px,4vw,38px)] font-bold text-paper max-w-2xl leading-tight tracking-tight">
            Everyone signs in at the same door. Their role decides what's behind it.
          </h2>
          <p className="mt-4 max-w-2xl text-[15.5px] text-paper/60">
            REDEP is one platform with role-based access — like the best SaaS products. A parent, a
            school accountant and a ministry analyst each get a portal shaped exactly to their job,
            with permissions enforced everywhere.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {PORTALS.map((p, i) => (
            <Reveal key={p.name} delay={(i % 3) * 80}>
              <article className="group h-full rounded-(--radius-card) border border-white/10 bg-ink-soft p-5 transition-all duration-300 hover:border-gold/40 hover:-translate-y-0.5">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg ${p.tint}`}>
                    <p.icon className="size-4.5" aria-hidden />
                  </span>
                  <h3 className="font-display text-[15.5px] font-bold text-paper">{p.name}</h3>
                </div>
                <p className="mt-2.5 text-[12.5px] leading-relaxed text-paper/55">{p.blurb}</p>
                <ul className="mt-3.5 space-y-1">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-center gap-2 text-[12px] text-paper/45">
                      <span className="size-1 rounded-full bg-gold" aria-hidden />
                      {pt}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
