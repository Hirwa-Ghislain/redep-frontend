import type { RealSchoolTeacher } from "@/services/schoolService";
import { http } from "@/lib/api/client";
import { schoolService } from "@/services/schoolService";

export interface RealInvitationResult {
  role: "TEACHER" | "ACCOUNTANT";
  requestedCount: number;
  invitedCount: number;
  failedCount: number;
  invited: Array<{ id: string; email: string; role: string; expiresAt: string; createdAt: string }>;
  failed: Array<{ email: string; code: string; message: string }>;
}

export const staffService = {
  /**
   * Real staff invitations — the backend only has fixed TEACHER/ACCOUNTANT roles
   * (no custom role catalog). POST /schools/:schoolId/invitations
   */
  async inviteReal(schoolId: string, input: { emails: string[]; role: "TEACHER" | "ACCOUNTANT" }): Promise<RealInvitationResult> {
    return http.post<RealInvitationResult>(`/schools/${schoolId}/invitations`, input);
  },

  /** Real teacher roster (accountants are not separately listed by the backend). GET /schools/:schoolId/teachers */
  async listReal(schoolId: string): Promise<RealSchoolTeacher[]> {
    return schoolService.teachersReal(schoolId);
  },
};
