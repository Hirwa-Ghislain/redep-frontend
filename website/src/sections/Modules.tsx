import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpenCheck,
  Compass,
  FileCheck2,
  MessageSquare,
  Wallet,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { DotMap } from "@/components/DotMap";

/* ------------------------------ tiny artifacts ------------------------------- */

function SchoolCardArtifact() {
  return (
    <div className="rounded-xl border border-line bg-paper/70 p-3 select-none" aria-hidden>
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink text-[11px] font-bold text-gold font-display">U</span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-ink leading-4">umurav Academy</p>
          <p className="text-[10px] text-muted">Gasabo · Remera — Primary · O-Level · A-Level</p>
        </div>
        <span className="rounded-full bg-gold-soft px-1.5 py-0.5 text-[9.5px] font-bold text-gold-deep tnum">★ 4.5</span>
      </div>
      <div className="mt-2.5">
        <div className="flex justify-between text-[9.5px] mb-1">
          <span className="text-muted">Seats remaining</span>
          <span className="font-bold text-primary-deep tnum">136 of 1,200</span>
        </div>
        <div className="h-1 rounded-full bg-ink/8">
          <div className="h-full w-[88%] rounded-full bg-gold" />
        </div>
      </div>
      <div className="mt-2.5 flex gap-1.5">
        <span className="flex-1 rounded-md bg-primary px-2 py-1 text-center text-[9.5px] font-bold text-white">View profile</span>
        <span className="rounded-md border border-line-strong bg-surface px-2 py-1 text-[9.5px] font-semibold text-ink">Compare</span>
      </div>
    </div>
  );
}

function ReceiptArtifact() {
  return (
    <div className="overflow-hidden rounded-xl border border-line select-none" aria-hidden>
      <div className="flex items-center justify-between bg-ink px-3 py-1.5">
        <span className="text-[8.5px] font-bold uppercase tracking-wider text-paper/70">Official receipt</span>
        <span className="text-[9.5px] font-bold text-gold tnum">RDP-260114</span>
      </div>
      <div className="bg-surface px-3 py-2 space-y-1">
        <div className="flex justify-between text-[9.5px]"><span className="text-muted">Student</span><span className="font-semibold text-ink">Ange Uwase · P3 A</span></div>
        <div className="flex justify-between text-[9.5px]"><span className="text-muted">Lunch programme</span><span className="font-bold text-primary-deep tnum">RWF 45,000</span></div>
        <div className="flex items-center gap-1 pt-0.5 text-[8.5px] text-primary-deep font-semibold">
          <BadgeCheck className="size-2.5" /> Publicly verifiable
        </div>
      </div>
    </div>
  );
}

function AdmissionArtifact() {
  const steps = [
    { label: "Submitted", tone: "bg-sky", done: true },
    { label: "Documents verified", tone: "bg-gold", done: true },
    { label: "Approved — seat reserved", tone: "bg-primary", done: false },
  ];
  return (
    <div className="rounded-xl border border-line bg-surface p-3 select-none" aria-hidden>
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-start gap-2">
          <div className="flex flex-col items-center">
            <span className={`size-2 rounded-full ${s.tone}`} />
            {i < steps.length - 1 && <span className="h-3.5 w-px bg-line-strong" />}
          </div>
          <p className={`-mt-0.5 text-[10px] ${i === steps.length - 1 ? "font-bold text-ink" : "text-muted"}`}>{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function ChatArtifact() {
  return (
    <div className="space-y-1.5 select-none" aria-hidden>
      <div className="max-w-[85%] rounded-xl rounded-bl-sm border border-line bg-surface px-2.5 py-1.5">
        <p className="text-[9.5px] text-ink">Kevin scored 68% on the mid-test — up from 54%.</p>
        <p className="mt-0.5 text-[8px] text-faint">Eric N. · Mathematics</p>
      </div>
      <div className="ml-auto max-w-[75%] rounded-xl rounded-br-sm bg-primary px-2.5 py-1.5">
        <p className="text-[9.5px] text-white">Murakoze! We'll practice the revision set.</p>
      </div>
    </div>
  );
}

function GradesArtifact() {
  const bars = [46, 54, 51, 62, 68];
  return (
    <div className="rounded-xl border border-line bg-surface p-3 select-none" aria-hidden>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-ink">Mathematics · Term 2</p>
        <span className="rounded bg-primary-soft px-1.5 py-px text-[8.5px] font-bold text-primary-deep tnum">+14 pts</span>
      </div>
      <div className="mt-2 flex h-10 items-end gap-1">
        {bars.map((h, i) => (
          <span key={i} className={`flex-1 rounded-t-[3px] ${i === bars.length - 1 ? "bg-primary" : "bg-primary/25"}`} style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

function PipelineArtifact() {
  const stages: Array<[string, number, string]> = [
    ["Applied", 8, "bg-sky-soft text-sky-deep"],
    ["Shortlisted", 3, "bg-gold-soft text-gold-deep"],
    ["Interview", 1, "bg-primary-soft text-primary-deep"],
  ];
  return (
    <div className="flex items-center gap-1.5 select-none" aria-hidden>
      {stages.map(([label, n, tone], i) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9.5px] font-bold ${tone}`}>
            {label} <span className="tnum">{n}</span>
          </span>
          {i < stages.length - 1 && <ArrowRight className="size-2.5 text-faint" />}
        </span>
      ))}
    </div>
  );
}

/* --------------------------------- section ---------------------------------- */

const tileBase =
  "group rounded-(--radius-card) border border-line bg-surface p-5 shadow-(--shadow-card) transition-all duration-300 hover:shadow-(--shadow-pop) hover:-translate-y-0.5";

function TileHeader({ icon: Icon, title }: { icon: typeof Compass; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-2">
      <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary-deep">
        <Icon className="size-4" aria-hidden />
      </span>
      <h3 className="font-display text-[15px] font-bold text-ink">{title}</h3>
    </div>
  );
}

export function Modules() {
  return (
    <section id="modules" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-primary-deep">What it does</p>
          <h2 className="mt-3 font-display text-[clamp(26px,4vw,38px)] font-bold text-ink max-w-2xl leading-tight tracking-tight">
            The whole school journey, digital end-to-end.
          </h2>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-3.5 md:grid-cols-6">
          {/* Discovery — flagship tile */}
          <Reveal className="md:col-span-4">
            <article className={`${tileBase} h-full md:flex md:items-center md:gap-8`}>
              <div className="md:flex-1">
                <TileHeader icon={Compass} title="School discovery" />
                <p className="text-[13px] leading-relaxed text-muted max-w-sm">
                  Public profiles with fees, facilities and achievements. Parents filter by district
                  and level, compare side by side — and live seat counters make over-registration
                  impossible.
                </p>
              </div>
              <div className="mt-4 md:mt-0 md:w-72 shrink-0">
                <SchoolCardArtifact />
              </div>
            </article>
          </Reveal>

          {/* Payments & receipts */}
          <Reveal className="md:col-span-2" delay={80}>
            <article className={`${tileBase} h-full`}>
              <TileHeader icon={Wallet} title="Fees & receipts" />
              <p className="text-[12.5px] leading-relaxed text-muted mb-3">
                MoMo and bank payments; every one issues a verifiable digital receipt in seconds.
              </p>
              <ReceiptArtifact />
            </article>
          </Reveal>

          {/* Admissions */}
          <Reveal className="md:col-span-2">
            <article className={`${tileBase} h-full`}>
              <TileHeader icon={FileCheck2} title="Admissions" />
              <p className="text-[12.5px] leading-relaxed text-muted mb-3">
                Apply once with documents; every decision notifies the parent and an approval
                enrolls the child automatically.
              </p>
              <AdmissionArtifact />
            </article>
          </Reveal>

          {/* Communication */}
          <Reveal className="md:col-span-2" delay={80}>
            <article className={`${tileBase} h-full`}>
              <TileHeader icon={MessageSquare} title="Communication" />
              <p className="text-[12.5px] leading-relaxed text-muted mb-3">
                Targeted announcements plus direct parent–teacher threads, with the office in reach.
              </p>
              <ChatArtifact />
            </article>
          </Reveal>

          {/* Academics */}
          <Reveal className="md:col-span-2" delay={160}>
            <article className={`${tileBase} h-full`}>
              <TileHeader icon={BookOpenCheck} title="Academic monitoring" />
              <p className="text-[12.5px] leading-relaxed text-muted mb-3">
                Attendance, grades and comments recorded as they happen — not at year end.
              </p>
              <GradesArtifact />
            </article>
          </Reveal>

          {/* Recruitment */}
          <Reveal className="md:col-span-3">
            <article className={`${tileBase} h-full`}>
              <TileHeader icon={ArrowRight} title="Recruitment" />
              <p className="text-[12.5px] leading-relaxed text-muted mb-4 max-w-md">
                Schools publish vacancies to a national talent pool — teachers, accountants,
                librarians, drivers — and run every candidate through a real pipeline.
              </p>
              <PipelineArtifact />
            </article>
          </Reveal>

          {/* Oversight */}
          <Reveal className="md:col-span-3" delay={80}>
            <article className={`${tileBase} h-full md:flex md:items-center md:gap-6`}>
              <div className="md:flex-1">
                <TileHeader icon={BarChart3} title="National oversight" />
                <p className="text-[12.5px] leading-relaxed text-muted">
                  Authorities watch enrollment, capacity pressure and staffing gaps live — and
                  export district or national reports in one click.
                </p>
              </div>
              <div className="mt-4 md:mt-0 md:w-40 shrink-0">
                <DotMap className="w-full" pulse />
              </div>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
