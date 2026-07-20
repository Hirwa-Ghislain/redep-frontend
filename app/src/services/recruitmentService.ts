import type {
  ApplicantProfile,
  EmploymentType,
  JobApplication,
  JobApplicationStage,
  PositionType,
  Vacancy,
} from "@/types";
import { db, nowIso, simulate, snapshot } from "@/mocks/db";
import { uid } from "@/lib/utils";

export interface VacancyFilters {
  q?: string;
  district?: string;
  positionType?: PositionType;
  employmentType?: EmploymentType;
  openOnly?: boolean;
}

export const recruitmentService = {
  // GET /api/v1/vacancies?district=&positionType=&q=
  async vacancies(filters: VacancyFilters = {}): Promise<Vacancy[]> {
    let out = [...db.vacancies];
    if (filters.openOnly !== false) out = out.filter((v) => v.status === "OPEN");
    if (filters.q) {
      const q = filters.q.toLowerCase();
      out = out.filter(
        (v) => v.title.toLowerCase().includes(q) || v.schoolName.toLowerCase().includes(q) || (v.subject ?? "").toLowerCase().includes(q),
      );
    }
    if (filters.district) out = out.filter((v) => v.district === filters.district);
    if (filters.positionType) out = out.filter((v) => v.positionType === filters.positionType);
    if (filters.employmentType) out = out.filter((v) => v.employmentType === filters.employmentType);
    return simulate(snapshot(out.sort((a, b) => b.postedAt.localeCompare(a.postedAt))));
  },

  // GET /api/v1/vacancies/:id
  async vacancy(id: string): Promise<Vacancy> {
    const v = db.vacancies.find((v) => v.id === id);
    if (!v) throw { code: "NOT_FOUND", message: "Vacancy not found.", status: 404 };
    return simulate(snapshot(v));
  },

  // GET /api/v1/schools/:id/vacancies
  async vacanciesBySchool(schoolId: string): Promise<Vacancy[]> {
    return simulate(
      snapshot(db.vacancies.filter((v) => v.schoolId === schoolId).sort((a, b) => b.postedAt.localeCompare(a.postedAt))),
    );
  },

  // POST /api/v1/schools/:id/vacancies | PATCH /api/v1/vacancies/:id
  async saveVacancy(input: Omit<Vacancy, "id" | "postedAt" | "applicantsCount" | "status"> & { id?: string; status?: Vacancy["status"] }): Promise<Vacancy> {
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
  },

  // POST /api/v1/vacancies/:id/close
  async closeVacancy(id: string): Promise<Vacancy> {
    const v = db.vacancies.find((v) => v.id === id);
    if (!v) throw { code: "NOT_FOUND", message: "Vacancy not found.", status: 404 };
    v.status = "CLOSED";
    return simulate(snapshot(v));
  },

  // GET /api/v1/applicants/:id/applications
  async applicationsByApplicant(applicantId: string): Promise<JobApplication[]> {
    return simulate(
      snapshot(
        db.jobApplications.filter((a) => a.applicantId === applicantId).sort((a, b) => b.appliedAt.localeCompare(a.appliedAt)),
      ),
    );
  },

  // GET /api/v1/vacancies/:id/applications
  async applicationsByVacancy(vacancyId: string): Promise<JobApplication[]> {
    return simulate(
      snapshot(
        db.jobApplications.filter((a) => a.vacancyId === vacancyId).sort((a, b) => b.appliedAt.localeCompare(a.appliedAt)),
      ),
    );
  },

  // POST /api/v1/vacancies/:id/apply
  async apply(input: { vacancyId: string; applicantId: string; applicantName: string; coverLetter: string; cvFileName: string }): Promise<JobApplication> {
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

  // GET /api/v1/applicants/:id/profile
  async profile(userId: string): Promise<ApplicantProfile> {
    const p = db.applicantProfiles.find((p) => p.userId === userId);
    if (!p) throw { code: "NOT_FOUND", message: "Profile not found.", status: 404 };
    return simulate(snapshot(p));
  },

  // PUT /api/v1/applicants/:id/profile
  async updateProfile(userId: string, patch: Partial<ApplicantProfile>): Promise<ApplicantProfile> {
    const p = db.applicantProfiles.find((p) => p.userId === userId);
    if (!p) throw { code: "NOT_FOUND", message: "Profile not found.", status: 404 };
    Object.assign(p, patch, { userId });
    return simulate(snapshot(p));
  },
};
