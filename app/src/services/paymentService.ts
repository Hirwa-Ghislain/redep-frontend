import type { FeeCategory, Payment, PaymentChannelType, Receipt } from "@/types";
import { db, nowIso, simulate, snapshot } from "@/mocks/db";
import { uid } from "@/lib/utils";
import { API_URL, http, USE_MOCKS } from "@/lib/api/client";
import { useAuthStore } from "@/stores/authStore";

let refSeq = 900;

export interface AccountingSummary {
  totalCollected: number;
  totalPending: number;
  countCompleted: number;
  byCategory: { category: FeeCategory; amount: number }[];
  byWeek: { week: string; amount: number }[];
}

/* ------------------------------------------------------------------------ */
/* Real accounting shapes (GET /schools/:id/accounting/*)                    */
/* ------------------------------------------------------------------------ */

export interface RealPaymentRow {
  id: string;
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED";
  paymentMethod: "MOMO" | "CARD";
  providerRef: string | null;
  receiptNumber: string | null;
  paidAt: string | null;
  createdAt: string;
  charge: {
    id: string;
    student: { id: string; firstName: string; lastName: string };
    schoolFee: { name: string; type: string; currency: string };
    enrollment?: { schoolClass: { id: string; name: string } } | null;
    application?: { schoolClass: { id: string; name: string } } | null;
  };
}

export interface RealAccountingFilters {
  search?: string;
  status?: "PENDING" | "COMPLETED" | "FAILED";
  feeType?: "APPLICATION" | "TUITION" | "OTHER";
  classId?: string;
  studentId?: string;
  paymentMethod?: "MOMO" | "CARD";
  page?: number;
  limit?: number;
}

export interface RealAccountingOverview {
  summary: {
    activeStudents: number;
    totalAssessed: number;
    totalSchoolRevenue: number;
    totalUnpaid: number;
    collectionRate: number;
    pendingPayments: number;
    failedPayments: number;
    overdueInstallments: number;
    overdueAmount: number;
  };
  charts: {
    monthlyRevenue: { month: string; revenue: number }[];
    classesByUnpaid: { classId: string; className: string; assessed: number; paid: number; unpaid: number }[];
    feeBreakdown: { feeType: string; feeName: string; assessed: number; paid: number; unpaid: number }[];
    chargeStatus: { status: string; count: number }[];
  };
}

export interface RealStudentBalance {
  student: { id: string; firstName: string; lastName: string };
  class: { id: string; name: string } | null;
  totalDue: number;
  totalPaid: number;
  outstanding: number;
}

function query(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") usp.set(k, String(v));
  const s = usp.toString();
  return s ? `?${s}` : "";
}

function mockLedgerRows(schoolId: string): RealPaymentRow[] {
  return db.payments
    .filter((p) => p.schoolId === schoolId)
    .map((p) => {
      const student = db.students.find((s) => s.id === p.studentId);
      const fee = db.feeStructures.find((f) => f.id === p.feeStructureId);
      return {
        id: p.id, amount: p.amount, status: p.status, paymentMethod: "MOMO" as const,
        providerRef: p.reference, receiptNumber: p.reference, paidAt: p.paidAt, createdAt: p.paidAt,
        charge: {
          id: p.id,
          student: { id: student?.id ?? p.studentId, firstName: student?.firstName ?? "—", lastName: student?.lastName ?? "" },
          schoolFee: { name: fee?.name ?? "Fee", type: fee?.category ?? "OTHER", currency: "RWF" },
        },
      };
    });
}

/** Real backend nested payment shape, as it appears inside a child's `charges[].payments[]`. */
interface BackendPayment {
  id: string;
  amount: string | number;
  status: "PENDING" | "COMPLETED" | "FAILED";
  paymentMethod: "MOMO" | "CARD" | null;
  receiptNumber: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface BackendChargeWithPayments {
  id: string;
  schoolFee: { name: string; type: "APPLICATION" | "TUITION" | "OTHER"; currency: string };
  payments: BackendPayment[];
}

interface BackendChildForPayments {
  id: string;
  firstName: string;
  lastName: string;
  charges: BackendChargeWithPayments[];
  enrollments: { schoolId: string; school: { id: string; name: string } }[];
}

function paymentMethodToChannel(method: "MOMO" | "CARD" | null): PaymentChannelType {
  return method === "CARD" ? "CARD" : "MOMO";
}

/** Flattens every child's charges → payments into a single list, newest first. Used for both
 *  `listByParent` and `receiptsByParent` — the real backend has no dedicated list endpoint for
 *  either, only per-charge/per-payment lookups, so this is the closest honest equivalent. */
async function fetchAllPaymentsForParent(): Promise<Array<{ payment: BackendPayment; charge: BackendChargeWithPayments; child: BackendChildForPayments }>> {
  const res = await http.get<{ children: BackendChildForPayments[] }>("/parents/children");
  const out: Array<{ payment: BackendPayment; charge: BackendChargeWithPayments; child: BackendChildForPayments }> = [];
  for (const child of res.children) {
    for (const charge of child.charges ?? []) {
      for (const payment of charge.payments ?? []) out.push({ payment, charge, child });
    }
  }
  return out.sort((a, b) => (b.payment.paidAt ?? b.payment.createdAt).localeCompare(a.payment.paidAt ?? a.payment.createdAt));
}

export const paymentService = {
  // GET /api/v1/parents/:id/payments — the real backend has no flat payment-history endpoint;
  // derived by flattening each child's charges (only COMPLETED payments are ever returned there).
  async listByParent(parentId: string): Promise<Payment[]> {
    if (USE_MOCKS) {
      return simulate(
        snapshot(db.payments.filter((p) => p.parentId === parentId).sort((a, b) => b.paidAt.localeCompare(a.paidAt))),
      );
    }
    const rows = await fetchAllPaymentsForParent();
    return rows.map(({ payment, charge, child }) => ({
      id: payment.id,
      schoolId: child.enrollments[0]?.schoolId ?? "",
      studentId: child.id,
      parentId,
      feeStructureId: charge.id,
      category: charge.schoolFee.type,
      amount: Number(payment.amount),
      channelType: paymentMethodToChannel(payment.paymentMethod),
      reference: payment.receiptNumber ?? payment.id,
      status: payment.status,
      paidAt: payment.paidAt ?? payment.createdAt,
      termId: undefined,
    }));
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

  // GET /api/v1/parents/:id/receipts?q= — derived the same way as listByParent in real mode
  // (only COMPLETED payments with a receiptNumber count as a receipt).
  async receiptsByParent(parentId: string, q?: string): Promise<Receipt[]> {
    if (USE_MOCKS) {
      const parentPayments = new Set(db.payments.filter((p) => p.parentId === parentId).map((p) => p.id));
      let out = db.receipts.filter((r) => parentPayments.has(r.paymentId));
      if (q) {
        const s = q.toLowerCase();
        out = out.filter(
          (r) => r.reference.toLowerCase().includes(s) || r.studentName.toLowerCase().includes(s) || r.schoolName.toLowerCase().includes(s),
        );
      }
      return simulate(snapshot(out.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))));
    }
    const rows = await fetchAllPaymentsForParent();
    let out: Receipt[] = rows
      .filter(({ payment }) => payment.status === "COMPLETED" && payment.receiptNumber !== null)
      .map(({ payment, charge, child }) => ({
        id: payment.id,
        paymentId: payment.id,
        reference: payment.receiptNumber!,
        schoolId: child.enrollments[0]?.schoolId ?? "",
        schoolName: child.enrollments[0]?.school.name ?? "—",
        studentId: child.id,
        studentName: `${child.firstName} ${child.lastName}`,
        parentName: "",
        amount: Number(payment.amount),
        category: charge.schoolFee.type,
        channelType: paymentMethodToChannel(payment.paymentMethod),
        termLabel: "",
        issuedAt: payment.paidAt ?? payment.createdAt,
      }));
    if (q) {
      const s = q.toLowerCase();
      out = out.filter((r) => r.reference.toLowerCase().includes(s) || r.studentName.toLowerCase().includes(s) || r.schoolName.toLowerCase().includes(s));
    }
    return out;
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

  /** Real accounting ledger. GET /schools/:schoolId/accounting/payments */
  async realLedger(schoolId: string, filters: RealAccountingFilters = {}): Promise<{ items: RealPaymentRow[]; total: number }> {
    if (USE_MOCKS) {
      let rows = mockLedgerRows(schoolId);
      if (filters.status) rows = rows.filter((r) => r.status === filters.status);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        rows = rows.filter(
          (r) => `${r.charge.student.firstName} ${r.charge.student.lastName}`.toLowerCase().includes(q) ||
            (r.providerRef ?? "").toLowerCase().includes(q),
        );
      }
      return simulate({ items: rows, total: rows.length });
    }
    const res = await http.get<{ items: RealPaymentRow[]; pagination: { total: number } }>(
      `/schools/${schoolId}/accounting/payments${query({ ...filters })}`,
    );
    return { items: res.items, total: res.pagination.total };
  },

  /** Real accounting summary + charts. GET /schools/:schoolId/accounting/overview */
  async realOverview(schoolId: string): Promise<RealAccountingOverview> {
    if (USE_MOCKS) {
      const rows = mockLedgerRows(schoolId);
      const completed = rows.filter((r) => r.status === "COMPLETED");
      const totalRevenue = completed.reduce((s, r) => s + r.amount, 0);
      return simulate({
        summary: {
          activeStudents: db.students.filter((s) => s.schoolId === schoolId && s.status === "ENROLLED").length,
          totalAssessed: totalRevenue, totalSchoolRevenue: totalRevenue, totalUnpaid: 0,
          collectionRate: rows.length ? 100 : 0,
          pendingPayments: rows.filter((r) => r.status === "PENDING").length,
          failedPayments: rows.filter((r) => r.status === "FAILED").length,
          overdueInstallments: 0, overdueAmount: 0,
        },
        charts: { monthlyRevenue: [], classesByUnpaid: [], feeBreakdown: [], chargeStatus: [] },
      });
    }
    return http.get<RealAccountingOverview>(`/schools/${schoolId}/accounting/overview`);
  },

  /** GET /schools/:schoolId/accounting/student-balances */
  async realStudentBalances(schoolId: string, filters: { status?: string; classId?: string; search?: string } = {}): Promise<RealStudentBalance[]> {
    if (USE_MOCKS) {
      return simulate(
        db.students.filter((s) => s.schoolId === schoolId && s.status === "ENROLLED").map((s) => ({
          student: { id: s.id, firstName: s.firstName, lastName: s.lastName },
          class: db.classes.find((c) => c.id === s.classId) ? { id: s.classId, name: db.classes.find((c) => c.id === s.classId)!.name } : null,
          totalDue: 0, totalPaid: 0, outstanding: 0,
        })),
      );
    }
    const res = await http.get<{ students: RealStudentBalance[] }>(`/schools/${schoolId}/accounting/student-balances${query(filters)}`);
    return res.students;
  },

  /**
   * Charges a student for an active school fee (bills them — does not collect payment).
   * POST /schools/:schoolId/student-charges
   */
  async chargeStudent(schoolId: string, input: { enrollmentId: string; schoolFeeId: string; amount?: number }): Promise<{ id: string }> {
    if (USE_MOCKS) return simulate({ id: uid("charge") });
    const res = await http.post<{ charge: { id: string } }>(`/schools/${schoolId}/student-charges`, input);
    return res.charge;
  },

  /**
   * Reconciles a pending payment against a manually-confirmed provider reference
   * (e.g. staff checked the school's mobile money statement). Generates the receipt.
   * POST /schools/:schoolId/accounting/payments/:paymentId/confirm
   */
  async confirmRealPayment(schoolId: string, paymentId: string, providerReference: string, amount: number): Promise<RealPaymentRow> {
    if (USE_MOCKS) {
      const rows = mockLedgerRows(schoolId);
      return simulate(rows.find((r) => r.id === paymentId) ?? rows[0]!);
    }
    const res = await http.post<{ payment: RealPaymentRow }>(
      `/schools/${schoolId}/accounting/payments/${paymentId}/confirm`,
      { providerReference, amount },
    );
    return res.payment;
  },

  /** Downloads a payment receipt PDF. GET /schools/:schoolId/accounting/payments/:paymentId/receipt */
  realReceiptUrl(schoolId: string, paymentId: string): string {
    const base = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000/api/v1";
    return `${base}/schools/${schoolId}/accounting/payments/${paymentId}/receipt`;
  },

  /** GET /parents/charges/:studentChargeId/payment-destinations — real mode only. Mock mode
   *  reuses the school's mock payment channels so the pay modal still has something to show. */
  async chargeDestinations(chargeId: string): Promise<ChargePaymentDestination[]> {
    if (USE_MOCKS) {
      return simulate(
        db.paymentChannels.map((c) => ({
          id: c.id, type: c.type, label: c.label, accountNumber: c.accountNumber, phoneNumber: null, isActive: c.active,
        })),
      );
    }
    const res = await http.get<{ destinations: ChargePaymentDestination[] }>(`/parents/charges/${chargeId}/payment-destinations`);
    return res.destinations;
  },

  /** POST /parents/charges/:studentChargeId/payments — initiates an async XentriPay MoMo/card
   *  collection. Real mode only; mock mode's pay modal uses `pay()` above instead. */
  async initiatePayment(chargeId: string, input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    if (USE_MOCKS) {
      return simulate(
        { paymentId: uid("pay"), status: "COMPLETED" as const, checkoutUrl: null, instructions: null, message: "Simulated payment completed." },
        1000,
      );
    }
    const res = await http.post<{
      payment: { id: string };
      checkout: { checkoutUrl: string | null; instructions: string | null; status: string; message: string };
    }>(`/parents/charges/${chargeId}/payments`, input);
    return {
      paymentId: res.payment.id,
      status: "PENDING",
      checkoutUrl: res.checkout.checkoutUrl,
      instructions: res.checkout.instructions,
      message: res.checkout.message,
    };
  },

  /** GET /parents/payments/:id/status — polls XentriPay for the true state of a pending payment. */
  async checkPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    if (USE_MOCKS) return simulate({ paymentId, providerStatus: "SUCCESS", status: "COMPLETED" as const });
    const res = await http.get<{ payment: { status: "PENDING" | "COMPLETED" | "FAILED" }; providerStatus: string }>(
      `/parents/payments/${paymentId}/status`,
    );
    return { paymentId, providerStatus: res.providerStatus, status: res.payment.status };
  },

  /**
   * GET /parents/payments/:id/receipt — binary PDF download. The shared `http` client only
   * handles JSON envelopes, so this mirrors its auth/credentials handling directly and returns
   * a Blob instead.
   */
  async downloadReceiptBlob(paymentId: string): Promise<Blob> {
    if (USE_MOCKS) throw { code: "NOT_SUPPORTED", message: "Receipt PDFs aren't generated in demo mode.", status: 400 };
    const accessToken = useAuthStore.getState().session?.accessToken;
    const res = await fetch(`${API_URL}/parents/payments/${paymentId}/receipt`, {
      credentials: "include",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    if (!res.ok) throw { code: "RECEIPT_NOT_FOUND", message: "Payment receipt not found.", status: res.status };
    return res.blob();
  },
};

/** A parent-facing payment destination for a specific fee charge. */
export interface ChargePaymentDestination {
  id: string;
  type: string;
  label: string;
  accountNumber?: string | null;
  phoneNumber?: string | null;
  isActive: boolean;
}

export interface InitiatePaymentInput {
  paymentMode: "FULL" | "INSTALLMENTS";
  paymentMethod: "MOMO" | "CARD";
  paymentDestinationId: string;
  paymentPhone?: string;
  amount: number;
  partialPaymentReason?: string;
  remainingPaymentDate?: string;
}

export interface InitiatePaymentResult {
  paymentId: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  checkoutUrl: string | null;
  instructions: string | null;
  message: string;
}

export interface PaymentStatusResult {
  paymentId: string;
  providerStatus: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
}
