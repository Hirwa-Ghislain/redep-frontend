import { http } from "@/lib/api/client";

export type LanguageCode = "EN" | "RW" | "FR";

export interface LanguageOption {
  code: LanguageCode;
  tag: string;
  name: string;
  nativeName: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: "EN", tag: "en", name: "English", nativeName: "English" },
  { code: "RW", tag: "rw", name: "Kinyarwanda", nativeName: "Ikinyarwanda" },
  { code: "FR", tag: "fr", name: "French", nativeName: "Français" },
];

export const i18nService = {
  // GET /api/v1/i18n/languages
  async getLanguages(): Promise<LanguageOption[]> {
    const res = await http.get<{ languages: LanguageOption[] }>("/i18n/languages");
    return res.languages;
  },

  // GET /api/v1/i18n/translations — language is negotiated via the Accept-Language header.
  async getTranslations(): Promise<Record<string, string>> {
    const res = await http.get<{ translations: Record<string, string> }>("/i18n/translations");
    return res.translations;
  },
};

export function languageTag(code: LanguageCode): string {
  return LANGUAGES.find((l) => l.code === code)?.tag ?? "en";
}
