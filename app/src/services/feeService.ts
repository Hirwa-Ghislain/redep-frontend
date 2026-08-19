import { http } from "@/lib/api/client";

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
  isOptional?: boolean;
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
  isOptional?: boolean;
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
  isOptional?: boolean;
}

export const feeService = {
  /**
   * Real school fees. There is no dedicated "list all fees" endpoint on the backend —
   * only the currently-active ones come back embedded in the school's public profile
   * (`GET /schools/:id`). Inactive/historical fees are not listable; the school portal
   * fee list is therefore "active fees", not a full CRUD history.
   */
  async realFees(schoolId: string): Promise<RealSchoolFee[]> {
    const res = await http.get<{ school: { fees: RealSchoolFee[] } }>(`/schools/${schoolId}`);
    return res.school.fees;
  },

  /** POST /schools/:schoolId/fees */
  async addRealFee(schoolId: string, input: RealFeeInput): Promise<RealSchoolFee> {
    const res = await http.post<{ fee: RealSchoolFee }>(`/schools/${schoolId}/fees`, input);
    return res.fee;
  },

  /** PATCH /schools/:schoolId/fees/:feeId */
  async updateRealFee(schoolId: string, feeId: string, input: RealFeeUpdateInput): Promise<RealSchoolFee> {
    const res = await http.patch<{ fee: RealSchoolFee }>(`/schools/${schoolId}/fees/${feeId}`, input);
    return res.fee;
  },
};
