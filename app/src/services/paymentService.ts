import type { FeeCategory, Payment, PaymentChannelType, Receipt } from "@/types";
import { db, nowIso, simulate, snapshot } from "@/mocks/db";
import { uid } from "@/lib/utils";

let refSeq = 900;

export interface AccountingSummary {
  totalCollected: number;
  totalPending: number;
  countCompleted: number;
  byCategory: { category: FeeCategory; amount: number }[];
  byWeek: { week: string; amount: number }[];
}

export const paymentService = {
  // GET /api/v1/parents/:id/payments
  async listByParent(parentId: string): Promise<Payment[]> {
    return simulate(
      snapshot(db.payments.filter((p) => p.parentId === parentId).sort((a, b) => b.paidAt.localeCompare(a.paidAt))),
    );
  },

  // GET /api/v1/schools/:id/payments?status=&category=&q=
  async listBySchool(
    schoolId: string,
    opts: { status?: Payment["status"]; category?: FeeCategory; q?: string } = {},
  ): Promise<Array<Payment & { studentName: string }>> {
    let out = db.payments.filter((p) => p.schoolId === schoolId);
    if (opts.status) out = out.filter((p) => p.status === opts.status);
    if (opts.category) out = out.filter((p) => p.category === opts.category);
    const withNames = out.map((p) => {
      const st = db.students.find((s) => s.id === p.studentId);
      return { ...snapshot(p), studentName: st ? `${st.firstName} ${st.lastName}` : "—" };
    });
    const filtered = opts.q
      ? withNames.filter(
          (p) =>
            p.studentName.toLowerCase().includes(opts.q!.toLowerCase()) ||
            p.reference.toLowerCase().includes(opts.q!.toLowerCase()),
        )
      : withNames;
    return simulate(filtered.sort((a, b) => b.paidAt.localeCompare(a.paidAt)));
  },

  /**
   * Parent-initiated payment (MoMo/bank — simulated). Creates the payment,
   * issues the receipt, updates both ledgers and notifies the school.
   * POST /api/v1/payments
   */
  async pay(input: {
    studentId: string;
    feeStructureId: string;
    amount: number;
    channelType: PaymentChannelType;
  }): Promise<{ payment: Payment; receipt: Receipt }> {
    const student = db.students.find((s) => s.id === input.studentId);
    const fee = db.feeStructures.find((f) => f.id === input.feeStructureId);
    if (!student || !fee) throw { code: "NOT_FOUND", message: "Student or fee not found.", status: 404 };
    const school = db.schools.find((s) => s.id === student.schoolId)!;
    const parent = db.users.find((u) => u.id === student.parentId);
    const term = db.terms.find((t) => t.id === fee.termId)!;

    refSeq += 1;
    const reference = `RDP-${260_000 + refSeq}`;
    const now = nowIso();
    const payment: Payment = {
      id: uid("pay"), schoolId: student.schoolId, studentId: student.id, parentId: student.parentId,
      feeStructureId: fee.id, category: fee.category, amount: input.amount,
      channelType: input.channelType, reference, status: "COMPLETED", paidAt: now, termId: fee.termId,
    };
    const receipt: Receipt = {
      id: uid("rcp"), paymentId: payment.id, reference,
      schoolId: school.id, schoolName: school.name,
      studentId: student.id, studentName: `${student.firstName} ${student.lastName}`,
      parentName: parent ? `${parent.firstName} ${parent.lastName}` : "Parent",
      amount: input.amount, category: fee.category, channelType: input.channelType,
      termLabel: term.label, issuedAt: now,
    };
    db.payments.unshift(payment);
    db.receipts.unshift(receipt);
    db.notifications.unshift({
      id: uid("nt"), userId: student.parentId, type: "PAYMENT",
      title: "Payment confirmed",
      body: `${receipt.studentName} — ${fee.name}: receipt ${reference} issued.`,
      read: false, createdAt: now, link: "/parent/receipts",
    });
    // Simulated gateway latency
    return simulate({ payment: snapshot(payment), receipt: snapshot(receipt) }, 1400);
  },

  /** Staff-recorded offline payment (cash/bank slip). POST /api/v1/schools/:id/payments/record */
  async recordOffline(input: {
    studentId: string;
    feeStructureId: string;
    amount: number;
    channelType: PaymentChannelType;
    recordedBy: string;
  }): Promise<Payment> {
    const { payment } = await this.pay(input);
    const stored = db.payments.find((p) => p.id === payment.id)!;
    stored.recordedBy = input.recordedBy;
    return snapshot(stored);
  },

  // GET /api/v1/parents/:id/receipts?q=
  async receiptsByParent(parentId: string, q?: string): Promise<Receipt[]> {
    const parentPayments = new Set(db.payments.filter((p) => p.parentId === parentId).map((p) => p.id));
    let out = db.receipts.filter((r) => parentPayments.has(r.paymentId));
    if (q) {
      const s = q.toLowerCase();
      out = out.filter(
        (r) => r.reference.toLowerCase().includes(s) || r.studentName.toLowerCase().includes(s) || r.schoolName.toLowerCase().includes(s),
      );
    }
    return simulate(snapshot(out.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))));
  },

  // GET /api/v1/schools/:id/receipts?q=
  async receiptsBySchool(schoolId: string, q?: string): Promise<Receipt[]> {
    let out = db.receipts.filter((r) => r.schoolId === schoolId);
    if (q) {
      const s = q.toLowerCase();
      out = out.filter((r) => r.reference.toLowerCase().includes(s) || r.studentName.toLowerCase().includes(s));
    }
    return simulate(snapshot(out.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))));
  },

  /** Public receipt verification by reference code. GET /api/v1/receipts/verify/:reference */
  async verifyReceipt(reference: string): Promise<Receipt | null> {
    const r = db.receipts.find((r) => r.reference.toLowerCase() === reference.trim().toLowerCase());
    return simulate(r ? snapshot(r) : null);
  },

  // GET /api/v1/schools/:id/accounting/summary?termId=
  async accountingSummary(schoolId: string, termId?: string): Promise<AccountingSummary> {
    let payments = db.payments.filter((p) => p.schoolId === schoolId);
    if (termId) payments = payments.filter((p) => p.termId === termId);
    const completed = payments.filter((p) => p.status === "COMPLETED");
    const byCategoryMap = new Map<FeeCategory, number>();
    for (const p of completed) byCategoryMap.set(p.category, (byCategoryMap.get(p.category) ?? 0) + p.amount);

    // Weekly collection buckets for the last 8 weeks
    const byWeek: { week: string; amount: number }[] = [];
    const now = Date.now();
    for (let w = 7; w >= 0; w--) {
      const start = now - (w + 1) * 7 * 86_400_000;
      const end = now - w * 7 * 86_400_000;
      const amount = completed
        .filter((p) => { const t = new Date(p.paidAt).getTime(); return t >= start && t < end; })
        .reduce((sum, p) => sum + p.amount, 0);
      const label = new Date(end).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      byWeek.push({ week: label, amount });
    }

    return simulate({
      totalCollected: completed.reduce((s, p) => s + p.amount, 0),
      totalPending: payments.filter((p) => p.status === "PENDING").reduce((s, p) => s + p.amount, 0),
      countCompleted: completed.length,
      byCategory: [...byCategoryMap.entries()]
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount),
      byWeek,
    });
  },
};
