import type { Payment, PaymentChannelType, Receipt } from "@/types";
import { API_URL, http } from "@/lib/api/client";
import { useAuthStore } from "@/stores/authStore";

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
    classesByUnpaid: { classId: string; className: string; students: number; assessed: number; paid: number; unpaid: number; collectionRate: number }[];
    classesByPaid: { classId: string; className: string; students: number; assessed: number; paid: number; unpaid: number; collectionRate: number }[];
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
  paymentStatus: "PAID" | "PARTIALLY_PAID" | "UNPAID";
  charges: { id: string; feeId: string; feeName: string; feeType: string; amountDue: number; amountPaid: number; outstanding: number; status: string; installmentCount: number; nextPaymentDue: string | null; partialReason: string | null }[];
}

export interface OptionalFeeParticipation {
  summary: { fee: { id: string; name: string; amount: number; currency: string; isActive: boolean }; totalStudents: number; concerned: number; declined: number; pending: number }[];
  students: { student: { id: string; firstName: string; lastName: string }; class: { id: string; name: string }; fee: { id: string; name: string; amount: number; currency: string }; status: "PENDING" | "CONCERNED" | "DECLINED"; decidedAt: string | null }[];
}
export interface ParentOptionalFee {
  id: string; schoolId: string; schoolName: string; name: string; amount: number; currency: string;
  status: "PENDING" | "CONCERNED" | "DECLINED"; decidedAt: string | null;
}

function query(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") usp.set(k, String(v));
  const s = usp.toString();
  return s ? `?${s}` : "";
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

/** Public receipt-verification result. GET /api/v1/receipts/verify/:reference */
export interface VerifiedReceipt {
  reference: string;
  amount: number;
  currency: string;
  schoolName: string;
  studentName: string;
  feeName: string;
  paidAt: string;
}

export const paymentService = {
  // GET /api/v1/receipts/verify/:reference — public, no auth. Returns null when no COMPLETED
  // payment matches the reference (never an error — "no match" is a normal outcome here).
  async verifyReceipt(reference: string): Promise<VerifiedReceipt | null> {
    const res = await http.get<{ receipt: VerifiedReceipt | null }>(`/receipts/verify/${encodeURIComponent(reference)}`);
    return res.receipt;
  },

  // GET /api/v1/parents/:id/payments — the real backend has no flat payment-history endpoint;
  // derived by flattening each child's charges (only COMPLETED payments are ever returned there).
  async listByParent(parentId: string): Promise<Payment[]> {
    const res = await http.get<{ payments: Array<{
      id: string;
      schoolId: string;
      studentId: string;
      chargeId: string;
      category: "APPLICATION" | "TUITION" | "OTHER";
      amount: number;
      paymentMethod: "MOMO" | "CARD";
      reference: string;
      status: "PENDING" | "COMPLETED" | "FAILED";
      paidAt: string | null;
      createdAt: string;
    }> }>("/parents/payments");
    return res.payments.map((payment) => ({
      id: payment.id,
      schoolId: payment.schoolId,
      studentId: payment.studentId,
      parentId,
      feeStructureId: payment.chargeId,
      category: payment.category,
      amount: payment.amount,
      channelType: paymentMethodToChannel(payment.paymentMethod),
      reference: payment.reference,
      status: payment.status,
      paidAt: payment.paidAt ?? payment.createdAt,
      termId: undefined,
    }));
  },

  // GET /api/v1/parents/:id/receipts?q= — derived the same way as listByParent in real mode
  // (only COMPLETED payments with a receiptNumber count as a receipt).
  async receiptsByParent(parentId: string, q?: string): Promise<Receipt[]> {
    void parentId;
    const suffix = q ? `?q=${encodeURIComponent(q)}` : "";
    const res = await http.get<{ receipts: Receipt[] }>(`/parents/receipts${suffix}`);
    return res.receipts;
  },

  /** Real accounting ledger. GET /schools/:schoolId/accounting/payments */
  async realLedger(schoolId: string, filters: RealAccountingFilters = {}): Promise<{ items: RealPaymentRow[]; total: number }> {
    const res = await http.get<{ items: RealPaymentRow[]; pagination: { total: number } }>(
      `/schools/${schoolId}/accounting/payments${query({ ...filters })}`,
    );
    return { items: res.items, total: res.pagination.total };
  },

  /** Real accounting summary + charts. GET /schools/:schoolId/accounting/overview */
  async realOverview(schoolId: string): Promise<RealAccountingOverview> {
    return http.get<RealAccountingOverview>(`/schools/${schoolId}/accounting/overview`);
  },

  /** GET /schools/:schoolId/accounting/student-balances */
  async realStudentBalances(schoolId: string, filters: { status?: string; classId?: string; search?: string } = {}): Promise<RealStudentBalance[]> {
    const res = await http.get<{ students: RealStudentBalance[] }>(`/schools/${schoolId}/accounting/student-balances${query(filters)}`);
    return res.students;
  },

  async optionalFeeParticipation(schoolId: string, filters: { feeId?: string; classId?: string; status?: string } = {}): Promise<OptionalFeeParticipation> {
    return http.get<OptionalFeeParticipation>(`/schools/${schoolId}/accounting/optional-fees${query(filters)}`);
  },

  async parentOptionalFees(studentId: string): Promise<ParentOptionalFee[]> {
    const res = await http.get<{ fees: ParentOptionalFee[] }>(`/parents/children/${studentId}/optional-fees`);
    return res.fees;
  },

  async chooseOptionalFee(studentId: string, feeId: string, concerned: boolean): Promise<void> {
    await http.patch(`/parents/children/${studentId}/optional-fees/${feeId}`, { concerned });
  },

  /**
   * Charges a student for an active school fee (bills them — does not collect payment).
   * POST /schools/:schoolId/student-charges
   */
  async chargeStudent(schoolId: string, input: { enrollmentId: string; schoolFeeId: string; amount?: number }): Promise<{ id: string }> {
    const res = await http.post<{ charge: { id: string } }>(`/schools/${schoolId}/student-charges`, input);
    return res.charge;
  },

  /**
   * Reconciles a pending payment against a manually-confirmed provider reference
   * (e.g. staff checked the school's mobile money statement). Generates the receipt.
   * POST /schools/:schoolId/accounting/payments/:paymentId/confirm
   */
  async confirmRealPayment(schoolId: string, paymentId: string, providerReference: string, amount: number): Promise<RealPaymentRow> {
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
    const res = await http.get<{ destinations: ChargePaymentDestination[] }>(`/parents/charges/${chargeId}/payment-destinations`);
    return res.destinations;
  },

  /** POST /parents/charges/:studentChargeId/payments — initiates an async XentriPay MoMo/card
   *  collection. Real mode only; mock mode's pay modal uses `pay()` above instead. */
  async initiatePayment(chargeId: string, input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const res = await http.post<{
      payment: { id: string };
      checkout: { checkoutUrl: string | null; instructions: string | null; payerPhone?: string | null; status: string; message: string };
    }>(`/parents/charges/${chargeId}/payments`, input);
    return {
      paymentId: res.payment.id,
      status: "PENDING",
      checkoutUrl: res.checkout.checkoutUrl,
      instructions: res.checkout.instructions,
      payerPhone: res.checkout.payerPhone ?? null,
      message: res.checkout.message,
    };
  },

  /** GET /parents/payments/:id/status — polls XentriPay for the true state of a pending payment. */
  async checkPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
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
  payerPhone: string | null;
  message: string;
}

export interface PaymentStatusResult {
  paymentId: string;
  providerStatus: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
}
