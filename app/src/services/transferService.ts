import type { TransferRequest } from "@/types";
import { http } from "@/lib/api/client";
import { studentService } from "@/services/studentService";

/**
 * The real backend has only single-school withdrawal ("resignation"), never cross-school
 * transfer — `POST /parents/enrollments/:id/resignation`. There is no listing endpoint, so
 * history here is derived client-side from each child's enrollment status.
 */
export const transferService = {
  // GET /api/v1/parents/:id/transfers
  async listByParent(parentId: string): Promise<TransferRequest[]> {
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
};
