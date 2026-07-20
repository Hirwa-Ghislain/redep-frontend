import type { TransferRequest } from "@/types";
import { db, nowIso, simulate, snapshot } from "@/mocks/db";
import { uid } from "@/lib/utils";

export const transferService = {
  // GET /api/v1/parents/:id/transfers
  async listByParent(parentId: string): Promise<TransferRequest[]> {
    return simulate(
      snapshot(db.transfers.filter((t) => t.parentId === parentId).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))),
    );
  },

  // GET /api/v1/schools/:id/transfers
  async listBySchool(schoolId: string): Promise<TransferRequest[]> {
    return simulate(
      snapshot(db.transfers.filter((t) => t.schoolId === schoolId).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))),
    );
  },

  // POST /api/v1/transfers
  async create(input: {
    studentId: string;
    parentId: string;
    parentName: string;
    type: TransferRequest["type"];
    reason: string;
  }): Promise<TransferRequest> {
    const student = db.students.find((s) => s.id === input.studentId);
    if (!student) throw { code: "NOT_FOUND", message: "Student not found.", status: 404 };
    if (db.transfers.some((t) => t.studentId === input.studentId && t.status === "PENDING")) {
      throw { code: "DUPLICATE", message: "There is already a pending request for this child.", status: 409 };
    }
    const school = db.schools.find((s) => s.id === student.schoolId)!;
    const request: TransferRequest = {
      id: uid("tr"), studentId: student.id, studentName: `${student.firstName} ${student.lastName}`,
      schoolId: school.id, schoolName: school.name, parentId: input.parentId, parentName: input.parentName,
      type: input.type, reason: input.reason, status: "PENDING", requestedAt: nowIso(),
    };
    db.transfers.unshift(request);
    return simulate(snapshot(request));
  },

  /**
   * School resolves a request. Confirming moves the student to Former Students
   * and releases the seat (class + school counters).
   * POST /api/v1/transfers/:id/resolve
   */
  async resolve(id: string, action: "CONFIRMED" | "REJECTED", actor: string): Promise<TransferRequest> {
    const request = db.transfers.find((t) => t.id === id);
    if (!request) throw { code: "NOT_FOUND", message: "Request not found.", status: 404 };
    request.status = action;
    request.resolvedAt = nowIso();

    if (action === "CONFIRMED") {
      const student = db.students.find((s) => s.id === request.studentId);
      if (student && student.status === "ENROLLED") {
        student.status = request.type === "TRANSFER" ? "TRANSFERRED" : "FORMER";
        student.leftAt = nowIso().slice(0, 10);
        const cls = db.classes.find((c) => c.id === student.classId);
        if (cls && cls.enrolled > 0) cls.enrolled -= 1;
        const school = db.schools.find((s) => s.id === student.schoolId);
        if (school && school.enrolled > 0) school.enrolled -= 1;
      }
    }

    db.notifications.unshift({
      id: uid("nt"), userId: request.parentId, type: "TRANSFER",
      title: action === "CONFIRMED" ? "Departure confirmed" : "Transfer request declined",
      body:
        action === "CONFIRMED"
          ? `${request.schoolName} confirmed ${request.studentName}'s departure. Historical records remain available.`
          : `${request.schoolName} declined the request — contact the school office for details.`,
      read: false, createdAt: nowIso(), link: "/parent/transfers",
    });
    db.auditLog.unshift({
      id: uid("aud"), actorName: actor, actorRole: "SCHOOL_ADMIN",
      action: `TRANSFER_${action}`, target: request.studentName, at: nowIso(),
    });
    return simulate(snapshot(request));
  },
};
