import { Eye, FileSearch, Lock, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const PILLARS = [
  {
    icon: Lock,
    title: "Role-based access, everywhere",
    body: "Every screen, action and record is permission-gated. A school accountant sees finance; a teacher sees their classes; nobody sees more than their role requires.",
  },
  {
    icon: ShieldCheck,
    title: "Children's data, protected",
    body: "Student records are school-scoped and parent-linked. Authorities see aggregate statistics — enrollment counts and trends — never a child's personal file.",
  },
  {
    icon: FileSearch,
    title: "Auditable by design",
    body: "Sensitive actions — approvals, suspensions, payments recorded by staff — land in an immutable audit log. Accountability is a feature, not a promise.",
  },
  {
    icon: Eye,
    title: "Honest by default",
    body: "Fees are public on school profiles. Receipts are publicly verifiable. Seat counts can't be gamed. Transparency is the platform's default setting.",
  },
];

export function Trust() {
  return (
    <section className="border-y border-line bg-surface py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <p className="text-[13px] font-bold uppercase tracking-[0.22em] text-primary-deep">Trust & ethics</p>
          <h2 className="mt-3 font-display text-[clamp(28px,4vw,42px)] font-bold text-ink max-w-2xl leading-tight">
            A national platform has to earn national trust.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 70}>
              <article className="h-full rounded-(--radius-card) border border-line bg-paper p-5">
                <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary-deep">
                  <p.icon className="size-4.5" aria-hidden />
                </span>
                <h3 className="mt-3 font-display text-[14.5px] font-bold text-ink">{p.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{p.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
