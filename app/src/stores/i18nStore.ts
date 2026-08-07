import { create } from "zustand";
import { persist } from "zustand/middleware";
import { configureApiLanguage } from "@/lib/api/client";
import { i18nService, languageTag, type LanguageCode, type LanguageOption } from "@/services/i18nService";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";

interface I18nState {
  language: LanguageCode;
  languages: LanguageOption[];
  translations: Record<string, string>;
  init: () => Promise<void>;
  setLanguage: (code: LanguageCode) => Promise<void>;
  /** Looks up `key` in the loaded translation map; falls back to `fallback` (English) when missing. */
  t: (key: string, fallback: string) => string;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      language: "EN",
      languages: [],
      translations: {},

      async init() {
        const [languages, translations] = await Promise.all([
          i18nService.getLanguages(),
          i18nService.getTranslations(),
        ]);
        set({ languages, translations });
      },

      async setLanguage(code) {
        set({ language: code });
        const translations = await i18nService.getTranslations();
        set({ translations });
        if (useAuthStore.getState().session) {
          // Best-effort — the mock backend doesn't support profile updates; never block the switch on it.
          try {
            await authService.updateProfile({ preferredLanguage: code });
          } catch {
            /* ignore */
          }
        }
      },

      t(key, fallback) {
        return get().translations[key] ?? fallback;
      },
    }),
    { name: "eshuri.i18n", partialize: (s) => ({ language: s.language }) },
  ),
);

// Wire the HTTP client to this store — every request sends the current language.
configureApiLanguage(() => languageTag(useI18nStore.getState().language));
