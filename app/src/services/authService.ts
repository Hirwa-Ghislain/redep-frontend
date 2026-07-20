import type { AuthSession, SchoolOnboardingRequest, User } from "@/types";
import { db, nowIso, simulate, snapshot } from "@/mocks/db";
import { uid } from "@/lib/utils";

/**
 * Auth service. Mock accepts any password of 6+ chars for the demo accounts:
 * parent@demo.rw · school@demo.rw · accountant@demo.rw · teacher@demo.rw
 * applicant@demo.rw · ministry@demo.rw · admin@demo.rw
 */
export const authService = {
  // POST /api/v1/auth/login
  async login(email: string, password: string): Promise<AuthSession> {
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || password.length < 6) {
      await simulate(null, 500);
      throw { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect.", status: 401 };
    }
    if (user.status === "SUSPENDED") {
      await simulate(null, 400);
      throw { code: "ACCOUNT_SUSPENDED", message: "This account has been suspended. Contact support.", status: 403 };
    }
    return simulate({
      user: snapshot(user),
      accessToken: `mock-access-${user.id}`,
      refreshToken: `mock-refresh-${user.id}`,
    });
  },

  // POST /api/v1/auth/register  (self-serve: parents and job applicants only)
  async register(input: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    role: "PARENT" | "APPLICANT";
  }): Promise<AuthSession> {
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
    return simulate({
      user: snapshot(user),
      accessToken: `mock-access-${user.id}`,
      refreshToken: `mock-refresh-${user.id}`,
    });
  },

  // POST /api/v1/auth/forgot-password
  async forgotPassword(email: string): Promise<{ ok: true }> {
    void email; // always succeed — do not leak which emails exist
    return simulate({ ok: true }, 600);
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
