import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/**
 * Scroll-reveal wrapper. Elements start hidden (CSS .reveal) and flip to
 * .is-visible when they enter the viewport.
 *
 * Coordination with the splash: observation only starts after the
 * "app:splash-done" event (or immediately if it already fired), because
 * trigger positions measured while scroll is locked can be stale.
 */
export function Reveal({
  children,
  as: Tag = "div",
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let observer: IntersectionObserver | null = null;
    const start = () => {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer?.unobserve(entry.target);
            }
          }
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
      );
      observer.observe(el);
    };

    if (window.__splashDone) start();
    else window.addEventListener("app:splash-done", start, { once: true });

    return () => {
      window.removeEventListener("app:splash-done", start);
      observer?.disconnect();
    };
  }, []);

  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}>
      {children}
    </Tag>
  );
}
