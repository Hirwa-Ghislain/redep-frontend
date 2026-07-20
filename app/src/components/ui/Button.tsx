import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-deep border border-transparent shadow-(--shadow-card)",
  secondary: "bg-surface text-ink border border-line-strong hover:border-faint hover:bg-paper/60 shadow-(--shadow-card)",
  ghost: "bg-transparent text-muted hover:text-ink hover:bg-ink/5 border border-transparent",
  danger: "bg-clay text-white hover:bg-clay-deep border border-transparent shadow-(--shadow-card)",
  gold: "bg-gold text-ink hover:bg-[#d99b0e] border border-transparent shadow-(--shadow-card)",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-2.5 text-[12.5px] gap-1.5 [&_svg]:size-3.5",
  md: "h-9 px-3.5 text-[13.5px] gap-2",
  lg: "h-11 px-5 text-[14.5px] gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, iconRight, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-(--radius-ctl) font-medium select-none",
        "transition-[background-color,border-color,transform,opacity] duration-150 active:scale-[0.98]",
        "disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
      {iconRight}
    </button>
  );
});
