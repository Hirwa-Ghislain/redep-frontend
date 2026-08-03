import type {
  ApplicantProfile,
  JobApplication,
  JobApplicationStage,
  Vacancy,
} from "@/types";
import { db, nowIso, simulate, snapshot } from "@/mocks/db";
import { uid } from "@/lib/utils";
import { http, USE_MOCKS, type ApiError } from "@/lib/api/client";

export interface VacancyFilters {
  q?: string;
  district?: string;
  openOnly?: boolean;
}

/*
 * ---------------------------------------------------------------------------
 * Backend shapes (E-SHURI `job.routes.ts` / `job.service.ts`) — see that
 * module for the source of truth. The real `JobPosting` model has no
 * position-taxonomy, subject, employment-type or salary-range fields, and
 * `JobApplication.status` only ever takes SUBMITTED | SHORTLISTED | REJECTED
 * (no INTERVIEW/OFFERED/HIRED). The mapping helpers below translate the real
 * payloads into the existing frontend `Vacancy`/`JobApplication` shapes so
 * the rest of the applicant UI (built for a richer, hypothetical API) keeps
 * working — `positionType`/`employmentType` are filled with a neutral
 * default ("OTHER"/"FULL_TIME") since the backend has no such concept; the
 * job-board filters for them have been removed (see JobBoardPage) rather
 * than left as dead controls.
 * ---------------------------------------------------------------------------
 */
interface BackendSchoolRef {
  id: string;
  name: string;
  district: string;
  sector: string;
  email?: string;
  phone?: string;
}
interface BackendJob {
  id: string;
  schoolId: string;
  title: string;
  description: string;
  requirements: string | null;
  location: string | null;
  deadline: string | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  school: BackendSchoolRef;
  _count?: { applications: number };
}
interface BackendApplication {
  id: string;
  jobId: string;
  applicantId: string;
  coverLetter: string | null;
  cvPath: string | null;
  cvMimeType: string | null;
  status: "SUBMITTED" | "SHORTLISTED" | "REJECTED";
  interviewAt: string | null;
  interviewLocation: string | null;
  shortlistMessage: string | null;
  shortlistedAt: string | null;
  createdAt: string;
  updatedAt: string;
  job: BackendJob;
}

/** GET /jobs/schools/:schoolId row shape. */
export interface RealSchoolJobRow {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  deadline: string;
  createdAt: string;
  applicantsCount: number;
}

/** GET /jobs/schools/:schoolId/:jobId/applications row shape. */
export interface RealSchoolApplicantRow {
  id: string;
  jobId: string;
  status: "SUBMITTED" | "SHORTLISTED" | "REJECTED";
  coverLetter: string | null;
  cvPath: string | null;
  interviewAt: string | null;
  interviewLocation: string | null;
  shortlistMessage: string | null;
  shortlistedAt: string | null;
  createdAt: string;
  applicant: { id: string; firstName: string; lastName: string; email: string; phone: string | null };
}

function mapSchoolApplicant(a: RealSchoolApplicantRow): JobApplication {
  const timeline: JobApplication["timeline"] = [{ at: a.createdAt, stage: "APPLIED" }];
  if (a.status === "SHORTLISTED") {
    const note = a.interviewAt
      ? `Interview: ${new Date(a.interviewAt).toLocaleString()} at ${a.interviewLocation ?? "TBC"}.${a.shortlistMessage ? ` ${a.shortlistMessage}` : ""}`
      : a.shortlistMessage ?? undefined;
    timeline.push({ at: a.shortlistedAt ?? a.createdAt, stage: "SHORTLISTED", note });
  } else if (a.status === "REJECTED") {
    timeline.push({ at: a.createdAt, stage: "REJECTED", note: a.shortlistMessage ?? undefined });
  }
  return {
    id: a.id, vacancyId: a.jobId, vacancyTitle: "", schoolName: "",
    applicantId: a.applicant.id, applicantName: `${a.applicant.firstName} ${a.applicant.lastName}`,
    applicantHeadline: a.applicant.email, coverLetter: a.coverLetter ?? "",
    cvFileName: cvFileNameFromPath(a.cvPath),
    stage: a.status === "SUBMITTED" ? "APPLIED" : a.status === "SHORTLISTED" ? "SHORTLISTED" : "REJECTED",
    appliedAt: a.createdAt, timeline,
  };
}

function cvFileNameFromPath(path: string | null): string {
  if (!path) return "";
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

function mapJob(job: BackendJob): Vacancy {
  return {
    id: job.id,
    schoolId: job.schoolId,
    schoolName: job.school.name,
    district: job.school.district,
    title: job.title,
    positionType: "OTHER",
    employmentType: "FULL_TIME",
    description: job.description,
    requirements: job.requirements
      ? job.requirements.split(/\r?\n+/).map((r) => r.trim()).filter(Boolean)
      : [],
    deadline: job.deadline ?? job.createdAt,
    status: job.status === "PUBLISHED" ? "OPEN" : "CLOSED",
    postedAt: job.createdAt,
    applicantsCount: job._count?.applications ?? 0,
  };
}

/** Real statuses only ever land on APPLIED/SHORTLISTED/REJECTED — never a fabricated OFFERED/HIRED. */
function mapApplication(app: BackendApplication): JobApplication {
  const timeline: JobApplication["timeline"] = [{ at: app.createdAt, stage: "APPLIED" }];
  if (app.status === "SHORTLISTED") {
    const interviewNote = app.interviewAt
      ? `Interview: ${new Date(app.interviewAt).toLocaleString()} at ${app.interviewLocation ?? "location to be confirmed"}.${
          app.shortlistMessage ? ` ${app.shortlistMessage}` : ""
        }`
      : (app.shortlistMessage ?? undefined);
    timeline.push({ at: app.shortlistedAt ?? app.updatedAt, stage: "SHORTLISTED", note: interviewNote });
  } else if (app.status === "REJECTED") {
    timeline.push({ at: app.updatedAt, stage: "REJECTED", note: app.shortlistMessage ?? undefined });
  }
  return {
    id: app.id,
    vacancyId: app.jobId,
    vacancyTitle: app.job.title,
    schoolName: app.job.school.name,
    applicantId: app.applicantId,
    applicantName: "",
    applicantHeadline: "",
    coverLetter: app.coverLetter ?? "",
    cvFileName: cvFileNameFromPath(app.cvPath),
    stage: app.status === "SUBMITTED" ? "APPLIED" : app.status === "SHORTLISTED" ? "SHORTLISTED" : "REJECTED",
    appliedAt: app.createdAt,
    timeline,
  };
}

/*
 * ---------------------------------------------------------------------------
 * Applicant profile (CV builder): the backend has no `ApplicantProfile`
 * model — it only stores a cover letter + CV file per job application
 * (`JobApplication.coverLetter`/`cvPath`). There is no GET/PUT profile
 * endpoint to call. Per the integration plan, the profile builder page
 * stays as a client-side convenience: it is persisted to `localStorage`
 * only (never sent to the backend) and used to prefill applications in mock
 * mode. This keeps `ProfilePage.tsx`/`ApplicantDashboard.tsx` unchanged.
 * ---------------------------------------------------------------------------
 */
const PROFILE_STORAGE_PREFIX = "eshuri.applicant-profile.";

function emptyProfile(userId: string): ApplicantProfile {
  return {
    userId,
    headline: "",
    bio: "",
    district: "",
    subjects: [],
    experienceYears: 0,
    education: [],
    experience: [],
    documents: [],
  };
}

function readLocalProfile(userId: string): ApplicantProfile {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_PREFIX + userId);
    if (!raw) return emptyProfile(userId);
    return { ...emptyProfile(userId), ...(JSON.parse(raw) as Partial<ApplicantProfile>), userId };
  } catch {
    return emptyProfile(userId);
  }
}

function writeLocalProfile(profile: ApplicantProfile): void {
  try {
    window.localStorage.setItem(PROFILE_STORAGE_PREFIX + profile.userId, JSON.stringify(profile));
  } catch {
    /* localStorage unavailable (private mode, etc.) — profile stays in-memory for this session only */
  }
}

export const recruitmentService = {
  // GET /jobs?search= (backend only supports schoolId/search server-side — district is filtered client-side
  // from the school data the endpoint already includes; positionType/employmentType have no backend field at
  // all, see JobBoardPage, which drops those filter controls entirely).
  async vacancies(filters: VacancyFilters = {}): Promise<Vacancy[]> {
    if (USE_MOCKS) {
      let out = [...db.vacancies];
      if (filters.openOnly !== false) out = out.filter((v) => v.status === "OPEN");
      if (filters.q) {
        const q = filters.q.toLowerCase();
        out = out.filter(
          (v) => v.title.toLowerCase().includes(q) || v.schoolName.toLowerCase().includes(q) || (v.subject ?? "").toLowerCase().includes(q),
        );
      }
      if (filters.district) out = out.filter((v) => v.district === filters.district);
      return simulate(snapshot(out.sort((a, b) => b.postedAt.localeCompare(a.postedAt))));
    }
    const params = new URLSearchParams();
    if (filters.q) params.set("search", filters.q);
    const query = params.toString();
    const { jobs } = await http.get<{ jobs: BackendJob[] }>(`/jobs${query ? `?${query}` : ""}`);
    let out = jobs.map(mapJob);
    if (filters.district) out = out.filter((v) => v.district === filters.district);
    return out;
  },

  // GET /jobs — no single-job endpoint exists, so we fetch the public list and find the match client-side
  // (a minor inefficiency, not worth inventing a new backend route for).
  async vacancy(id: string): Promise<Vacancy> {
    if (USE_MOCKS) {
      const v = db.vacancies.find((v) => v.id === id);
      if (!v) throw { code: "NOT_FOUND", message: "Vacancy not found.", status: 404 };
      return simulate(snapshot(v));
    }
    const { jobs } = await http.get<{ jobs: BackendJob[] }>("/jobs");
    const job = jobs.find((j) => j.id === id);
    if (!job) throw { code: "NOT_FOUND", message: "Vacancy not found.", status: 404 } satisfies ApiError;
    return mapJob(job);
  },

  /**
   * Management list of the school's own postings, all statuses. GET /jobs/schools/:schoolId.
   * The real list endpoint returns a slimmer row than the public `Vacancy` shape — it's mapped
   * into a `Vacancy`-compatible object with sensible defaults for fields the backend doesn't
   * track (positionType/employmentType/description/requirements/subject).
   */
  async vacanciesBySchool(schoolId: string): Promise<Vacancy[]> {
    if (USE_MOCKS) {
      return simulate(
        snapshot(db.vacancies.filter((v) => v.schoolId === schoolId).sort((a, b) => b.postedAt.localeCompare(a.postedAt))),
      );
    }
    const { jobs } = await http.get<{ jobs: RealSchoolJobRow[] }>(`/jobs/schools/${schoolId}`);
    return jobs.map((j) => ({
      id: j.id, schoolId, schoolName: "", district: "",
      title: j.title, positionType: "OTHER", employmentType: "FULL_TIME",
      description: "", requirements: [], deadline: j.deadline,
      status: j.status === "CLOSED" || j.status === "DRAFT" ? "CLOSED" : "OPEN",
      postedAt: j.createdAt, applicantsCount: j.applicantsCount,
    }));
  },

  // POST /jobs/schools/:schoolId | PATCH /jobs/schools/:schoolId/:jobId
  // Real payload: { title, description, requirements?, location?, deadline, status }. There is no
  // position-taxonomy/subject/employment-type/salary-range field on the backend — those are
  // dropped from the request in live mode (VacancyPipelinePage/RecruitmentPage adapt their forms).
  async saveVacancy(input: Omit<Vacancy, "id" | "postedAt" | "applicantsCount" | "status"> & { id?: string; status?: Vacancy["status"] }): Promise<Vacancy> {
    if (USE_MOCKS) {
      if (input.id) {
        const v = db.vacancies.find((v) => v.id === input.id);
        if (!v) throw { code: "NOT_FOUND", message: "Vacancy not found.", status: 404 };
        Object.assign(v, input);
        return simulate(snapshot(v));
      }
      const vacancy: Vacancy = {
        ...input, id: uid("vac"), status: input.status ?? "OPEN", postedAt: nowIso(), applicantsCount: 0,
      };
      db.vacancies.unshift(vacancy);
      return simulate(snapshot(vacancy));
    }
    const body = {
      title: input.title, description: input.description,
      requirements: input.requirements.length ? input.requirements.join("\n") : undefined,
      deadline: input.deadline, status: "PUBLISHED" as const,
    };
    if (input.id) {
      const res = await http.patch<{ job: RealSchoolJobRow }>(`/jobs/schools/${input.schoolId}/${input.id}`, body);
      return { ...input, id: res.job.id, status: "OPEN", postedAt: res.job.createdAt, applicantsCount: res.job.applicantsCount };
    }
    const res = await http.post<{ job: RealSchoolJobRow }>(`/jobs/schools/${input.schoolId}`, body);
    return { ...input, id: res.job.id, status: "OPEN", postedAt: res.job.createdAt, applicantsCount: 0 };
  },

  /** Closes a vacancy. PATCH /jobs/schools/:schoolId/:jobId { status: "CLOSED" } */
  async closeVacancy(schoolId: string, id: string): Promise<Vacancy> {
    if (USE_MOCKS) {
      const v = db.vacancies.find((v) => v.id === id);
      if (!v) throw { code: "NOT_FOUND", message: "Vacancy not found.", status: 404 };
      v.status = "CLOSED";
      return simulate(snapshot(v));
    }
    const res = await http.patch<{ job: RealSchoolJobRow }>(`/jobs/schools/${schoolId}/${id}`, { status: "CLOSED" });
    return {
      id: res.job.id, schoolId, schoolName: "", district: "", title: res.job.title,
      positionType: "OTHER", employmentType: "FULL_TIME", description: "", requirements: [],
      deadline: res.job.deadline, status: "CLOSED", postedAt: res.job.createdAt, applicantsCount: res.job.applicantsCount,
    };
  },

  // GET /jobs/applications/me — the backend scopes this to the authenticated applicant, so `applicantId`
  // is only used for the mock branch (kept for backward-compatible call sites).
  async applicationsByApplicant(applicantId: string): Promise<JobApplication[]> {
    if (USE_MOCKS) {
      return simulate(
        snapshot(
          db.jobApplications.filter((a) => a.applicantId === applicantId).sort((a, b) => b.appliedAt.localeCompare(a.appliedAt)),
        ),
      );
    }
    const { applications } = await http.get<{ applications: BackendApplication[] }>("/jobs/applications/me");
    return applications.map(mapApplication);
  },

  // GET /jobs/schools/:schoolId/:jobId/applications
  async applicationsByVacancy(schoolId: string, vacancyId: string): Promise<JobApplication[]> {
    if (USE_MOCKS) {
      return simulate(
        snapshot(
          db.jobApplications.filter((a) => a.vacancyId === vacancyId).sort((a, b) => b.appliedAt.localeCompare(a.appliedAt)),
        ),
      );
    }
    const { applications } = await http.get<{ applications: RealSchoolApplicantRow[] }>(
      `/jobs/schools/${schoolId}/${vacancyId}/applications`,
    );
    return applications.map(mapSchoolApplicant);
  },

  // POST /jobs/:jobId/applications — multipart with a `cv` file field + `coverLetter` text field.
  async apply(input: {
    vacancyId: string;
    applicantId: string;
    applicantName: string;
    coverLetter: string;
    cvFileName: string;
    /** Real `File` blob for the actual multipart upload — required in live mode, unused in mock mode. */
    cvFile?: File;
  }): Promise<JobApplication> {
    if (USE_MOCKS) {
      const vacancy = db.vacancies.find((v) => v.id === input.vacancyId);
      if (!vacancy) throw { code: "NOT_FOUND", message: "Vacancy not found.", status: 404 };
      if (vacancy.status !== "OPEN") throw { code: "CLOSED", message: "This vacancy is closed.", status: 409 };
      if (db.jobApplications.some((a) => a.vacancyId === input.vacancyId && a.applicantId === input.applicantId)) {
        throw { code: "DUPLICATE", message: "You already applied to this vacancy.", status: 409 };
      }
      const profile = db.applicantProfiles.find((p) => p.userId === input.applicantId);
      const now = nowIso();
      const application: JobApplication = {
        id: uid("japp"), vacancyId: vacancy.id, vacancyTitle: vacancy.title, schoolName: vacancy.schoolName,
        applicantId: input.applicantId, applicantName: input.applicantName,
        applicantHeadline: profile?.headline ?? "", coverLetter: input.coverLetter,
        cvFileName: input.cvFileName, stage: "APPLIED", appliedAt: now,
        timeline: [{ at: now, stage: "APPLIED" }],
      };
      db.jobApplications.unshift(application);
      vacancy.applicantsCount += 1;
      return simulate(snapshot(application), 700);
    }
    const form = new FormData();
    if (input.coverLetter) form.set("coverLetter", input.coverLetter);
    if (input.cvFile) form.set("cv", input.cvFile);
    const { application } = await http.post<{ application: BackendApplication }>(
      `/jobs/${input.vacancyId}/applications`,
      form,
    );
    return mapApplication(application);
  },

  /**
   * Shortlists an applicant with interview details (real model requires them). Notifies the
   * applicant by email. PATCH /jobs/schools/:schoolId/:jobId/applications/:applicationId/shortlist
   */
  async shortlistApplicant(
    schoolId: string,
    vacancyId: string,
    applicationId: string,
    input: { interviewAt: string; interviewLocation: string; message?: string },
  ): Promise<JobApplication> {
    if (USE_MOCKS) return this.moveStage(applicationId, "SHORTLISTED", input.message);
    const res = await http.patch<{ application: RealSchoolApplicantRow }>(
      `/jobs/schools/${schoolId}/${vacancyId}/applications/${applicationId}/shortlist`,
      input,
    );
    return mapSchoolApplicant(res.application);
  },

  /** Rejects an applicant. PATCH /jobs/schools/:schoolId/:jobId/applications/:applicationId/reject */
  async rejectApplicant(schoolId: string, vacancyId: string, applicationId: string, reason?: string): Promise<JobApplication> {
    if (USE_MOCKS) return this.moveStage(applicationId, "REJECTED", reason);
    const res = await http.patch<{ application: RealSchoolApplicantRow }>(
      `/jobs/schools/${schoolId}/${vacancyId}/applications/${applicationId}/reject`,
      { ...(reason ? { reason } : {}) },
    );
    return mapSchoolApplicant(res.application);
  },

  /** Move an applicant through the pipeline; notifies them. POST /api/v1/job-applications/:id/stage */
  async moveStage(id: string, stage: JobApplicationStage, note?: string): Promise<JobApplication> {
    const app = db.jobApplications.find((a) => a.id === id);
    if (!app) throw { code: "NOT_FOUND", message: "Application not found.", status: 404 };
    app.stage = stage;
    app.timeline.push({ at: nowIso(), stage, note });
    const stageText: Record<JobApplicationStage, string> = {
      APPLIED: "was received", SHORTLISTED: "was shortlisted", INTERVIEW: "moved to interview",
      OFFERED: "received an offer", HIRED: "was marked hired — congratulations!", REJECTED: "was not successful this time",
    };
    db.notifications.unshift({
      id: uid("nt"), userId: app.applicantId, type: "RECRUITMENT",
      title: `Application update — ${app.schoolName}`,
      body: `Your application for ${app.vacancyTitle} ${stageText[stage]}.`,
      read: false, createdAt: nowIso(), link: "/applicant/applications",
    });
    return simulate(snapshot(app));
  },

  // No backend equivalent (no `ApplicantProfile` model) — see the block comment above. Stored in
  // `localStorage` only; never sent to the server. In mock mode the seeded in-memory profile is used
  // instead so the demo data stays rich.
  async profile(userId: string): Promise<ApplicantProfile> {
    if (USE_MOCKS) {
      const p = db.applicantProfiles.find((p) => p.userId === userId);
      if (!p) throw { code: "NOT_FOUND", message: "Profile not found.", status: 404 };
      return simulate(snapshot(p));
    }
    return readLocalProfile(userId);
  },

  async updateProfile(userId: string, patch: Partial<ApplicantProfile>): Promise<ApplicantProfile> {
    if (USE_MOCKS) {
      const p = db.applicantProfiles.find((p) => p.userId === userId);
      if (!p) throw { code: "NOT_FOUND", message: "Profile not found.", status: 404 };
      Object.assign(p, patch, { userId });
      return simulate(snapshot(p));
    }
    const merged = { ...readLocalProfile(userId), ...patch, userId };
    writeLocalProfile(merged);
    return merged;
  },
};
