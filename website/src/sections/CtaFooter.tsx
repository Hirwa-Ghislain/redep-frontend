import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Reveal } from "@/components/Reveal";
import { APP_URL } from "@/lib/config";

export function CtaFooter() {
  return (
    <>
      {/* CTA band */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <div className="relative overflow-hidden rounded-[24px] bg-primary px-8 py-14 sm:px-14 text-center">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: "radial-gradient(circle, rgb(247 245 240 / 0.14) 1.3px, transparent 1.3px)",
                  backgroundSize: "24px 24px",
                }}
                aria-hidden
              />
              <div className="relative">
                <h2 className="font-display text-[clamp(26px,4vw,40px)] font-bold text-white leading-tight">
                  See the whole ecosystem in action.
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-[15px] text-white/75">
                  The demo ships with seven ready-made accounts — one for every role. Explore the
                  parent, school, teacher, applicant, ministry and admin portals with realistic data.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <a
                    href={APP_URL}
                    className="inline-flex items-center gap-2 rounded-[12px] bg-gold px-7 py-3.5 text-[15px] font-bold text-ink hover:bg-[#f0b825] transition-all hover:-translate-y-0.5"
                  >
                    Open the platform <ArrowUpRight className="size-4.5" />
                  </a>
                  <a
                    href={`${APP_URL}/school-onboarding`}
                    className="inline-flex items-center gap-2 rounded-[12px] border border-white/30 px-7 py-3.5 text-[15px] font-semibold text-white hover:bg-white/10 transition-colors"
                  >
                    Register a school
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-ink pt-16 pb-8">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
            <div>
              <Logo dark />
              <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-paper/50">
                Rwanda Education Digital Ecosystem Platform — connecting schools, families, teachers
                and education authorities in one national system.
              </p>
            </div>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-paper/40">Portals</p>
              <ul className="mt-4 space-y-2.5 text-[13.5px]">
                {["Parents", "Schools", "Teachers", "Job applicants", "Education authorities"].map((l) => (
                  <li key={l}>
                    <a href={APP_URL} className="text-paper/65 hover:text-gold transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-paper/40">Platform</p>
              <ul className="mt-4 space-y-2.5 text-[13.5px]">
                <li><a href="#modules" className="text-paper/65 hover:text-gold transition-colors">What it does</a></li>
                <li><a href="#roadmap" className="text-paper/65 hover:text-gold transition-colors">Roadmap</a></li>
                <li><a href={`${APP_URL}/verify-receipt`} className="text-paper/65 hover:text-gold transition-colors">Verify a receipt</a></li>
                <li><a href={`${APP_URL}/school-onboarding`} className="text-paper/65 hover:text-gold transition-colors">Register a school</a></li>
              </ul>
            </div>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-paper/40">Contact</p>
              <ul className="mt-4 space-y-2.5 text-[13.5px] text-paper/65">
                <li>Kigali, Rwanda</li>
                <li>hello@eshuri.example.rw</li>
                <li>+250 7xx xxx xxx</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
            <p className="text-[12.5px] text-paper/40">© 2026 E-SHURI. Demonstration project — payments and SMS are simulated.</p>
            <p className="text-[12.5px] text-paper/40">Made with care for Rwandan education 🇷🇼</p>
          </div>
        </div>
      </footer>
    </>
  );
}
