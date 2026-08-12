import type { School, SchoolClass, Student, TeacherProfile } from "@/types";
import { http } from "@/lib/api/client";

/** One fee charge for a student, as returned nested in the real `/parents/children/:id` dashboard. */
export interface StudentChargeSummary {
  id: string;
  feeName: string;
  feeType: "APPLICATION" | "TUITION" | "OTHER";
  currency: string;
  amountDue: number;
  amountPaid: number;
  status: "UNPAID" | "PARTIALLY_PAID" | "PAID";
  installmentCount: number;
  nextPaymentDue: string | null;
}

export interface StudentWithContext extends Student {
  className: string;
  schoolName: string;
  /** Real-backend-only: this child's outstanding balance across all fee charges. */
  outstandingBalance?: number;
  /** Real-backend-only: raw fee charges, used by the Payments page instead of `feeService`
   *  (the real backend has no term-scoped fee-structure/balance concept). */
  charges?: StudentChargeSummary[];
  /** Real-backend-only: the active `StudentEnrollment` id — required for
   *  `POST /parents/enrollments/:id/resignation` (transferService). */
  enrollmentId?: string;
}

/* ------------------------------------------------------------------------ */
/* Real backend shapes (GET /parents/children, GET /parents/children/:id)   */
/* ------------------------------------------------------------------------ */

interface BackendEnrollmentRef {
  id: string;
  status: "ACTIVE" | "RESIGNATION_PENDING" | "RESIGNED";
  schoolId: string;
  classId: string;
  enrolledAt: string;
  resignedAt: string | null;
  school: { id: string; name: string };
  schoolClass: { id: string; name: string };
}

interface BackendChild {
  id: string;
  parentId?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  previousSchool: string | null;
  applications: unknown[];
  enrollments: BackendEnrollmentRef[];
}

interface BackendCharge {
  id: string;
  amountDue: string | number;
  amountPaid: string | number;
  status: "UNPAID" | "PARTIALLY_PAID" | "PAID";
  installmentCount: number;
  nextPaymentDue: string | null;
  schoolFee: { name: string; type: "APPLICATION" | "TUITION" | "OTHER"; currency: string };
}

interface BackendFullSchool {
  id: string;
  name: string;
  district: string;
  sector: string;
  email: string;
  phone: string;
  description: string | null;
  status: "ACTIVE" | "SUSPENDED";
  ownership: "PUBLIC" | "PRIVATE" | "GOVERNMENT_AIDED" | "UNKNOWN";
  boardingType: string | null;
  registrationNumber: string | null;
  communications?: unknown[];
}

interface BackendFullClass {
  id: string;
  name: string;
  capacity: number;
  currentEnrollment: number;
  classTeacherId: string | null;
  courses: { id: string; name: string; teacher: { id: string; firstName: string; lastName: string; email: string; phone: string | null } }[];
}

interface BackendTeacherProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  isClassTeacher: boolean;
  courses: { id: string; name: string }[];
}

interface BackendChildDashboard extends BackendChild {
  charges: BackendCharge[];
  enrollments: (BackendEnrollmentRef & {
    school: BackendFullSchool;
    schoolClass: BackendFullClass;
    teacherProfiles: BackendTeacherProfile[];
  })[];
}

function pickEnrollment<T extends { status: string }>(enrollments: T[]): T | undefined {
  return (
    enrollments.find((e) => e.status === "ACTIVE") ??
    enrollments.find((e) => e.status === "RESIGNATION_PENDING") ??
    enrollments[enrollments.length - 1]
  );
}

function mapChildToStudent(child: BackendChild): StudentWithContext | null {
  const picked = pickEnrollment(child.enrollments);
  // A student with no enrollment yet is still mid-application — it belongs on the
  // Applications page, not "My children" (which promises "appears once admitted").
  if (!picked) return null;
  return {
    id: child.id,
    enrollmentId: picked.id,
    schoolId: picked.schoolId,
    classId: picked.classId,
    parentId: child.parentId ?? "",
    firstName: child.firstName,
    lastName: child.lastName,
    gender: undefined,
    dateOfBirth: child.dateOfBirth,
    status: picked.status === "RESIGNED" ? "FORMER" : "ENROLLED",
    admissionDate: picked.enrolledAt.slice(0, 10),
    leftAt: picked.status === "RESIGNED" && picked.resignedAt ? picked.resignedAt.slice(0, 10) : undefined,
    previousSchool: child.previousSchool ?? undefined,
    className: picked.schoolClass.name,
    schoolName: picked.school.name,
  };
}

function mapFullSchool(raw: BackendFullSchool): School {
  return {
    id: raw.id,
    name: raw.name,
    code: raw.registrationNumber ?? raw.id.slice(0, 8).toUpperCase(),
    type: raw.ownership,
    levels: [],
    district: raw.district,
    sector: raw.sector,
    description: raw.description ?? "",
    foundedYear: 0,
    // Not available from this nested response — see `schoolService.get()` for the full profile.
    capacity: 0,
    enrolled: 0,
    feesRange: { min: 0, max: 0 },
    facilities: [],
    achievements: [],
    photos: [],
    status: raw.status,
    contactEmail: raw.email,
    contactPhone: raw.phone,
    satisfactionScore: undefined,
    boardingAvailable: raw.boardingType !== null && raw.boardingType.toUpperCase() !== "DAY",
  };
}

function mapFullClass(raw: BackendFullClass, schoolId: string): SchoolClass {
  return {
    id: raw.id,
    schoolId,
    name: raw.name,
    level: undefined,
    capacity: raw.capacity,
    enrolled: raw.currentEnrollment,
    homeroomTeacherId: raw.classTeacherId ?? undefined,
  };
}

function mapCharge(c: BackendCharge): StudentChargeSummary {
  return {
    id: c.id,
    feeName: c.schoolFee.name,
    feeType: c.schoolFee.type,
    currency: c.schoolFee.currency,
    amountDue: Number(c.amountDue),
    amountPaid: Number(c.amountPaid),
    status: c.status,
    installmentCount: c.installmentCount,
    nextPaymentDue: c.nextPaymentDue,
  };
}

async function fetchDashboard(studentId: string): Promise<BackendChildDashboard> {
  const res = await http.get<{ student: BackendChildDashboard }>(`/parents/children/${studentId}`);
  return res.student;
}

/** Real-backend attendance summary for one child — `GET /parents/children/:id/attendance`.
 *  There is no gradebook/assessments backend at all, so `ChildDetailPage`'s academics tab uses
 *  this (real attendance) instead of the mock-only `academicService.studentSummary`. */
export interface ParentAttendanceSummary {
  attendanceRate: number; // 0..1
  totals: { PRESENT: number; ABSENT: number; LATE: number; EXCUSED: number };
  recent: Array<{ id: string; date: string; status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; courseName: string }>;
}

export async function fetchParentAttendance(studentId: string): Promise<ParentAttendanceSummary> {
  const res = await http.get<{
    summary: { attendanceRate: number; PRESENT: number; ABSENT: number; LATE: number; EXCUSED: number };
    attendance: Array<{ id: string; attendanceDate: string; status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; course: { name: string } }>;
  }>(`/parents/children/${studentId}/attendance`);
  return {
    attendanceRate: res.summary.attendanceRate / 100,
    totals: { PRESENT: res.summary.PRESENT, ABSENT: res.summary.ABSENT, LATE: res.summary.LATE, EXCUSED: res.summary.EXCUSED },
    recent: res.attendance.slice(0, 15).map((a) => ({ id: a.id, date: a.attendanceDate, status: a.status, courseName: a.course.name })),
  };
}

export const studentService = {
  // GET /parents/children
  async listByParent(parentId: string): Promise<StudentWithContext[]> {
    const res = await http.get<{ children: BackendChild[] }>("/parents/children");
    return res.children.map(mapChildToStudent).filter((s): s is StudentWithContext => s !== null);
  },

  // GET /parents/children/:id (dashboard) — reused for a single child's flat summary.
  async get(id: string): Promise<StudentWithContext> {
    const dashboard = await fetchDashboard(id);
    const mapped = mapChildToStudent(dashboard);
    if (!mapped) throw { code: "NOT_FOUND", message: "Student has no active enrollment yet.", status: 404 };
    const outstandingBalance = dashboard.charges.reduce((sum, c) => sum + Math.max(0, Number(c.amountDue) - Number(c.amountPaid)), 0);
    return { ...mapped, outstandingBalance, charges: dashboard.charges.map(mapCharge) };
  },

  /** School, class and teachers for one child — powers the parent's child page. */
  // GET /parents/children/:id (dashboard)
  async context(id: string): Promise<{ student: StudentWithContext; school: School; schoolClass: SchoolClass | null; teachers: TeacherProfile[] }> {
    const dashboard = await fetchDashboard(id);
    const picked = pickEnrollment(dashboard.enrollments);
    const mapped = mapChildToStudent(dashboard);
    if (!mapped || !picked) throw { code: "NOT_FOUND", message: "Student has no active enrollment yet.", status: 404 };
    const outstandingBalance = dashboard.charges.reduce((sum, c) => sum + Math.max(0, Number(c.amountDue) - Number(c.amountPaid)), 0);
    return {
      student: { ...mapped, outstandingBalance, charges: dashboard.charges.map(mapCharge) },
      school: mapFullSchool(picked.school),
      schoolClass: mapFullClass(picked.schoolClass, picked.schoolId),
      teachers: picked.teacherProfiles.map((t) => ({
        id: t.id,
        schoolId: picked.schoolId,
        name: `${t.firstName} ${t.lastName}`,
        email: t.email,
        phone: t.phone ?? "",
        subjects: t.courses.map((c) => c.name),
        classIds: [picked.classId],
        hiredAt: "",
      })),
    };
  },

  /** Real enrolled/former student directory. GET /schools/:schoolId/students */
  async listRealBySchool(
    schoolId: string,
    opts: { status?: RealStudentRow["status"]; classId?: string; q?: string } = {},
  ): Promise<RealStudentRow[]> {
    const usp = new URLSearchParams();
    if (opts.status) usp.set("status", opts.status);
    if (opts.classId) usp.set("classId", opts.classId);
    if (opts.q) usp.set("q", opts.q);
    const qs = usp.toString();
    const res = await http.get<{ students: RealStudentRow[] }>(`/schools/${schoolId}/students${qs ? `?${qs}` : ""}`);
    return res.students;
  },

  /** Corrects a student's name/date of birth. PATCH /schools/:schoolId/students/:studentId */
  async updateRealStudent(
    schoolId: string,
    studentId: string,
    input: { firstName?: string; lastName?: string; dateOfBirth?: string },
  ): Promise<{ id: string; firstName: string; lastName: string; dateOfBirth: string }> {
    const res = await http.patch<{ student: { id: string; firstName: string; lastName: string; dateOfBirth: string } }>(
      `/schools/${schoolId}/students/${studentId}`,
      input,
    );
    return res.student;
  },
};

/** Row shape for the school-admin real student directory (`listRealBySchool`). */
export interface RealStudentRow {
  enrollmentId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  classId: string;
  className: string;
  status: "ACTIVE" | "RESIGNATION_PENDING" | "RESIGNED";
  enrolledAt: string;
}
