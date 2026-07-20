import { Reveal } from "@/components/Reveal";

const PHASES = [
  {
    phase: "Phase 1",
    status: "Live in the demo",
    tone: "bg-primary text-white",
    items: ["School onboarding & verification", "Parent accounts & student registration", "Vacancy management", "Announcements", "Payment tracking & receipts"],
  },
  {
    phase: "Phase 2",
    status: "Live in the demo",
    tone: "bg-primary text-white",
    items: ["Teacher–parent communication", "Academic reporting & gradebooks", "Recruitment portal & pipelines", "Receipt automation & verification"],
  },
  {
    phase: "Phase 3",
    status: "Next",
    tone: "bg-gold text-ink",
    items: ["Mobile Money automation (live rails)", "SMS gateway integration", "Advanced analytics & forecasting", "School transport tracking"],
  },
];

export function Roadmap() {
  return (
    <section id="roadmap" className="bg-ink py-24 dot-texture">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <p className="text-[13px] font-bold uppercase tracking-[0.22em] text-gold">Roadmap</p>
          <h2 className="mt-3 font-display text-[clamp(28px,4vw,42px)] font-bold text-paper leading-tight">
            Shipped in phases. Built to last.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {PHASES.map((p, i) => (
            <Reveal key={p.phase} delay={i * 100}>
              <article className="h-full rounded-(--radius-card) border border-white/10 bg-ink-soft p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-[20px] font-bold text-paper">{p.phase}</h3>
                  <span className={`rounded-full px-3 py-1 text-[11.5px] font-bold ${p.tone}`}>{p.status}</span>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {p.items.map((item) => (
                    <li key={item} className="flex gap-2.5 text-[13.5px] text-paper/65">
                      <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={150}>
          <p className="mt-10 max-w-2xl text-[14px] text-paper/50">
            Long-term vision: become Rwanda's central education platform — improving transparency,
            efficiency, communication, admissions, payments and reporting for every stakeholder.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
