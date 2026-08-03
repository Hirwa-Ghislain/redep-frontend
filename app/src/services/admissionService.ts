import type { AdmissionApplication, AdmissionStatus, BackendApplicationStatus, DocumentRef, Gender, SchoolLevel } from "@/types";
import { db, nowIso, simulate, snapshot } from "@/mocks/db";
import { uid } from "@/lib/utils";
import { http, USE_MOCKS } from "@/lib/api/client";

function pushNotification(userId: string, title: string, body: string, link: string) {
  db.notifications.unshift({
    id: uid("nt"), userId, type: "ADMISSION", title, body, read: false, createdAt: nowIso(), link,
  });
}

/** Fields the real backend accepts for `POST /parents/applications` (multipart, see
 *  `parent.schemas.ts` applicationSchema) — a specific school class, not a generic level, and
 *  the child's most recent annual report/transcript (OCR-validated automatically server-side). */
export interface ApplyInput {
  schoolId: string;
  classId: string;
  parentId: string;
  parentName: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  previousSchool: string;
  annualReport: File;
}

export interface SubmitApplicationResult {
  applicationId: string;
  studentId: string;
  status: BackendApplicationStatus | "SUBMITTED";
  message: string;
  /** Fee charges created for this application — pay these from the Payments page. */
  requiredCharges: { id: string; feeName: string; feeType: string; amountDue: number }[];
}

function backendToFrontendStatus(status: BackendApplicationStatus): AdmissionStatus {
  if (status === "ADMITTED") return "APPROVED";
  if (status === "REJECTED") return "REJECTED";
  return "SUBMITTED"; // DRAFT / VALIDATED / PENDING_PAYMENT — automatic pipeline, no human review states
}

interface BackendApplicationRef {
  id: string;
  status: BackendApplicationStatus;
  submittedAt: string | null;
  admittedAt: string | null;
  schoolId?: string;
  classId?: string;
  school: { id: string; name: string } | null;
  schoolClass: { id: string; name: string } | null;
}

interface BackendChildWithApplications {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  previousSchool: string | null;
  applications: BackendApplicationRef[];
}

function flattenApplications(children: BackendChildWithApplications[], parentId: string, parentName: string): AdmissionApplication[] {
  return children
    .flatMap((child) =>
      child.applications.map((app): AdmissionApplication => ({
        id: app.id,
        schoolId: app.schoolId ?? app.school?.id ?? "",
        schoolName: app.school?.name,
        parentId,
        parentName,
        childFirstName: child.firstName,
        childLastName: child.lastName,
        dateOfBirth: child.dateOfBirth,
        levelApplied: undefined,
        classAppliedId: app.classId ?? app.schoolClass?.id,
        className: app.schoolClass?.name,
        previousSchool: child.previousSchool ?? undefined,
        documents: [],
        status: backendToFrontendStatus(app.status),
        backendStatus: app.status,
        submittedAt: app.submittedAt ?? "",
        admittedAt: app.admittedAt ?? undefined,
        timeline: [],
      })),
    )
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export const admissionService = {
  // GET /parents/children — the real backend has no dedicated "my applications" endpoint;
  // applications are derived by flattening each child's nested `applications[]`.
  async listByParent(parentId: string, parentName = ""): Promise<AdmissionApplication[]> {
    if (USE_MOCKS) {
      return simulate(
        snapshot(
          db.admissions
            .filter((a) => a.parentId === parentId)
            .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
        ),
      );
    }
    const res = await http.get<{ children: BackendChildWithApplications[] }>("/parents/children");
    return flattenApplications(res.children, parentId, parentName);
  },

  // GET /api/v1/schools/:id/applications?status= — school-admin/accountant only, mock-only here.
  async listBySchool(schoolId: string, status?: AdmissionStatus): Promise<AdmissionApplication[]> {
    let out = db.admissions.filter((a) => a.schoolId === schoolId);
    if (status) out = out.filter((a) => a.status === status);
    return simulate(snapshot(out.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))));
  },

  /**
   * Real school-admin admissions view. GET /schools/:schoolId/applications?status=&classId=
   * Read-only — admissions are fully automatic (OCR + payment), there is no approve/reject action.
   */
  async listRealBySchool(schoolId: string, status?: BackendApplicationStatus, classId?: string): Promise<RealApplicationRow[]> {
    if (USE_MOCKS) {
      return this.listBySchool(schoolId).then((apps) =>
        apps.map((a) => ({
          id: a.id,
          status: a.backendStatus ?? "PENDING_PAYMENT",
          studentName: `${a.childFirstName} ${a.childLastName}`,
          classId: a.classAppliedId ?? "",
          className: a.className ?? "",
          extractedGrade: null,
          extractedConduct: null,
          submittedAt: a.submittedAt || null,
          admittedAt: a.admittedAt ?? null,
        })),
      );
    }
    const qs = new URLSearchParams({
      ...(status ? { status } : {}),
      ...(classId ? { classId } : {}),
    }).toString();
    const res = await http.get<{ applications: RealApplicationRow[] }>(`/schools/${schoolId}/applications${qs ? `?${qs}` : ""}`);
    return res.applications;
  },

  // No single-application GET on the real backend — derived the same way as listByParent.
  async get(id: string, parentId = "", parentName = ""): Promise<AdmissionApplication> {
    if (USE_MOCKS) {
      const app = db.admissions.find((a) => a.id === id);
      if (!app) throw { code: "NOT_FOUND", message: "Application not found.", status: 404 };
      return simulate(snapshot(app));
    }
    const all = await this.listByParent(parentId, parentName);
    const found = all.find((a) => a.id === id);
    if (!found) throw { code: "NOT_FOUND", message: "Application not found.", status: 404 };
    return found;
  },

  /**
   * POST /parents/applications (real, multipart) — admissions are fully automatic: the annual
   * report is OCR-validated against the class's admission criteria immediately, and the
   * response says whether the application is ready for payment. There is no manual review step.
   */
  async submit(input: ApplyInput): Promise<SubmitApplicationResult> {
    if (USE_MOCKS) {
      const cls = db.classes.find((c) => c.id === input.classId);
      const now = nowIso();
      const app: AdmissionApplication = {
        id: uid("adm"),
        schoolId: input.schoolId,
        parentId: input.parentId,
        parentName: input.parentName,
        childFirstName: input.firstName,
        childLastName: input.lastName,
        dateOfBirth: input.dateOfBirth,
        levelApplied: cls?.level,
        classAppliedId: input.classId,
        className: cls?.name,
        previousSchool: input.previousSchool || undefined,
        documents: [
          { id: uid("doc"), type: "ACADEMIC_RECORDS", fileName: input.annualReport.name, uploadedAt: now, status: "PENDING" },
        ],
        status: "SUBMITTED",
        submittedAt: now,
        timeline: [{ at: now, status: "SUBMITTED", actor: input.parentName }],
      };
      db.admissions.unshift(app);
      return simulate(
        { applicationId: app.id, studentId: uid("st"), status: "SUBMITTED", message: "Application submitted.", requiredCharges: [] },
        700,
      );
    }
    const form = new FormData();
    form.append("classId", input.classId);
    form.append("firstName", input.firstName);
    form.append("lastName", input.lastName);
    form.append("dateOfBirth", input.dateOfBirth);
    form.append("previousSchool", input.previousSchool);
    form.append("annualReport", input.annualReport);
    const res = await http.post<{
      student: { id: string };
      application: { id: string; status: BackendApplicationStatus };
      requiredCharges: { id: string; amountDue: string | number; fee?: { type: string; name: string } }[];
    }>("/parents/applications", form);
    return {
      applicationId: res.application.id,
      studentId: res.student.id,
      status: res.application.status,
      message: "Annual report validated automatically — pay the required fees to complete admission.",
      requiredCharges: res.requiredCharges.map((c) => ({
        id: c.id,
        feeName: c.fee?.name ?? "Fee",
        feeType: c.fee?.type ?? "OTHER",
        amountDue: Number(c.amountDue),
      })),
    };
  },

  /**
   * School review action. Approving auto-enrolls the child: creates the Student,
   * links it to the parent and decrements the class/school seat counters.
   * POST /api/v1/applications/:id/review — school-admin only, mock-only here (the real backend
   * has no manual review step; see `submit()`).
   */
  async review(input: {
    applicationId: string;
    action: Extract<AdmissionStatus, "UNDER_REVIEW" | "INFO_REQUESTED" | "APPROVED" | "REJECTED" | "WAITLISTED">;
    note?: string;
    actor: string;
    classId?: string; // required when approving
  }): Promise<AdmissionApplication> {
    const app = db.admissions.find((a) => a.id === input.applicationId);
    if (!app) throw { code: "NOT_FOUND", message: "Application not found.", status: 404 };

    app.status = input.action;
    app.timeline.push({ at: nowIso(), status: input.action, note: input.note, actor: input.actor });

    const school = db.schools.find((s) => s.id === app.schoolId);

    if (input.action === "APPROVED") {
      const cls = db.classes.find((c) => c.id === input.classId && c.schoolId === app.schoolId);
      if (!cls) throw { code: "VALIDATION", message: "Select a class to place the student in.", status: 400 };
      if (cls.enrolled >= cls.capacity) throw { code: "CLASS_FULL", message: "That class has no remaining seats.", status: 409 };
      cls.enrolled += 1;
      if (school) school.enrolled += 1;
      db.students.push({
        id: uid("st"), schoolId: app.schoolId, classId: cls.id, parentId: app.parentId,
        firstName: app.childFirstName, lastName: app.childLastName, gender: app.gender,
        dateOfBirth: app.dateOfBirth, status: "ENROLLED", admissionDate: nowIso().slice(0, 10),
      });
    }

    const messages: Record<string, string> = {
      UNDER_REVIEW: `${school?.name ?? "The school"} is reviewing ${app.childFirstName}'s application.`,
      INFO_REQUESTED: `${school?.name ?? "The school"} requested more information for ${app.childFirstName}'s application.`,
      APPROVED: `${app.childFirstName} has been admitted to ${school?.name ?? "the school"}! 🎉`,
      REJECTED: `${school?.name ?? "The school"} was unable to offer ${app.childFirstName} a place.`,
      WAITLISTED: `${app.childFirstName} is on the waitlist at ${school?.name ?? "the school"}.`,
    };
    pushNotification(app.parentId, "Application update", messages[input.action]!, "/parent/applications");

    return simulate(snapshot(app));
  },

  /** Funnel counts for the school dashboard. GET /api/v1/schools/:id/applications/stats — mock-only. */
  async stats(schoolId: string): Promise<Record<AdmissionStatus, number>> {
    const out: Record<AdmissionStatus, number> = {
      SUBMITTED: 0, UNDER_REVIEW: 0, INFO_REQUESTED: 0, APPROVED: 0, REJECTED: 0, WAITLISTED: 0,
    };
    for (const a of db.admissions) if (a.schoolId === schoolId) out[a.status] += 1;
    return simulate(out);
  },
};

// Re-exported so ApplyPage/mock code paths keep working without extra imports.
export type { DocumentRef, Gender, SchoolLevel };

/** Row shape for the school-admin's real (read-only) admissions view. */
export interface RealApplicationRow {
  id: string;
  status: BackendApplicationStatus;
  studentName: string;
  classId: string;
  className: string;
  extractedGrade: number | null;
  extractedConduct: number | null;
  submittedAt: string | null;
  admittedAt: string | null;
}
