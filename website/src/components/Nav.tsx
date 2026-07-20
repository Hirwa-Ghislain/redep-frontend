import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { APP_URL } from "@/lib/config";

const LINKS = [
  { href: "#portals", label: "Portals" },
  { href: "#modules", label: "What it does" },
  { href: "#journeys", label: "How it works" },
  { href: "#rwanda", label: "Built for Rwanda" },
  { href: "#roadmap", label: "Roadmap" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled ? "bg-paper/90 backdrop-blur border-b border-line" : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a href="#top" aria-label="REDEP home">
          <Logo />
        </a>

        <div className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-muted hover:text-ink hover:bg-ink/5 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={APP_URL}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-[10px] bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-primary-deep transition-colors"
          >
            Open the platform <ArrowUpRight className="size-4" />
          </a>
          <button
            className="md:hidden p-2 rounded-lg text-ink hover:bg-ink/5"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="md:hidden border-t border-line bg-paper px-5 py-3">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-ink/5"
            >
              {l.label}
            </a>
          ))}
          <a
            href={APP_URL}
            className="mt-2 flex items-center justify-center gap-1.5 rounded-[10px] bg-primary px-4 py-3 text-[14px] font-semibold text-white"
          >
            Open the platform <ArrowUpRight className="size-4" />
          </a>
        </div>
      )}
    </header>
  );
}
