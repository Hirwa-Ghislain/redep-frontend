import { useState } from "react";
import { Building2, Landmark, UsersRound } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const JOURNEYS = [
  {
    key: "parent",
    icon: UsersRound,
    label: "As a parent",
    steps: [
      { title: "Discover & compare", body: "Search schools by district, level and fees. Live seat counts show where places actually exist." },
      { title: "Apply once, digitally", body: "Submit your child's details and documents in a guided three-step application." },
      { title: "Get the decision", body: "Follow the review timeline; approval enrolls your child and links them to your account instantly." },
      { title: "Pay & stay close", body: "Pay fees by MoMo or bank, download verifiable receipts, message teachers and track grades all year." },
    ],
  },
  {
    key: "school",
    icon: Building2,
    label: "As a school",
    steps: [
      { title: "Get verified", body: "Request onboarding; REDEP administrators verify your documents and activate your school." },
      { title: "Build your profile", body: "Publish classes, seats, fees and achievements — your public face to every parent in Rwanda." },
      { title: "Run the office", body: "Review admissions, manage students, collect fees with automatic receipts, and give staff exactly the permissions their job needs." },
      { title: "Grow your team", body: "Post vacancies to a national talent pool and run candidates through a real pipeline." },
    ],
  },
  {
    key: "authority",
    icon: Landmark,
    label: "As an authority",
    steps: [
      { title: "See the nation live", body: "Enrollment, capacity utilization and satisfaction across every district — updated continuously." },
      { title: "Spot pressure early", body: "Capacity heat lists and teacher-gap analytics show where to invest before terms start." },
      { title: "Follow movement", body: "Transfer flows between districts reveal migration patterns as they happen." },
      { title: "Report with one click", body: "District and national reports export in seconds — planning built on data, not paperwork." },
    ],
  },
];

export function Journeys() {
  const [active, setActive] = useState("parent");
  const journey = JOURNEYS.find((j) => j.key === active)!;

  return (
    <section id="journeys" className="bg-surface border-y border-line py-24 dot-texture-ink">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <p className="text-[13px] font-bold uppercase tracking-[0.22em] text-primary-deep">How it works</p>
          <h2 className="mt-3 font-display text-[clamp(28px,4vw,42px)] font-bold text-ink leading-tight">
            Three journeys, one platform.
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-8 inline-flex rounded-full border border-line bg-paper p-1">
            {JOURNEYS.map((j) => (
              <button
                key={j.key}
                onClick={() => setActive(j.key)}
                aria-pressed={active === j.key}
                className={`inline-flex items-center gap-2 rounded-full px-4.5 py-2.5 text-[13.5px] font-semibold transition-colors ${
                  active === j.key ? "bg-ink text-paper" : "text-muted hover:text-ink"
                }`}
              >
                <j.icon className="size-4" aria-hidden />
                {j.label}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {journey.steps.map((s, i) => (
            <article
              key={`${journey.key}-${i}`}
              className="relative rounded-(--radius-card) border border-line bg-paper p-6"
            >
              <span className="font-display text-[42px] font-bold leading-none text-primary/20 tnum">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 font-display text-[16px] font-bold text-ink">{s.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{s.body}</p>
              {i < journey.steps.length - 1 && (
                <span className="absolute -right-2.5 top-1/2 hidden lg:block text-line-strong" aria-hidden>
                  →
                </span>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
