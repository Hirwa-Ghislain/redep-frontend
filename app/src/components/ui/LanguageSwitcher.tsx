import { Globe } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";
import { useI18nStore } from "@/stores/i18nStore";
import type { LanguageCode } from "@/services/i18nService";

const FALLBACK_LANGUAGES: { code: LanguageCode; nativeName: string }[] = [
  { code: "EN", nativeName: "English" },
  { code: "RW", nativeName: "Ikinyarwanda" },
  { code: "FR", nativeName: "Français" },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const language = useI18nStore((s) => s.language);
  const languages = useI18nStore((s) => s.languages);
  const setLanguage = useI18nStore((s) => s.setLanguage);

  const options = languages.length ? languages : FALLBACK_LANGUAGES;

  return (
    <Dropdown
      align="right"
      className={className}
      trigger={
        <button
          aria-label="Change language"
          className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12.5px] font-medium text-muted hover:bg-paper hover:text-ink transition-colors"
        >
          <Globe className="size-3.5" aria-hidden />
          {language}
        </button>
      }
      items={options.map((opt) => ({
        label: opt.nativeName,
        onSelect: () => void setLanguage(opt.code),
        disabled: opt.code === language,
      }))}
    />
  );
}
