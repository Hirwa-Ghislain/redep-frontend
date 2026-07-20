/**
 * Coded product mockup — a miniature replica of the REDEP school dashboard,
 * rendered in a browser frame. Pure HTML/CSS (no images) so it stays crisp,
 * themable and fast. Decorative: aria-hidden, unselectable.
 */

const KPIS = [
  { label: "Enrolled learners", value: "1,064", delta: "+3.1%", up: true },
  { label: "Seats remaining", value: "136", delta: "−12", up: false },
  { label: "Pending review", value: "7", delta: "+3", up: true },
  { label: "Term collections", value: "RWF 84.2M", delta: "+8.4%", up: true },
];

const BARS = [42, 58, 47, 66, 72, 61, 84, 78];

const ROWS = [
  { name: "Aline Ishimwe", cls: "P4 A", ref: "RDP-260231", amount: "45,000", ok: true },
  { name: "Yves Habimana", cls: "S2 A", ref: "RDP-260230", amount: "150,000", ok: true },
  { name: "Divine Umutoni", cls: "P6 A", ref: "RDP-260229", amount: "60,000", ok: false },
  { name: "Samuel Rukundo", cls: "S5 A", ref: "RDP-260228", amount: "180,000", ok: true },
];

const NAV = ["Overview", "Admissions", "Students", "Classes", "Payments", "Accounting", "Recruitment"];

export function ProductMock({ className = "" }: { className?: string }) {
  return (
    <div className={`select-none ${className}`} aria-hidden>
      <div className="rounded-2xl border border-line bg-surface shadow-[0_24px_80px_-16px_rgb(15_23_18/0.25)] overflow-hidden">
        {/* browser chrome */}
        <div className="flex items-center gap-2 border-b border-line bg-paper px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-clay/70" />
            <span className="size-2.5 rounded-full bg-gold/80" />
            <span className="size-2.5 rounded-full bg-primary/70" />
          </span>
          <span className="mx-auto flex items-center gap-1.5 rounded-md border border-line bg-surface px-8 py-1 text-[10px] text-faint">
            <span className="size-2 rounded-full bg-primary/60" /> redep.rw/school
          </span>
        </div>

        <div className="flex">
          {/* mini sidebar */}
          <div className="hidden sm:flex w-40 shrink-0 flex-col bg-ink px-2.5 py-3">
            <div className="flex items-center gap-1.5 px-1.5 mb-3">
              <span className="grid size-4.5 place-items-center rounded bg-gold text-[7px] font-bold text-ink">U</span>
              <span className="text-[9px] font-semibold text-paper/90">umurav Academy</span>
            </div>
            {NAV.map((item, i) => (
              <div
                key={item}
                className={`mb-0.5 flex items-center gap-1.5 rounded-md px-2 py-[5px] text-[9px] font-medium ${
                  i === 0 ? "bg-primary text-white" : "text-paper/45"
                }`}
              >
                <span className={`size-1.5 rounded-full ${i === 0 ? "bg-white/80" : "bg-paper/25"}`} />
                {item}
              </div>
            ))}
            <div className="mt-auto flex items-center gap-1.5 border-t border-white/10 px-1.5 pt-2.5">
              <span className="grid size-4 place-items-center rounded-full bg-sky-soft text-[6.5px] font-bold text-sky-deep">JM</span>
              <span className="text-[8px] text-paper/50">J-C. Mugisha</span>
            </div>
          </div>

          {/* main pane */}
          <div className="flex-1 bg-paper p-3.5">
            {/* greeting band */}
            <div className="mb-2.5 flex items-center justify-between rounded-lg bg-ink px-3 py-2">
              <div>
                <p className="text-[7px] font-bold uppercase tracking-[0.14em] text-gold">2026 · Term 2</p>
                <p className="text-[10.5px] font-bold text-paper">Good morning, umurav Academy</p>
              </div>
              <span className="rounded-md bg-gold px-2 py-1 text-[8px] font-bold text-ink">Review admissions</span>
            </div>

            {/* KPI tiles */}
            <div className="mb-2.5 grid grid-cols-2 gap-1.5 md:grid-cols-4">
              {KPIS.map((k) => (
                <div key={k.label} className="rounded-lg border border-line bg-surface p-2">
                  <p className="text-[7.5px] font-medium text-muted truncate">{k.label}</p>
                  <p className="text-[12px] font-bold text-ink tnum leading-4 mt-0.5">{k.value}</p>
                  <span
                    className={`mt-1 inline-block rounded px-1 py-px text-[7px] font-bold tnum ${
                      k.up ? "bg-primary-soft text-primary-deep" : "bg-clay-soft text-clay-deep"
                    }`}
                  >
                    {k.delta}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid gap-1.5 md:grid-cols-5">
              {/* chart card */}
              <div className="rounded-lg border border-line bg-surface p-2.5 md:col-span-2">
                <p className="text-[8px] font-semibold text-ink mb-2">Collections — last 8 weeks</p>
                <div className="flex h-16 items-end gap-1">
                  {BARS.map((h, i) => (
                    <span
                      key={i}
                      className={`flex-1 rounded-t-[3px] ${i === BARS.length - 2 ? "bg-primary" : "bg-primary/30"}`}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between text-[6.5px] text-faint tnum">
                  <span>29 May</span><span>17 Jul</span>
                </div>
              </div>

              {/* payments table */}
              <div className="rounded-lg border border-line bg-surface p-2.5 md:col-span-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[8px] font-semibold text-ink">Recent payments</p>
                  <span className="text-[7px] font-medium text-primary-deep">View ledger →</span>
                </div>
                <div className="divide-y divide-line">
                  {ROWS.map((r) => (
                    <div key={r.ref} className="flex items-center gap-2 py-[5px]">
                      <span className="grid size-4 shrink-0 place-items-center rounded-full bg-primary-soft text-[6px] font-bold text-primary-deep">
                        {r.name.split(" ").map((w) => w[0]).join("")}
                      </span>
                      <span className="w-24 truncate text-[8px] font-medium text-ink">{r.name}</span>
                      <span className="text-[7.5px] text-muted">{r.cls}</span>
                      <span className="hidden md:block text-[7.5px] text-faint tnum">{r.ref}</span>
                      <span className="ml-auto text-[8px] font-bold text-ink tnum">RWF {r.amount}</span>
                      <span
                        className={`rounded-full px-1.5 py-px text-[6.5px] font-bold ${
                          r.ok ? "bg-primary-soft text-primary-deep" : "bg-gold-soft text-gold-deep"
                        }`}
                      >
                        {r.ok ? "Completed" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
