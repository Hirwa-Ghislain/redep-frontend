import { ArrowUpRight, BadgeCheck, MessageSquare, Sparkles } from "lucide-react";
import { ProductMock } from "@/components/ProductMock";
import { Reveal } from "@/components/Reveal";
import { APP_URL } from "@/lib/config";

const STATS = [
  ["1,040+", "schools listed"],
  ["752k", "learners tracked"],
  ["30", "districts covered"],
  ["6", "role-based portals"],
];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-14 sm:pt-36">
      {/* faint dotted backdrop, fading out toward the bottom */}
      <div
        className="absolute inset-x-0 top-0 h-[560px] dot-texture-ink opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-5 text-center">
        <Reveal>
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[12.5px] font-semibold text-primary-deep shadow-(--shadow-card)">
            <Sparkles className="size-3.5 text-gold-deep" />
            Rwanda Education Digital Ecosystem Platform
          </p>
        </Reveal>

        <Reveal delay={70}>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-[clamp(38px,6.4vw,68px)] font-bold leading-[1.02] tracking-tight text-ink">
            Every school in Rwanda.
            <br />
            <span className="relative inline-block">
              One platform.
              <svg className="absolute -bottom-1.5 left-0 w-full" height="10" viewBox="0 0 300 10" preserveAspectRatio="none" aria-hidden>
                <path d="M2 7 Q75 2 150 6 T298 5" fill="none" stroke="#E7A917" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
        </Reveal>

        <Reveal delay={140}>
          <p className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-muted">
            Discovery with live seats, digital admissions, MoMo payments with verifiable
            receipts, academic feedback and national oversight — for parents, schools,
            teachers and government.
          </p>
        </Reveal>

        <Reveal delay={210}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={APP_URL}
              className="inline-flex items-center gap-2 rounded-[11px] bg-primary px-6 py-3 text-[14.5px] font-semibold text-white hover:bg-primary-deep transition-all hover:-translate-y-0.5 shadow-(--shadow-pop)"
            >
              Open the platform <ArrowUpRight className="size-4" />
            </a>
            <a
              href="#portals"
              className="inline-flex items-center gap-2 rounded-[11px] border border-line-strong bg-surface px-6 py-3 text-[14.5px] font-semibold text-ink hover:border-faint transition-colors"
            >
              Explore the portals
            </a>
          </div>
        </Reveal>

        {/* product mockup with floating proof chips */}
        <Reveal delay={300} className="relative mt-14">
          <div className="relative mx-auto max-w-4xl">
            <ProductMock />

            <div className="absolute -left-6 top-10 hidden xl:flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 shadow-(--shadow-pop) -rotate-2">
              <span className="grid size-7 place-items-center rounded-lg bg-primary-soft text-primary-deep">
                <BadgeCheck className="size-4" />
              </span>
              <span className="text-left">
                <span className="block text-[11px] font-bold text-ink">Receipt verified</span>
                <span className="block text-[10px] text-muted tnum">RDP-260231 · genuine</span>
              </span>
            </div>

            <div className="absolute -right-12 top-1/2 hidden xl:flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 shadow-(--shadow-pop) rotate-2">
              <span className="grid size-7 place-items-center rounded-lg bg-sky-soft text-sky-deep">
                <MessageSquare className="size-4" />
              </span>
              <span className="text-left">
                <span className="block text-[11px] font-bold text-ink">Kevin · Mathematics</span>
                <span className="block text-[10px] text-muted tnum">54% → 68% this term</span>
              </span>
            </div>

            <div className="absolute -bottom-4 left-10 hidden xl:block rounded-xl border border-line bg-ink px-3.5 py-2.5 shadow-(--shadow-pop) rotate-1">
              <span className="block text-left text-[10px] font-bold uppercase tracking-wide text-gold">Seat reserved</span>
              <span className="block text-left text-[11px] font-medium text-paper">Ange U. — P3 A · umurav Academy</span>
            </div>
          </div>
        </Reveal>

        {/* inline stats strip */}
        <Reveal delay={380}>
          <dl className="mx-auto mt-14 flex max-w-3xl flex-wrap items-center justify-center gap-x-0 gap-y-6">
            {STATS.map(([value, label], i) => (
              <div key={label} className={`px-8 ${i > 0 ? "sm:border-l sm:border-line" : ""}`}>
                <dd className="font-display text-[26px] font-bold text-ink tnum leading-none">{value}</dd>
                <dt className="mt-1.5 text-[12px] text-muted">{label}</dt>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
