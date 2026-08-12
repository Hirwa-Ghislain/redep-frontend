import type { AdmissionApplication, AdmissionStatus, BackendApplicationStatus, DocumentRef, Gender, SchoolLevel } from "@/types";
import { http } from "@/lib/api/client";

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
    const res = await http.get<{ children: BackendChildWithApplications[] }>("/parents/children");
    return flattenApplications(res.children, parentId, parentName);
  },

  /**
   * Real school-admin admissions view. GET /schools/:schoolId/applications?status=&classId=
   * Read-only — admissions are fully automatic (OCR + payment), there is no approve/reject action.
   */
  async listRealBySchool(schoolId: string, status?: BackendApplicationStatus, classId?: string): Promise<RealApplicationRow[]> {
    const qs = new URLSearchParams({
      ...(status ? { status } : {}),
      ...(classId ? { classId } : {}),
    }).toString();
    const res = await http.get<{ applications: RealApplicationRow[] }>(`/schools/${schoolId}/applications${qs ? `?${qs}` : ""}`);
    return res.applications;
  },

  // No single-application GET on the real backend — derived the same way as listByParent.
  async get(id: string, parentId = "", parentName = ""): Promise<AdmissionApplication> {
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

};

// Re-exported so ApplyPage keeps working without extra imports.
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
