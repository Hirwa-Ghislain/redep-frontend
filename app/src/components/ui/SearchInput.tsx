import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Debounce in ms; 0 = immediate. */
  delay?: number;
}

export function SearchInput({ value, onChange, placeholder = "Search…", className, delay = 250 }: SearchInputProps) {
  const [local, setLocal] = useState(value);

  useEffect(() => setLocal(value), [value]);

  useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => onChange(local), delay);
    return () => clearTimeout(t);
  }, [local]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-faint pointer-events-none" aria-hidden />
      <input
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          "h-9 w-full rounded-(--radius-ctl) border border-line-strong bg-surface pl-9 pr-8 text-[13.5px] text-ink shadow-(--shadow-card)",
          "placeholder:text-faint transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15",
          "[&::-webkit-search-cancel-button]:hidden",
        )}
      />
      {local && (
        <button
          onClick={() => { setLocal(""); onChange(""); }}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-faint hover:text-ink transition-colors"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
