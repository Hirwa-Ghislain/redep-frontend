import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

/**
 * A wider sibling of AuthLayout (same dotted-canvas visual language) for public
 * pages whose content doesn't fit AuthLayout's 440px-capped card — the incident
 * report form and its tracking page.
 */
export function PublicPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh flex flex-col bg-paper overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-[480px] opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]"
        style={{
          backgroundImage: "radial-gradient(circle, rgb(15 23 18 / 0.10) 1.2px, transparent 1.2px)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />

      <header className="relative flex items-center justify-center pt-10 pb-8">
        <Link to="/login" aria-label="E-SHURI home">
          <Logo />
        </Link>
        <div className="absolute right-5 top-8">
          <LanguageSwitcher />
        </div>
      </header>

      <main className="relative flex-1 w-full px-5 pb-10">
        <div className="mx-auto w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-(--shadow-pop)"
          >
            {children}
          </motion.div>
        </div>
      </main>

      <footer className="relative pb-8 text-center">
        <p className="text-[12px] text-faint">
          © 2026 E-SHURI — Rwanda Education Digital Ecosystem Platform · Demo environment, payments simulated
        </p>
      </footer>
    </div>
  );
}
