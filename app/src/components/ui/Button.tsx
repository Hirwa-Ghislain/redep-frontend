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
  primary: "bg-primary text-white hover:bg-primary-deep hover:shadow-[0_8px_20px_rgb(27_122_83_/_0.22)] border border-transparent shadow-(--shadow-card)",
  secondary: "bg-surface text-ink border border-line-strong hover:border-primary/35 hover:bg-primary-soft/45 hover:text-primary-deep hover:shadow-[0_6px_16px_rgb(15_23_18_/_0.08)] shadow-(--shadow-card)",
  ghost: "bg-transparent text-muted hover:text-ink hover:bg-ink/5 border border-transparent",
  danger: "bg-clay text-white hover:bg-clay-deep hover:shadow-[0_8px_20px_rgb(196_83_46_/_0.2)] border border-transparent shadow-(--shadow-card)",
  gold: "bg-gold text-ink hover:bg-[#d99b0e] hover:shadow-[0_8px_20px_rgb(231_169_23_/_0.22)] border border-transparent shadow-(--shadow-card)",
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
        "transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]",
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
