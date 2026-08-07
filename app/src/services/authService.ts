import type { AuthSession, BackendUser, SchoolOnboardingRequest, User } from "@/types";
import { db, nowIso, simulate, snapshot } from "@/mocks/db";
import { uid } from "@/lib/utils";
import { http, USE_MOCKS } from "@/lib/api/client";
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
  role: "PARENT" | "APPLICANT";
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
 * Auth service. Mock mode (VITE_USE_MOCKS=true) accepts any password of 6+ chars for the
 * demo accounts: parent@demo.rw · school@demo.rw · accountant@demo.rw · teacher@demo.rw ·
 * applicant@demo.rw · ministry@demo.rw · admin@demo.rw. Live mode talks to the E-SHURI
 * backend, which requires OTP account verification after `register()` (see `verifyAccount`).
 */
export const authService = {
  // POST /api/v1/auth/login
  async login(email: string, password: string): Promise<AuthSession> {
    if (USE_MOCKS) {
      const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user || password.length < 6) {
        await simulate(null, 500);
        throw { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect.", status: 401 };
      }
      if (user.status === "SUSPENDED") {
        await simulate(null, 400);
        throw { code: "ACCOUNT_SUSPENDED", message: "This account has been suspended. Contact support.", status: 403 };
      }
      return simulate({ user: snapshot(user), accessToken: `mock-access-${user.id}` });
    }
    const res = await http.post<AuthTokenResponse>("/auth/login", { email: email.trim().toLowerCase(), password });
    return toSession(res);
  },

  // POST /api/v1/auth/register  (self-serve: parents and job applicants only)
  // The backend validates the National ID (name + date of birth) before creating the
  // account, then emails/SMSes a 6-digit OTP — no session is returned here.
  async register(input: RegisterInput): Promise<PendingVerification | AuthSession> {
    if (USE_MOCKS) {
      const exists = db.users.some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase());
      if (exists) {
        await simulate(null, 400);
        throw {
          code: "EMAIL_TAKEN",
          message: "An account with this email already exists.",
          fieldErrors: { email: "Already registered" },
          status: 409,
        };
      }
      const user: User = {
        id: uid("u"),
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email.trim(),
        phone: input.phone,
        roles: [input.role],
        permissions: [],
        createdAt: nowIso(),
      };
      db.users.push(user);
      if (input.role === "APPLICANT") {
        db.applicantProfiles.push({
          userId: user.id, headline: "", bio: "", district: "", subjects: [],
          experienceYears: 0, education: [], experience: [], documents: [],
        });
      }
      return simulate({ user: snapshot(user), accessToken: `mock-access-${user.id}` });
    }
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
    if (USE_MOCKS) return simulate({ user: db.users[0]!, accessToken: "mock-access" });
    const res = await http.post<AuthTokenResponse>("/auth/verify-account", input);
    return toSession(res);
  },

  // POST /api/v1/auth/forgot-password
  async forgotPassword(email: string): Promise<{ ok: true }> {
    if (USE_MOCKS) {
      void email; // always succeed — do not leak which emails exist
      return simulate({ ok: true }, 600);
    }
    await http.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
    return { ok: true };
  },

  // POST /api/v1/auth/reset-password
  async resetPassword(input: { email: string; otp: string; password: string; confirmPassword: string }): Promise<void> {
    if (USE_MOCKS) {
      await simulate(null, 500);
      return;
    }
    await http.post("/auth/reset-password", input);
  },

  // POST /api/v1/auth/logout
  async logout(): Promise<void> {
    if (USE_MOCKS) return;
    try {
      await http.post("/auth/logout");
    } catch {
      /* logout is best-effort; the local session is already cleared by the caller */
    }
  },

  // PATCH /api/v1/auth/me
  async updateProfile(input: { firstName?: string; lastName?: string; preferredLanguage?: "EN" | "RW" | "FR" }): Promise<User> {
    if (USE_MOCKS) {
      await simulate(null, 400);
      throw { code: "NOT_SUPPORTED", message: "Not available in demo mode.", status: 400 };
    }
    const res = await http.patch<{ user: BackendUser }>("/auth/me", input);
    return mapBackendUser(res.user);
  },

  // POST /api/v1/schools/onboarding-requests  (public form)
  async requestSchoolOnboarding(
    input: Omit<SchoolOnboardingRequest, "id" | "status" | "submittedAt" | "documents">,
  ): Promise<SchoolOnboardingRequest> {
    const request: SchoolOnboardingRequest = {
      ...input,
      id: uid("onb"),
      status: "PENDING",
      submittedAt: nowIso(),
      documents: [],
    };
    db.onboardingRequests.unshift(request);
    return simulate(snapshot(request));
  },
};
