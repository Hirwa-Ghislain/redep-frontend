/**
 * REDEP domain models.
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
  status?: "ACTIVE" | "SUSPENDED";
  createdAt: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/* --------------------------------- schools --------------------------------- */

export type SchoolType = "PUBLIC" | "PRIVATE" | "GOVERNMENT_AIDED";
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
  satisfactionScore: number; // 0..5 aggregate from parent surveys
  boardingAvailable: boolean;
}

export interface SchoolClass {
  id: ID;
  schoolId: ID;
  name: string; // e.g. "P1 A", "S2 B"
  level: SchoolLevel;
  capacity: number;
  enrolled: number;
  homeroomTeacherId?: ID;
}

export interface SchoolOnboardingRequest {
  id: ID;
  schoolName: string;
  type: SchoolType;
  district: string;
  sector: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  message?: string;
  status: "PENDING" | "VERIFYING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  documents: DocumentRef[];
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
  gender: Gender;
  dateOfBirth: string;
  status: StudentStatus;
  admissionDate: string;
  leftAt?: string;
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

export interface AdmissionApplication {
  id: ID;
  schoolId: ID;
  parentId: ID;
  parentName: string;
  childFirstName: string;
  childLastName: string;
  gender: Gender;
  dateOfBirth: string;
  levelApplied: SchoolLevel;
  classAppliedId?: ID;
  previousSchool?: string;
  documents: DocumentRef[];
  status: AdmissionStatus;
  submittedAt: string;
  timeline: AdmissionTimelineEvent[];
}

/* ------------------------------ fees & payments ----------------------------- */

export type FeeCategory =
  | "TUITION"
  | "TRANSPORT"
  | "LUNCH"
  | "UNIFORM"
  | "EXAMINATION"
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

export type PaymentChannelType = "BANK" | "MOMO_MTN" | "MOMO_AIRTEL";

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
  termId: ID;
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
  body: string;
  sentAt: string;
}

export type NotificationType =
  | "ADMISSION"
  | "PAYMENT"
  | "MESSAGE"
  | "ANNOUNCEMENT"
  | "RECRUITMENT"
  | "TRANSFER"
  | "SYSTEM";

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
  teacherGap: number;
  transfersOut: number;
  transfersIn: number;
  satisfaction: number;
}

export interface EnrollmentTrendPoint {
  period: string; // "2026 T1"
  enrolled: number;
  applications: number;
  capacity: number;
}

export interface NationalKpis {
  totalSchools: number;
  activeSchools: number;
  pendingSchools: number;
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  capacityUtilization: number; // 0..1
  openVacancies: number;
  pendingTransfers: number;
  avgSatisfaction: number;
}

/* --------------------------------- audit ----------------------------------- */

export interface AuditLogEntry {
  id: ID;
  actorName: string;
  actorRole: RoleKey;
  action: string;
  target: string;
  detail?: string;
  at: string;
}

/* --------------------------------- surveys --------------------------------- */

export interface SatisfactionSurvey {
  id: ID;
  schoolId: ID;
  parentId: ID;
  score: number; // 1..5
  comment?: string;
  submittedAt: string;
}
