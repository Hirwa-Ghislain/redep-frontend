import type { FeeBalance, FeeStructure, PaymentChannel } from "@/types";
import { db, simulate, snapshot } from "@/mocks/db";
import { uid } from "@/lib/utils";

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
};
