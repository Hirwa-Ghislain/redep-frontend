import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BadgeCheck, ShieldCheck, Armchair } from "lucide-react";
import { Logo } from "./Logo";

/**
 * Auth layout v2 — centered card on a textured canvas (replaces the old
 * split-screen). Pages render their form inside the card; pages that pass
 * `aside` (school onboarding) get a dark info panel beside the card on lg+.
 */
export function AuthLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="relative min-h-dvh flex flex-col bg-paper overflow-hidden">
      {/* dotted canvas, fading toward the bottom */}
      <div
        className="absolute inset-x-0 top-0 h-[480px] opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]"
        style={{
          backgroundImage: "radial-gradient(circle, rgb(15 23 18 / 0.10) 1.2px, transparent 1.2px)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />

      {/* header */}
      <header className="relative flex justify-center pt-10 pb-8">
        <Link to="/login" aria-label="E-SHURI home">
          <Logo />
        </Link>
      </header>

      {/* content */}
      <main className="relative flex-1 w-full px-5 pb-10">
        <div
          className={
            aside
              ? "mx-auto grid w-full max-w-4xl items-start gap-5 lg:grid-cols-[1fr_340px]"
              : "mx-auto w-full max-w-[440px]"
          }
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-(--shadow-pop)"
          >
            {children}
          </motion.div>

          {aside && (
            <motion.aside
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="relative hidden lg:block overflow-hidden rounded-2xl bg-pine p-7"
            >
              <div
                className="absolute inset-0 opacity-[0.12]"
                style={{
                  backgroundImage: "radial-gradient(circle, #FFFFFF 1.1px, transparent 1.1px)",
                  backgroundSize: "24px 24px",
                }}
                aria-hidden
              />
              <div className="relative">{aside}</div>
            </motion.aside>
          )}
        </div>
     
      </main>

      {/* footer */}
      <footer className="relative pb-8 text-center">
        <p className="text-[12px] text-faint">
          © 2026 E-SHURI — Rwanda Education Digital Ecosystem Platform · Demo environment, payments simulated
        </p>
      </footer>
    </div>
  );
}
