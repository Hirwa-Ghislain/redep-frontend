import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

const palettes = [
  "bg-primary-soft text-primary-deep",
  "bg-gold-soft text-gold-deep",
  "bg-sky-soft text-sky-deep",
  "bg-clay-soft text-clay-deep",
  "bg-ink/8 text-ink",
];

export interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = { sm: "size-7 text-[11px]", md: "size-9 text-[13px]", lg: "size-12 text-[15px]" };

export function Avatar({ name, size = "md", className }: AvatarProps) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const palette = palettes[Math.abs(hash) % palettes.length];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold select-none",
        sizes[size],
        palette,
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
