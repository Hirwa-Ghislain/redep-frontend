import { Armchair, BadgeCheck, MessageSquareText, Smartphone, SplitSquareHorizontal, Star } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const ITEMS = [
  {
    icon: Smartphone,
    title: "Mobile Money native",
    body: "MTN MoMo and Airtel Money are first-class payment channels, not afterthoughts — because that's how Rwandan families actually pay.",
  },
  {
    icon: Armchair,
    title: "Seat reservation system",
    body: "Every class has a live seat counter. An approval reserves a seat atomically — no more double-promised places.",
  },
  {
    icon: BadgeCheck,
    title: "Verifiable receipts",
    body: "Every receipt carries a public reference code anyone can check — a simple, powerful defense against fee fraud.",
  },
  {
    icon: MessageSquareText,
    title: "SMS notifications",
    body: "Critical alerts will reach parents without smartphones via SMS gateways (phase 2), keeping no family outside the loop.",
  },
  {
    icon: SplitSquareHorizontal,
    title: "School comparison",
    body: "Side-by-side comparison of fees, seats, results and satisfaction — informed choice for every family, not just the connected ones.",
  },
  {
    icon: Star,
    title: "Reputation that's earned",
    body: "Parent satisfaction surveys feed a public score. Schools showcase achievements; families see the whole picture.",
  },
];

export function RwandaFirst() {
  return (
    <section id="rwanda" className="py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <Reveal className="lg:sticky lg:top-24">
            <p className="text-[13px] font-bold uppercase tracking-[0.22em] text-primary-deep">Built for Rwanda</p>
            <h2 className="mt-3 font-display text-[clamp(28px,4vw,42px)] font-bold text-ink leading-tight">
              Not adapted for Rwanda. <span className="text-primary">Designed for it.</span>
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-muted max-w-md">
              Payment rails, connectivity realities, national reporting lines — REDEP's features start
              from how education actually works here, from Kigali to the most rural sector.
            </p>
          </Reveal>

          <div className="grid gap-3.5 sm:grid-cols-2">
            {ITEMS.map((item, i) => (
              <Reveal key={item.title} delay={(i % 2) * 80}>
                <article className="h-full rounded-(--radius-card) border border-line bg-surface p-4.5 shadow-(--shadow-card)">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-gold-deep">
                      <item.icon className="size-4" aria-hidden />
                    </span>
                    <h3 className="font-display text-[14px] font-bold text-ink">{item.title}</h3>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{item.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
