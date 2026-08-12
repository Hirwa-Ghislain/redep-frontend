import type { AuthSession, BackendUser, User } from "@/types";
import { http } from "@/lib/api/client";
import { mapBackendUser } from "@/config/roles";

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  nationalId: string;
  dateOfBirth: string; // yyyy-MM-dd
  role: "PARENT" | "APPLICANT" | "SCHOOL_ADMIN";
  preferredLanguage?: "EN" | "RW" | "FR";
}

/** Returned by `register()` — the backend requires OTP verification before a session exists. */
export interface PendingVerification {
  email: string;
  phone: string;
}

export type VerificationMethod = "EMAIL" | "PHONE";

interface AuthTokenResponse {
  user: BackendUser;
  accessToken: string;
  tokenType: string;
  expiresIn: string;
}

function toSession(res: AuthTokenResponse): AuthSession {
  return { user: mapBackendUser(res.user), accessToken: res.accessToken };
}

/**
 * Auth service. Talks to the E-SHURI backend, which requires OTP account verification
 * after `register()` (see `verifyAccount`).
 */
export const authService = {
  // POST /api/v1/auth/login
  async login(email: string, password: string): Promise<AuthSession> {
    const res = await http.post<AuthTokenResponse>("/auth/login", { email: email.trim().toLowerCase(), password });
    return toSession(res);
  },

  // POST /api/v1/auth/register  (self-serve: parents and job applicants only)
  // The backend validates the National ID (name + date of birth) before creating the
  // account, then emails/SMSes a 6-digit OTP — no session is returned here.
  async register(input: RegisterInput): Promise<PendingVerification | AuthSession> {
    await http.post("/auth/register", {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.trim().toLowerCase(),
      phone: input.phone,
      password: input.password,
      confirmPassword: input.confirmPassword,
      nationalId: input.nationalId,
      dateOfBirth: input.dateOfBirth,
      role: input.role,
      preferredLanguage: input.preferredLanguage ?? "EN",
    });
    return { email: input.email.trim().toLowerCase(), phone: input.phone };
  },

  // POST /api/v1/auth/verify-account — completes registration and returns a session.
  async verifyAccount(input: { verificationMethod: VerificationMethod; identifier: string; otp: string }): Promise<AuthSession> {
    const res = await http.post<AuthTokenResponse>("/auth/verify-account", input);
    return toSession(res);
  },

  // POST /api/v1/auth/forgot-password
  async forgotPassword(email: string): Promise<{ ok: true }> {
    await http.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
    return { ok: true };
  },

  // POST /api/v1/auth/reset-password
  async resetPassword(input: { email: string; otp: string; password: string; confirmPassword: string }): Promise<void> {
    await http.post("/auth/reset-password", input);
  },

  // POST /api/v1/auth/logout
  async logout(): Promise<void> {
    try {
      await http.post("/auth/logout");
    } catch {
      /* logout is best-effort; the local session is already cleared by the caller */
    }
  },

  // GET /api/v1/auth/me — refetches the current user (e.g. after a SCHOOL_ADMIN creates their school
  // and the backend assigns `schoolId` server-side, which the login/register response can't reflect yet).
  async me(): Promise<User> {
    const res = await http.get<{ user: BackendUser }>("/auth/me");
    return mapBackendUser(res.user);
  },

  // PATCH /api/v1/auth/me
  async updateProfile(input: { firstName?: string; lastName?: string; preferredLanguage?: "EN" | "RW" | "FR" }): Promise<User> {
    const res = await http.patch<{ user: BackendUser }>("/auth/me", input);
    return mapBackendUser(res.user);
  },
};
