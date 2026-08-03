import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthSession, RoleKey, User } from "@/types";
import { authService, type PendingVerification, type VerificationMethod } from "@/services/authService";
import { configureApiAuth } from "@/lib/api/client";

interface AuthState {
  session: AuthSession | null;
  /** Active role context for multi-role users (drives portal switcher). */
  activeRole: RoleKey | null;
  login: (email: string, password: string) => Promise<User>;
  /** Returns a session directly in mock mode; in live mode, returns pending-OTP info instead. */
  register: (input: Parameters<typeof authService.register>[0]) => Promise<User | PendingVerification>;
  verifyAccount: (input: { verificationMethod: VerificationMethod; identifier: string; otp: string }) => Promise<User>;
  setActiveRole: (role: RoleKey) => void;
  logout: () => void;
}

function isPendingVerification(result: User | AuthSession | PendingVerification): result is PendingVerification {
  return !("id" in result) && !("user" in result);
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
        const result = await authService.register(input);
        if (isPendingVerification(result)) return result;
        set({ session: result, activeRole: null });
        return result.user;
      },

      async verifyAccount(input) {
        const session = await authService.verifyAccount(input);
        set({ session, activeRole: null });
        return session.user;
      },

      setActiveRole(role) {
        const { session } = get();
        if (session?.user.roles.includes(role)) set({ activeRole: role });
      },

      logout() {
        const hadSession = useAuthStore.getState().session !== null;
        set({ session: null, activeRole: null });
        if (hadSession) void authService.logout();
      },
    }),
    { name: "eshuri.auth" },
  ),
);

// Wire the HTTP client to this store (used when VITE_USE_MOCKS=false).
configureApiAuth({
  getAccessToken: () => useAuthStore.getState().session?.accessToken ?? null,
  onTokenRefreshed: (accessToken) => {
    const { session } = useAuthStore.getState();
    if (session) useAuthStore.setState({ session: { ...session, accessToken } });
  },
  onUnauthorized: () => useAuthStore.getState().logout(),
});
