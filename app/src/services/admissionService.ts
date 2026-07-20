import type { AdmissionApplication, AdmissionStatus, DocumentRef, Gender, SchoolLevel } from "@/types";
import { db, nowIso, simulate, snapshot } from "@/mocks/db";
import { uid } from "@/lib/utils";

function pushNotification(userId: string, title: string, body: string, link: string) {
  db.notifications.unshift({
    id: uid("nt"), userId, type: "ADMISSION", title, body, read: false, createdAt: nowIso(), link,
  });
}

export const admissionService = {
  // GET /api/v1/parents/:id/applications
  async listByParent(parentId: string): Promise<AdmissionApplication[]> {
    return simulate(
      snapshot(
        db.admissions
          .filter((a) => a.parentId === parentId)
          .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
      ),
    );
  },

  // GET /api/v1/schools/:id/applications?status=
  async listBySchool(schoolId: string, status?: AdmissionStatus): Promise<AdmissionApplication[]> {
    let out = db.admissions.filter((a) => a.schoolId === schoolId);
    if (status) out = out.filter((a) => a.status === status);
    return simulate(snapshot(out.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))));
  },

  // GET /api/v1/applications/:id
  async get(id: string): Promise<AdmissionApplication> {
    const app = db.admissions.find((a) => a.id === id);
    if (!app) throw { code: "NOT_FOUND", message: "Application not found.", status: 404 };
    return simulate(snapshot(app));
  },

  // POST /api/v1/schools/:id/applications
  async submit(input: {
    schoolId: string;
    parentId: string;
    parentName: string;
    childFirstName: string;
    childLastName: string;
    gender: Gender;
    dateOfBirth: string;
    levelApplied: SchoolLevel;
    previousSchool?: string;
    documents: { type: DocumentRef["type"]; fileName: string }[];
  }): Promise<AdmissionApplication> {
    const now = nowIso();
    const app: AdmissionApplication = {
      ...input,
      id: uid("adm"),
      documents: input.documents.map((d) => ({
        id: uid("doc"), type: d.type, fileName: d.fileName, uploadedAt: now, status: "PENDING",
      })),
      status: "SUBMITTED",
      submittedAt: now,
      timeline: [{ at: now, status: "SUBMITTED", actor: input.parentName }],
    };
    db.admissions.unshift(app);
    return simulate(snapshot(app), 700);
  },

  /**
   * School review action. Approving auto-enrolls the child: creates the Student,
   * links it to the parent and decrements the class/school seat counters.
   * POST /api/v1/applications/:id/review
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

  /** Funnel counts for the school dashboard. GET /api/v1/schools/:id/applications/stats */
  async stats(schoolId: string): Promise<Record<AdmissionStatus, number>> {
    const out: Record<AdmissionStatus, number> = {
      SUBMITTED: 0, UNDER_REVIEW: 0, INFO_REQUESTED: 0, APPROVED: 0, REJECTED: 0, WAITLISTED: 0,
    };
    for (const a of db.admissions) if (a.schoolId === schoolId) out[a.status] += 1;
    return simulate(out);
  },
};
