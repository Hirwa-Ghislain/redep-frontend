/**
 * Single source of truth mapping domain statuses → Badge variants + labels.
 * Use these everywhere so the same status never renders two different ways.
 */
import type { BadgeVariant } from "@/components/ui/Badge";
import type {
  AdmissionStatus,
  AttendanceStatus,
  JobApplicationStage,
  PaymentStatus,
  SchoolStatus,
  StudentStatus,
} from "@/types";

type StatusMeta = { label: string; variant: BadgeVariant };

export const ADMISSION_STATUS: Record<AdmissionStatus, StatusMeta> = {
  SUBMITTED: { label: "Submitted", variant: "info" },
  UNDER_REVIEW: { label: "Under review", variant: "warning" },
  INFO_REQUESTED: { label: "Info requested", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "danger" },
  WAITLISTED: { label: "Waitlisted", variant: "neutral" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, StatusMeta> = {
  COMPLETED: { label: "Completed", variant: "success" },
  PENDING: { label: "Pending", variant: "warning" },
  FAILED: { label: "Failed", variant: "danger" },
};

export const STUDENT_STATUS: Record<StudentStatus, StatusMeta> = {
  ENROLLED: { label: "Enrolled", variant: "success" },
  FORMER: { label: "Former", variant: "neutral" },
  TRANSFERRED: { label: "Transferred", variant: "info" },
};

export const JOB_STAGE: Record<JobApplicationStage, StatusMeta> = {
  APPLIED: { label: "Applied", variant: "info" },
  SHORTLISTED: { label: "Shortlisted", variant: "warning" },
  INTERVIEW: { label: "Interview", variant: "gold" },
  OFFERED: { label: "Offered", variant: "success" },
  HIRED: { label: "Hired", variant: "success" },
  REJECTED: { label: "Not selected", variant: "danger" },
};

export const SCHOOL_STATUS: Record<SchoolStatus, StatusMeta> = {
  ACTIVE: { label: "Active", variant: "success" },
  PENDING: { label: "Pending", variant: "warning" },
  SUSPENDED: { label: "Suspended", variant: "danger" },
};

export const ATTENDANCE_STATUS: Record<AttendanceStatus, StatusMeta> = {
  PRESENT: { label: "Present", variant: "success" },
  ABSENT: { label: "Absent", variant: "danger" },
  LATE: { label: "Late", variant: "warning" },
  EXCUSED: { label: "Excused", variant: "info" },
};

export const TRANSFER_STATUS: Record<"PENDING" | "CONFIRMED" | "REJECTED", StatusMeta> = {
  PENDING: { label: "Pending", variant: "warning" },
  CONFIRMED: { label: "Confirmed", variant: "success" },
  REJECTED: { label: "Rejected", variant: "danger" },
};

export const VACANCY_STATUS: Record<"OPEN" | "CLOSED", StatusMeta> = {
  OPEN: { label: "Open", variant: "success" },
  CLOSED: { label: "Closed", variant: "neutral" },
};

export const STAFF_STATUS: Record<"ACTIVE" | "INVITED" | "SUSPENDED", StatusMeta> = {
  ACTIVE: { label: "Active", variant: "success" },
  INVITED: { label: "Invited", variant: "info" },
  SUSPENDED: { label: "Suspended", variant: "danger" },
};

export const ONBOARDING_STATUS: Record<"PENDING" | "VERIFYING" | "APPROVED" | "REJECTED", StatusMeta> = {
  PENDING: { label: "Pending", variant: "warning" },
  VERIFYING: { label: "Verifying", variant: "info" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "danger" },
};

export const DOC_STATUS: Record<"PENDING" | "VERIFIED" | "REJECTED", StatusMeta> = {
  PENDING: { label: "Pending", variant: "neutral" },
  VERIFIED: { label: "Verified", variant: "success" },
  REJECTED: { label: "Rejected", variant: "danger" },
};

export const FEE_CATEGORY_LABEL: Record<string, string> = {
  TUITION: "Tuition",
  TRANSPORT: "Transport",
  LUNCH: "Lunch",
  UNIFORM: "Uniform",
  EXAMINATION: "Examination",
  APPLICATION: "Application fee",
  OTHER: "Other",
};

export const CHANNEL_LABEL: Record<string, string> = {
  BANK: "Bank",
  MOMO_MTN: "MTN MoMo",
  MOMO_AIRTEL: "Airtel Money",
  MOMO: "Mobile Money",
  CARD: "Card",
};

export const LEVEL_LABEL: Record<string, string> = {
  NURSERY: "Nursery",
  PRIMARY: "Primary",
  O_LEVEL: "O-Level",
  A_LEVEL: "A-Level",
  TVET: "TVET",
};

export const SCHOOL_TYPE_LABEL: Record<string, string> = {
  PUBLIC: "Public",
  PRIVATE: "Private",
  GOVERNMENT_AIDED: "Govt-aided",
  UNKNOWN: "Unspecified",
};

/** Real backend application statuses — automatic pipeline, no manual review. */
export const BACKEND_APPLICATION_STATUS: Record<
  "DRAFT" | "VALIDATED" | "PENDING_PAYMENT" | "ADMITTED" | "REJECTED",
  StatusMeta
> = {
  DRAFT: { label: "Draft", variant: "neutral" },
  VALIDATED: { label: "Documents verified", variant: "info" },
  PENDING_PAYMENT: { label: "Awaiting payment", variant: "warning" },
  ADMITTED: { label: "Admitted", variant: "success" },
  REJECTED: { label: "Rejected", variant: "danger" },
};
