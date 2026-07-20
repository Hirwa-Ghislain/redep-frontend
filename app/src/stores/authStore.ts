import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthSession, RoleKey, User } from "@/types";
import { authService } from "@/services/authService";
import { configureApiAuth } from "@/lib/api/client";

interface AuthState {
  session: AuthSession | null;
  /** Active role context for multi-role users (drives portal switcher). */
  activeRole: RoleKey | null;
  login: (email: string, password: string) => Promise<User>;
  register: (input: Parameters<typeof authService.register>[0]) => Promise<User>;
  setActiveRole: (role: RoleKey) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      activeRole: null,

      async login(email, password) {
        const session = await authService.login(email, password);
        set({ session, activeRole: null });
        return session.user;
      },

      async register(input) {
        const session = await authService.register(input);
        set({ session, activeRole: null });
        return session.user;
      },

      setActiveRole(role) {
        const { session } = get();
        if (session?.user.roles.includes(role)) set({ activeRole: role });
      },

      logout() {
        set({ session: null, activeRole: null });
      },
    }),
    { name: "redep.auth" },
  ),
);

// Wire the HTTP client to this store (used when VITE_USE_MOCKS=false).
configureApiAuth({
  getTokens: () => {
    const s = useAuthStore.getState().session;
    return s ? { accessToken: s.accessToken, refreshToken: s.refreshToken } : null;
  },
  onUnauthorized: () => useAuthStore.getState().logout(),
});
