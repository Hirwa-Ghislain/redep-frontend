/**
 * E-SHURI domain models.
 * These mirror the intended Spring Boot API contracts (see PLAN.md §7).
 */

/* ---------------------------------- shared --------------------------------- */

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export type ID = string;

/* ----------------------------------- auth ---------------------------------- */

export type RoleKey =
  | "SYSTEM_ADMIN"
  | "MINISTRY_ADMIN"
  | "SCHOOL_ADMIN"
  | "SCHOOL_STAFF"
  | "TEACHER"
  | "APPLICANT"
  | "PARENT";

export interface User {
  id: ID;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  roles: RoleKey[];
  /** Flattened permission strings for the active role context. */
  permissions: string[];
  /** For school-scoped users (admin/staff/teacher). */
  schoolId?: ID;
  /** Custom staff role name, when RoleKey is SCHOOL_STAFF. */
  staffRoleName?: string;
  /** Mock-mode accounts are always "ACTIVE"/"SUSPENDED"; live accounts mirror the backend's full lifecycle. */
  status?: "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  createdAt: string;
}

export interface AuthSession {
  user: User;
  /** Short-lived; the refresh token lives in an httpOnly cookie the browser manages. */
  accessToken: string;
}

/** Roles as the E-SHURI backend names them (`prisma.Role`). Used by the admin portal's live-mode
 *  service calls (role filters, ministry-account creation, broadcast audience). */
export type BackendRole =
  | "SUPER_ADMIN"
  | "SCHOOL_ADMIN"
  | "TEACHER"
  | "ACCOUNTANT"
  | "PARENT"
  | "APPLICANT"
  | "EDUCATION_AUTHORITY";

/** Raw shape returned by the backend's `publicUser()` mapper (auth endpoints). */
export interface BackendUser {
  id: ID;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  createdAt: string;
  roles: BackendRole[];
  /** Resolved server-side for SCHOOL_ADMIN/TEACHER/ACCOUNTANT; null otherwise. */
  schoolId: ID | null;
}

/* --------------------------------- schools --------------------------------- */

export type SchoolType = "PUBLIC" | "PRIVATE" | "GOVERNMENT_AIDED" | "UNKNOWN";
export type SchoolLevel = "NURSERY" | "PRIMARY" | "O_LEVEL" | "A_LEVEL" | "TVET";
export type SchoolStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

export interface School {
  id: ID;
  name: string;
  code: string;
  type: SchoolType;
  levels: SchoolLevel[];
  district: string;
  sector: string;
  description: string;
  motto?: string;
  foundedYear: number;
  capacity: number;
  enrolled: number;
  feesRange: { min: number; max: number };
  facilities: string[];
  achievements: string[];
  photos: string[];
  status: SchoolStatus;
  contactEmail: string;
  contactPhone: string;
  /** 0..5 aggregate from parent surveys — undefined on the real backend (no survey system). */
  satisfactionScore?: number;
  boardingAvailable: boolean;
  /** Real-backend-only: classes embedded in `GET /schools/:id` (public profile + admin views). */
  classes?: PublicSchoolClass[];
  /** Real-backend-only: raw per-fee list embedded in `GET /schools/:id` (no term/level/optional
   *  concept there — see `feesRange` for the mock-compatible min/max summary). */
  feeSummaries?: { id: ID; type: "APPLICATION" | "TUITION" | "OTHER"; name: string; amount: number; currency: string }[];
}

/** Class shape as returned by the real backend's public/admin school profile endpoints. */
export interface PublicSchoolClass {
  id: ID;
  name: string;
  capacity: number;
  currentEnrollment: number;
  minimumEntryGrade: number | null;
  minimumConductGrade: number | null;
  availableSpots: number;
  isFull: boolean;
}

export interface SchoolClass {
  id: ID;
  schoolId: ID;
  name: string; // e.g. "P1 A", "S2 B"
  /** Undefined on the real backend — classes there aren't leveled the way mock data is. */
  level?: SchoolLevel;
  capacity: number;
  enrolled: number;
  homeroomTeacherId?: ID;
}

/** GET /admin/schools + PATCH /admin/schools/:id/status — the SUPER_ADMIN's narrow view of a
 *  school; not the same shape as the public `School` (discovery) or `MinistrySchoolRecord`. */
export interface AdminSchoolRecord {
  id: ID;
  name: string;
  status: "ACTIVE" | "SUSPENDED";
  district: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  administrator: { firstName: string; lastName: string; email: string } | null;
}

/* -------------------------------- students --------------------------------- */

export type Gender = "M" | "F";
export type StudentStatus = "ENROLLED" | "FORMER" | "TRANSFERRED";

export interface Student {
  id: ID;
  schoolId: ID;
  classId: ID;
  parentId: ID;
  firstName: string;
  lastName: string;
  /** Undefined on the real backend's parent-facing dashboard mapping (not returned there). */
  gender?: Gender;
  dateOfBirth: string;
  status: StudentStatus;
  admissionDate: string;
  leftAt?: string;
  previousSchool?: string;
}

/* ------------------------------- admissions -------------------------------- */

export type DocumentType =
  | "BIRTH_CERTIFICATE"
  | "ACADEMIC_RECORDS"
  | "PARENT_ID"
  | "CV"
  | "LICENSE"
  | "OTHER";

export interface DocumentRef {
  id: ID;
  type: DocumentType;
  fileName: string;
  uploadedAt: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
}

export type AdmissionStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "INFO_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "WAITLISTED";

export interface AdmissionTimelineEvent {
  at: string;
  status: AdmissionStatus | "NOTE";
  note?: string;
  actor?: string;
}

/** Real backend statuses (`StudentApplicationStatus`) — admissions are fully automatic there
 *  (OCR document validation → payment → auto-admit); no manual review/waitlist queue exists. */
export type BackendApplicationStatus = "DRAFT" | "VALIDATED" | "PENDING_PAYMENT" | "ADMITTED" | "REJECTED";

export interface AdmissionApplication {
  id: ID;
  /** Child linked to this application; used to resume outstanding admission payments. */
  studentId?: ID;
  schoolId: ID;
  schoolName?: string;
  parentId: ID;
  parentName: string;
  childFirstName: string;
  childLastName: string;
  /** Not collected by the real backend. */
  gender?: Gender;
  dateOfBirth: string;
  /** Not modeled by the real backend (classes aren't leveled) — undefined there; see `className`. */
  levelApplied?: SchoolLevel;
  classAppliedId?: ID;
  className?: string;
  previousSchool?: string;
  documents: DocumentRef[];
  status: AdmissionStatus;
  /** Present only in real mode — the true, honest status (automatic pipeline, no human review). */
  backendStatus?: BackendApplicationStatus;
  submittedAt: string;
  admittedAt?: string;
  timeline: AdmissionTimelineEvent[];
}

/* ------------------------------ fees & payments ----------------------------- */

export type FeeCategory =
  | "TUITION"
  | "TRANSPORT"
  | "LUNCH"
  | "UNIFORM"
  | "EXAMINATION"
  | "APPLICATION" // real-backend fee type (one-time admission fee); mock mode never uses this
  | "OTHER";

export interface FeeStructure {
  id: ID;
  schoolId: ID;
  name: string;
  category: FeeCategory;
  amount: number; // RWF
  level?: SchoolLevel; // undefined = all levels
  termId: ID;
  optional: boolean;
}

export type PaymentChannelType = "BANK" | "MOMO_MTN" | "MOMO_AIRTEL" | "MOMO" | "CARD";

export interface PaymentChannel {
  id: ID;
  schoolId: ID;
  type: PaymentChannelType;
  label: string;
  accountNumber: string;
  active: boolean;
}

export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface Payment {
  id: ID;
  schoolId: ID;
  studentId: ID;
  parentId: ID;
  feeStructureId: ID;
  category: FeeCategory;
  amount: number;
  channelType: PaymentChannelType;
  reference: string;
  status: PaymentStatus;
  paidAt: string;
  /** No academic-term concept in the real backend (fees are ongoing) — undefined there. */
  termId?: ID;
  recordedBy?: string; // for offline payments recorded by school staff
}

export interface Receipt {
  id: ID;
  paymentId: ID;
  reference: string;
  schoolId: ID;
  schoolName: string;
  studentId: ID;
  studentName: string;
  parentName: string;
  amount: number;
  category: FeeCategory;
  channelType: PaymentChannelType;
  termLabel: string;
  issuedAt: string;
}

export interface FeeBalance {
  studentId: ID;
  feeStructureId: ID;
  feeName: string;
  category: FeeCategory;
  billed: number;
  paid: number;
  due: number;
}

/* ------------------------------ communication ------------------------------ */

export type AnnouncementCategory =
  | "GENERAL"
  | "MEETING"
  | "CLOSURE"
  | "EMERGENCY"
  | "EVENT"
  | "CIRCULAR";

export interface Announcement {
  id: ID;
  schoolId: ID | null; // null = national (ministry/system)
  title: string;
  body: string;
  category: AnnouncementCategory;
  audience: "ALL" | "PARENTS" | "TEACHERS" | "STAFF" | "SCHOOLS";
  authorName: string;
  publishedAt: string;
  pinned: boolean;
}

export interface ThreadParticipant {
  id: ID;
  name: string;
  role: RoleKey;
}

export interface MessageThread {
  id: ID;
  subject: string;
  schoolId: ID;
  studentId?: ID;
  studentName?: string;
  participants: ThreadParticipant[];
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
}

export interface Message {
  id: ID;
  threadId: ID;
  senderId: ID;
  senderName: string;
  senderRole: RoleKey;
  recipientId: ID;
  recipientName: string;
  body: string;
  sentAt: string;
  readAt?: string | null;
}

export type NotificationType =
  | "ACCOUNT"
  | "ADMISSION"
  | "PAYMENT"
  | "ATTENDANCE"
  | "SCHOOL_COMMUNICATION"
  | "JOB"
  | "INCIDENT";

export interface AppNotification {
  id: ID;
  userId: ID;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

/* -------------------------------- academics -------------------------------- */

export interface AcademicTerm {
  id: ID;
  year: number;
  term: 1 | 2 | 3;
  label: string; // "2026 · Term 2"
  startDate: string;
  endDate: string;
  current: boolean;
}

export interface TeacherProfile {
  id: ID; // == userId
  schoolId: ID;
  name: string;
  email: string;
  phone: string;
  subjects: string[];
  classIds: ID[];
  hiredAt: string;
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export interface AttendanceRecord {
  id: ID;
  classId: ID;
  studentId: ID;
  date: string; // yyyy-MM-dd
  status: AttendanceStatus;
  markedBy: ID;
}

export type AssessmentType = "EXAM" | "TEST" | "QUIZ" | "ASSIGNMENT";

export interface Assessment {
  id: ID;
  schoolId: ID;
  classId: ID;
  teacherId: ID;
  subject: string;
  title: string;
  type: AssessmentType;
  maxScore: number;
  date: string;
  termId: ID;
}

export interface Grade {
  id: ID;
  assessmentId: ID;
  studentId: ID;
  score: number;
  comment?: string;
}

/* -------------------------------- transfers -------------------------------- */

export interface TransferRequest {
  id: ID;
  studentId: ID;
  studentName: string;
  schoolId: ID;
  schoolName: string;
  parentId: ID;
  parentName: string;
  type: "TRANSFER" | "RESIGNATION";
  reason: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  requestedAt: string;
  resolvedAt?: string;
}

/* ------------------------------- recruitment ------------------------------- */

export type PositionType =
  | "TEACHER"
  | "ACCOUNTANT"
  | "ADMINISTRATOR"
  | "LIBRARIAN"
  | "DRIVER"
  | "OTHER";

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT";

export interface Vacancy {
  id: ID;
  schoolId: ID;
  schoolName: string;
  district: string;
  title: string;
  positionType: PositionType;
  subject?: string;
  employmentType: EmploymentType;
  salaryRange?: { min: number; max: number };
  description: string;
  requirements: string[];
  deadline: string;
  status: "OPEN" | "CLOSED";
  postedAt: string;
  applicantsCount: number;
}

export type JobApplicationStage =
  | "APPLIED"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "OFFERED"
  | "HIRED"
  | "REJECTED";

export interface JobApplication {
  id: ID;
  vacancyId: ID;
  vacancyTitle: string;
  schoolName: string;
  applicantId: ID;
  applicantName: string;
  applicantHeadline: string;
  coverLetter: string;
  cvFileName: string;
  stage: JobApplicationStage;
  appliedAt: string;
  timeline: { at: string; stage: JobApplicationStage; note?: string }[];
}

export interface ApplicantExperience {
  title: string;
  organization: string;
  from: string;
  to?: string;
  description?: string;
}

export interface ApplicantEducation {
  qualification: string;
  institution: string;
  year: number;
}

export interface ApplicantProfile {
  userId: ID;
  headline: string;
  bio: string;
  district: string;
  subjects: string[];
  experienceYears: number;
  education: ApplicantEducation[];
  experience: ApplicantExperience[];
  documents: DocumentRef[];
}

/* ----------------------------- staff & roles ------------------------------- */

export interface RoleDefinition {
  id: ID;
  schoolId: ID | null; // null = global (system-admin managed)
  name: string;
  description: string;
  permissions: string[];
  /** Built-in roles cannot be deleted. */
  system: boolean;
}

export interface StaffMember {
  id: ID;
  schoolId: ID;
  userId: ID;
  name: string;
  email: string;
  roleId: ID;
  roleName: string;
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  joinedAt: string;
}

/* ------------------------------ ministry stats ----------------------------- */

export interface DistrictStat {
  district: string;
  schools: number;
  enrolled: number;
  capacity: number;
  /** Real data: count of open job postings in the district (education-authority /staffing),
   *  used as a proxy for teacher shortage — the backend has no direct "gap" metric. */
  teacherGap: number;
  /** No cross-district transfer concept in the real backend — mock-mode only. */
  transfersOut?: number;
  transfersIn?: number;
  /** No satisfaction-survey system in the real backend — mock-mode only. */
  satisfaction?: number;
}

export interface EnrollmentTrendPoint {
  period: string; // "2026 T1" (mock) or "2026-03" (real, from education-authority /enrollment-trends)
  enrolled: number;
  /** Not returned by the real backend's enrollment-trends endpoint — mock-mode only. */
  applications?: number;
  capacity?: number;
}

export interface NationalKpis {
  totalSchools: number;
  activeSchools: number;
  totalStudents: number;
  totalTeachers: number;
  /** No national parent-count metric exposed by the real backend — mock-mode only. */
  totalParents?: number;
  capacityUtilization: number; // 0..1
  openVacancies: number;
  /** No cross-school transfer concept in the real backend — mock-mode only. */
  pendingTransfers?: number;
  /** No satisfaction-survey system in the real backend — mock-mode only. */
  avgSatisfaction?: number;
}

/** GET /education-authority/schools — richer/different shape than the public schools list;
 *  used only by the ministry Schools Registry page. */
export interface MinistrySchoolRecord {
  id: ID;
  name: string;
  registrationNumber: string;
  nesaSchoolId: string | null;
  email: string;
  phone: string;
  status: SchoolStatus;
  governmentVerifiedAt: string | null;
  ownership: "PUBLIC" | "PRIVATE" | "GOVERNMENT_AIDED" | "UNKNOWN";
  hasCambridgeProgram: boolean;
  boardingType: string | null;
  accreditedLevels: string[];
  nesaProfileSyncedAt: string | null;
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  createdAt: string;
  capacity: number;
  students: number;
  availableSpots: number;
  teachers: number;
  accountants: number;
  counts: { classes: number; staff: number; enrollments: number; studentApplications: number };
}

export interface MinistrySchoolsResult {
  schools: MinistrySchoolRecord[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface MinistryStaffingSummary {
  totalOpenVacancies: number;
  byDistrict: { district: string; count: number }[];
  byTitle: { title: string; count: number }[];
}

/** The real backend has no cross-school "transfer" concept — this is single-school
 *  student withdrawal (resignation) data, the honest source behind the ministry's
 *  legacy "transfers" page/route. */
export type ResignationStatus = "PENDING" | "PAYMENT_REQUIRED" | "APPROVED" | "REJECTED";

export interface ResignationRecord {
  id: ID;
  studentName: string;
  schoolName: string;
  district: string;
  status: ResignationStatus;
  requestedAt: string;
  decidedAt: string | null;
}

export interface ResignationSummary {
  items: ResignationRecord[];
  totalsByStatus: Record<ResignationStatus, number>;
}

/* --------------------------------- audit ----------------------------------- */

export interface AuditLogEntry {
  id: ID;
  actorName: string;
  /** Not returned by the real backend's audit endpoint (no role snapshot on `AuditLog`) — mock-mode only. */
  actorRole?: RoleKey;
  /** Real-backend-only — the acting user's email, when available. */
  actorEmail?: string;
  action: string;
  target: string;
  detail?: string;
  at: string;
}

/* --------------------------------- surveys --------------------------------- */

/* -------------------------------- incidents --------------------------------- */

export type IncidentReporterType = "STUDENT" | "PARENT" | "TEACHER" | "STAFF" | "WITNESS" | "ANONYMOUS" | "OTHER";

export type IncidentCategory =
  | "PHYSICAL_VIOLENCE"
  | "SEXUAL_ABUSE"
  | "HARASSMENT"
  | "BULLYING"
  | "DISCRIMINATION"
  | "THEFT"
  | "CORRUPTION"
  | "DRUGS"
  | "WEAPON"
  | "EXAM_MALPRACTICE"
  | "NEGLECT"
  | "UNSAFE_CONDITIONS"
  | "CYBERBULLYING"
  | "OTHER";

export type IncidentSubjectType = "STUDENT" | "TEACHER" | "SCHOOL_ADMIN" | "STAFF" | "PARENT" | "VISITOR" | "UNKNOWN" | "OTHER";

export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** Renamed by backend migration 20260804170000 — TRIAGED/UNDER_INVESTIGATION → REVIEWING,
 *  ACTION_REQUIRED → SCHOOL_RESPONSE_REQUESTED, REFERRED → REFERRED_TO_RELEVANT_AUTHORITY. */
export type IncidentStatus =
  | "SUBMITTED"
  | "REVIEWING"
  | "SCHOOL_RESPONSE_REQUESTED"
  | "REFERRED_TO_RELEVANT_AUTHORITY"
  | "RESOLVED"
  | "CLOSED";

export interface IncidentEvidence {
  id: ID;
  filename: string;
}

export interface Incident {
  id: ID;
  referenceCode: string;
  schoolId: ID;
  schoolName?: string;
  reporterType: IncidentReporterType;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  identityProtected: boolean;
  category: IncidentCategory;
  subjectType: IncidentSubjectType;
  subjectName?: string;
  title: string;
  description: string;
  location?: string;
  occurredAt?: string;
  immediateDanger: boolean;
  severity: IncidentSeverity;
  status: IncidentStatus;
  authorityNotifiedAt?: string;
  schoolAcknowledgedAt?: string;
  resolutionSummary?: string;
  evidence: IncidentEvidence[];
  createdAt: string;
}

export interface IncidentReportInput {
  schoolId: string;
  reporterType: IncidentReporterType;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  identityProtected?: boolean;
  category: IncidentCategory;
  subjectType: IncidentSubjectType;
  subjectName?: string;
  title: string;
  description: string;
  location?: string;
  occurredAt?: string;
  immediateDanger?: boolean;
}
