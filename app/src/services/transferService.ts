import type { TransferRequest } from "@/types";
import { db, nowIso, simulate, snapshot } from "@/mocks/db";
import { uid } from "@/lib/utils";
import { http, USE_MOCKS } from "@/lib/api/client";
import { studentService } from "@/services/studentService";

/**
 * The real backend has only single-school withdrawal ("resignation"), never cross-school
 * transfer — `POST /parents/enrollments/:id/resignation`. There is no listing endpoint, so
 * history here is derived client-side from each child's enrollment status.
 */
export const transferService = {
  // GET /api/v1/parents/:id/transfers
  async listByParent(parentId: string): Promise<TransferRequest[]> {
    if (USE_MOCKS) {
      return simulate(
        snapshot(db.transfers.filter((t) => t.parentId === parentId).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))),
      );
    }
    const children = await studentService.listByParent(parentId);
    return children
      .filter((c) => c.status === "FORMER" || c.leftAt !== undefined)
      .map((c): TransferRequest => ({
        id: c.enrollmentId ?? c.id,
        studentId: c.id,
        studentName: `${c.firstName} ${c.lastName}`,
        schoolId: c.schoolId,
        schoolName: c.schoolName,
        parentId,
        parentName: "",
        type: "RESIGNATION",
        // Not returned by any real endpoint — no listing/detail API exists for resignations yet.
        reason: "—",
        status: c.status === "FORMER" ? "CONFIRMED" : "PENDING",
        requestedAt: c.leftAt ?? c.admissionDate,
        resolvedAt: c.leftAt,
      }));
  },

  /** School-side resignation list, with the real `resignationId` needed to decide one. GET /schools/:schoolId/resignations */
  async listBySchool(schoolId: string): Promise<TransferRequest[]> {
    if (USE_MOCKS) {
      return simulate(
        snapshot(db.transfers.filter((t) => t.schoolId === schoolId).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))),
      );
    }
    const res = await http.get<{
      resignations: {
        id: string; enrollmentId: string; studentName: string; className: string; reason: string;
        status: "PENDING" | "PAYMENT_REQUIRED" | "APPROVED" | "REJECTED";
        requestedAt: string; decidedAt: string | null;
      }[];
    }>(`/schools/${schoolId}/resignations`);
    const statusMap: Record<string, TransferRequest["status"]> = {
      PENDING: "PENDING", PAYMENT_REQUIRED: "PENDING", APPROVED: "CONFIRMED", REJECTED: "REJECTED",
    };
    return res.resignations.map((r) => ({
      id: r.id, studentId: r.enrollmentId, studentName: r.studentName,
      schoolId, schoolName: "", parentId: "", parentName: "", type: "RESIGNATION",
      reason: r.status === "PAYMENT_REQUIRED" ? `${r.reason} (outstanding fees must be paid first)` : r.reason,
      status: statusMap[r.status] ?? "PENDING",
      requestedAt: r.requestedAt,
      resolvedAt: r.decidedAt ?? undefined,
    }));
  },

  // POST /parents/enrollments/:id/resignation {reason} — real backend only supports withdrawal
  // from the child's current school. A "TRANSFER" request (moving to a different school) has no
  // backend equivalent — parents apply fresh via Discover → Apply instead.
  async create(input: {
    studentId: string;
    enrollmentId?: string;
    parentId: string;
    parentName: string;
    type: TransferRequest["type"];
    reason: string;
  }): Promise<TransferRequest> {
    if (USE_MOCKS) {
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
    }
    if (input.type !== "RESIGNATION" || !input.enrollmentId) {
      throw {
        code: "NOT_SUPPORTED",
        message: "Moving to a different school isn't a transfer here — apply fresh via Discover schools.",
        status: 400,
      };
    }
    const res = await http.post<{ resignation: { id: string; enrollmentId: string; reason: string; status: string; createdAt: string } }>(
      `/parents/enrollments/${input.enrollmentId}/resignation`,
      { reason: input.reason },
    );
    return {
      id: res.resignation.id,
      studentId: input.studentId,
      studentName: "",
      schoolId: "",
      schoolName: "",
      parentId: input.parentId,
      parentName: input.parentName,
      type: "RESIGNATION",
      reason: res.resignation.reason,
      status: "PENDING",
      requestedAt: res.resignation.createdAt,
    };
  },

  /**
   * School resolves a request. Confirming moves the student to Former Students
   * and releases the seat (class + school counters).
   * Live: PATCH /schools/:schoolId/resignations/:resignationId { approve }.
   */
  async resolveReal(schoolId: string, resignationId: string, approve: boolean): Promise<void> {
    await http.patch(`/schools/${schoolId}/resignations/${resignationId}`, { approve });
  },

  // mock-only — see `resolveReal` for the live equivalent.
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
