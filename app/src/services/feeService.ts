import type { FeeBalance, FeeStructure, PaymentChannel } from "@/types";
import { db, simulate, snapshot } from "@/mocks/db";
import { uid } from "@/lib/utils";
import { http, USE_MOCKS } from "@/lib/api/client";

/** Real backend fee shape. `GET /schools/:id` (public/embedded) only returns
 *  id/type/name/amount/currency; the extra management fields only ever come back
 *  from the create/update fee endpoints. */
export interface RealSchoolFee {
  id: string;
  type: "APPLICATION" | "TUITION" | "OTHER";
  name: string;
  amount: number;
  currency: string;
  isActive?: boolean;
  minimumFirstPayment?: number | null;
  restrictedServices?: string[];
  paymentDestinationId?: string | null;
}

export interface RealFeeInput {
  type: "APPLICATION" | "TUITION" | "OTHER";
  name: string;
  amount: number;
  currency?: string;
  minimumFirstPayment?: number;
  restrictedServices?: string[];
  paymentDestinationId?: string;
}

export interface RealFeeUpdateInput {
  type?: "APPLICATION" | "TUITION" | "OTHER";
  name?: string;
  amount?: number;
  currency?: string;
  isActive?: boolean;
  minimumFirstPayment?: number;
  restrictedServices?: string[];
  paymentDestinationId?: string | null;
}

export const feeService = {
  // GET /api/v1/schools/:id/fees?termId=
  async structures(schoolId: string, termId?: string): Promise<FeeStructure[]> {
    let out = db.feeStructures.filter((f) => f.schoolId === schoolId);
    if (termId) out = out.filter((f) => f.termId === termId);
    return simulate(snapshot(out));
  },

  // POST /api/v1/schools/:id/fees | PUT /api/v1/fees/:id
  async save(input: Omit<FeeStructure, "id"> & { id?: string }): Promise<FeeStructure> {
    if (input.id) {
      const fee = db.feeStructures.find((f) => f.id === input.id);
      if (!fee) throw { code: "NOT_FOUND", message: "Fee structure not found.", status: 404 };
      Object.assign(fee, input);
      return simulate(snapshot(fee));
    }
    const fee: FeeStructure = { ...input, id: uid("fee") };
    db.feeStructures.push(fee);
    return simulate(snapshot(fee));
  },

  // DELETE /api/v1/fees/:id
  async remove(id: string): Promise<void> {
    const i = db.feeStructures.findIndex((f) => f.id === id);
    if (i >= 0) db.feeStructures.splice(i, 1);
    return simulate(undefined);
  },

  // GET /api/v1/schools/:id/payment-channels
  async channels(schoolId: string): Promise<PaymentChannel[]> {
    return simulate(snapshot(db.paymentChannels.filter((c) => c.schoolId === schoolId)));
  },

  // POST /api/v1/schools/:id/payment-channels | PATCH /api/v1/payment-channels/:id
  async saveChannel(input: Omit<PaymentChannel, "id"> & { id?: string }): Promise<PaymentChannel> {
    if (input.id) {
      const ch = db.paymentChannels.find((c) => c.id === input.id);
      if (!ch) throw { code: "NOT_FOUND", message: "Channel not found.", status: 404 };
      Object.assign(ch, input);
      return simulate(snapshot(ch));
    }
    const ch: PaymentChannel = { ...input, id: uid("ch") };
    db.paymentChannels.push(ch);
    return simulate(snapshot(ch));
  },

  /**
   * Outstanding balance per applicable fee for one student in the given term.
   * Applicability: mandatory fees for the student's class level (or level-less fees),
   * plus optional fees the family has started paying.
   * GET /api/v1/students/:id/balances?termId=
   */
  async balances(studentId: string, termId: string): Promise<FeeBalance[]> {
    const student = db.students.find((s) => s.id === studentId);
    if (!student) throw { code: "NOT_FOUND", message: "Student not found.", status: 404 };
    const cls = db.classes.find((c) => c.id === student.classId);
    const fees = db.feeStructures.filter(
      (f) => f.schoolId === student.schoolId && f.termId === termId && (!f.level || f.level === cls?.level),
    );
    const out: FeeBalance[] = [];
    for (const fee of fees) {
      const paid = db.payments
        .filter((p) => p.studentId === studentId && p.feeStructureId === fee.id && p.status === "COMPLETED")
        .reduce((sum, p) => sum + p.amount, 0);
      if (fee.optional && paid === 0) continue;
      out.push({
        studentId, feeStructureId: fee.id, feeName: fee.name, category: fee.category,
        billed: fee.amount, paid, due: Math.max(0, fee.amount - paid),
      });
    }
    return simulate(out);
  },

  /**
   * Real school fees. There is no dedicated "list all fees" endpoint on the backend —
   * only the currently-active ones come back embedded in the school's public profile
   * (`GET /schools/:id`). Inactive/historical fees are not listable; the school portal
   * fee list is therefore "active fees", not a full CRUD history.
   */
  async realFees(schoolId: string): Promise<RealSchoolFee[]> {
    if (USE_MOCKS) {
      return simulate(
        db.feeStructures.filter((f) => f.schoolId === schoolId).map((f) => ({
          id: f.id, type: "TUITION" as const, name: f.name, amount: f.amount, currency: "RWF", isActive: true,
          minimumFirstPayment: null, restrictedServices: [], paymentDestinationId: null,
        })),
      );
    }
    const res = await http.get<{ school: { fees: RealSchoolFee[] } }>(`/schools/${schoolId}`);
    return res.school.fees;
  },

  /** POST /schools/:schoolId/fees */
  async addRealFee(schoolId: string, input: RealFeeInput): Promise<RealSchoolFee> {
    if (USE_MOCKS) {
      return simulate({
        id: uid("rfee"), type: input.type, name: input.name, amount: input.amount,
        currency: input.currency ?? "RWF", isActive: true,
        minimumFirstPayment: input.minimumFirstPayment ?? null,
        restrictedServices: input.restrictedServices ?? [],
        paymentDestinationId: input.paymentDestinationId ?? null,
      });
    }
    const res = await http.post<{ fee: RealSchoolFee }>(`/schools/${schoolId}/fees`, input);
    return res.fee;
  },

  /** PATCH /schools/:schoolId/fees/:feeId */
  async updateRealFee(schoolId: string, feeId: string, input: RealFeeUpdateInput): Promise<RealSchoolFee> {
    if (USE_MOCKS) {
      return simulate({
        id: feeId, type: input.type ?? "TUITION", name: input.name ?? "Fee", amount: input.amount ?? 0,
        currency: input.currency ?? "RWF", isActive: input.isActive ?? true,
        minimumFirstPayment: input.minimumFirstPayment ?? null,
        restrictedServices: input.restrictedServices ?? [], paymentDestinationId: input.paymentDestinationId ?? null,
      });
    }
    const res = await http.patch<{ fee: RealSchoolFee }>(`/schools/${schoolId}/fees/${feeId}`, input);
    return res.fee;
  },
};
