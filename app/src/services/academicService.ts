import type {
  AttendanceRecord,
  AttendanceStatus,
  Gender,
  SchoolClass,
  SchoolLevel,
  Student,
  StudentStatus,
  TeacherProfile,
} from "@/types";
import { http } from "@/lib/api/client";
import { useAuthStore } from "@/stores/authStore";

/* ---------------------------------------------------------------------------
 * Backend response shapes for the `teacher` module (E-SHURI-backend
 * src/modules/teacher/*). Verified directly against teacher.controller.ts /
 * teacher.service.ts — kept local since only this file talks to these routes.
 * ------------------------------------------------------------------------- */

interface BackendCourseSummary {
  id: string; // Course.id — used everywhere below as the "class id"
  name: string; // Course.name (subject taught, e.g. "Mathematics")
  class: { id: string; name: string; capacity: number; currentEnrollment: number };
  studentCount: number;
}

interface BackendRosterStudent {
  enrollmentId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

interface BackendAttendanceForDate {
  attendanceDate: string | null;
  students: Array<{
    enrollmentId: string;
    studentId: string;
    firstName: string;
    lastName: string;
    status: AttendanceStatus | null;
    note: string | null;
  }>;
}

interface BackendAttendanceMarkResult {
  id: string;
  courseId: string;
  enrollmentId: string;
  attendanceDate: string;
  status: AttendanceStatus;
  note: string | null;
  markedById: string;
}

/**
 * The backend's `SchoolClass` model has no notion of "level" (NURSERY/PRIMARY/O_LEVEL/
 * A_LEVEL/TVET) — it's inferred here from the Rwandan class-naming convention used
 * throughout the seed data ("N1", "P1 A", "S2 B", "S5 MCB") since there's no real field
 * to read it from. Best-effort only.
 */
function inferLevelFromClassName(className: string): SchoolLevel {
  const prefix = className.trim().charAt(0).toUpperCase();
  if (prefix === "N") return "NURSERY";
  if (prefix === "P") return "PRIMARY";
  if (prefix === "S") {
    const grade = parseInt(className.replace(/\D/g, ""), 10);
    return Number.isFinite(grade) && grade >= 4 ? "A_LEVEL" : "O_LEVEL";
  }
  return "TVET";
}

function toDateOnly(value: string): string {
  return value.length >= 10 ? value.slice(0, 10) : value;
}

async function fetchTeacherClassesWithRoster(): Promise<Array<SchoolClass & { students: Student[] }>> {
  const { classes } = await http.get<{ classes: BackendCourseSummary[] }>("/teacher/classes");
  return Promise.all(
    classes.map(async (course) => {
      const { students } = await http.get<{ students: BackendRosterStudent[] }>(
        `/teacher/courses/${course.id}/roster`,
      );
      return {
        id: course.id,
        schoolId: "",
        name: course.name,
        level: inferLevelFromClassName(course.class.name),
        capacity: course.class.capacity,
        enrolled: course.class.currentEnrollment,
        students: students.map((s) => ({
          // The enrollment id — not the raw student id — is what every downstream call
          // (attendance read/write) needs, so it's used as this Student's `id` here.
          id: s.enrollmentId,
          schoolId: "",
          classId: course.id,
          parentId: "",
          firstName: s.firstName,
          lastName: s.lastName,
          // Not modeled by the backend's `Student` table at all. MyClassesPage no longer
          // renders this field for live data (see the roster table there).
          gender: "M" as Gender,
          dateOfBirth: toDateOnly(s.dateOfBirth),
          status: "ENROLLED" as StudentStatus,
          admissionDate: "",
        })),
      };
    }),
  );
}

export const academicService = {
  // GET /api/v1/teachers/:id
  // Live: no single "teacher profile" endpoint exists — assembled from the authenticated
  // user (name/email/phone/joined date) plus `/teacher/classes` (subjects taught, derived
  // from the courses assigned by the school admin — there's no separate "subjects" field).
  async teacher(teacherId: string): Promise<TeacherProfile> {
    const authUser = useAuthStore.getState().session?.user;
    const { classes } = await http.get<{ classes: BackendCourseSummary[] }>("/teacher/classes");
    return {
      id: teacherId,
      schoolId: authUser?.schoolId ?? "",
      name: authUser ? `${authUser.firstName} ${authUser.lastName}` : "",
      email: authUser?.email ?? "",
      phone: authUser?.phone ?? "",
      subjects: Array.from(new Set(classes.map((c) => c.name))),
      classIds: classes.map((c) => c.id),
      hiredAt: authUser?.createdAt ?? new Date().toISOString(),
    };
  },

  // PUT /api/v1/teachers/:id
  // Live: not supported. The backend only lets a teacher edit their own first/last name
  // (`PATCH /auth/me`, see `authService.updateProfile`) — phone/subjects/classes have no
  // teacher-editable equivalent (subjects/classes are assigned by the school admin via
  // `Course`/`SchoolClass`). ProfilePage calls `authService.updateProfile` directly for
  // the name fields and shows everything else read-only in live mode.
  async updateTeacher(id: string, patch: Partial<Pick<TeacherProfile, "subjects" | "classIds" | "phone">>): Promise<TeacherProfile> {
    throw { code: "NOT_SUPPORTED", message: "This isn't editable here — update your name from Settings instead.", status: 400 };
  },

  /** Classes a teacher teaches, with rosters. GET /api/v1/teachers/:id/classes */
  async teacherClasses(teacherId: string): Promise<Array<SchoolClass & { students: Student[] }>> {
    // Real backend is self-scoped via the auth token — `teacherId` isn't sent.
    return fetchTeacherClassesWithRoster();
  },

  // GET /api/v1/classes/:id/attendance?date=
  // Live: `classId` here is actually the Course id (see `teacherClasses` above); calls
  // `GET /teacher/courses/:courseId/attendance?date=`. Only students with an existing
  // record are returned — AttendancePage already defaults unmarked students to PRESENT.
  async attendance(classId: string, date: string): Promise<AttendanceRecord[]> {
    const data = await http.get<BackendAttendanceForDate>(
      `/teacher/courses/${classId}/attendance?${new URLSearchParams({ date }).toString()}`,
    );
    // Only the owning teacher can reach this endpoint for this course, so any record
    // returned here was necessarily marked by them.
    const markedBy = useAuthStore.getState().session?.user.id ?? "";
    return data.students
      .filter((s) => s.status !== null)
      .map((s) => ({
        id: `${classId}-${s.enrollmentId}-${date}`,
        classId,
        studentId: s.enrollmentId,
        date,
        status: s.status as AttendanceStatus,
        markedBy,
      }));
  },

  /**
   * Bulk upsert one class-day of attendance. POST /api/v1/classes/:id/attendance
   * Live: `PUT /attendance/courses/:courseId` with `{ attendanceDate, records }` where
   * each record is `{ enrollmentId, status, note? }` — `input.entries[].studentId` here
   * is already the enrollment id (see `teacherClasses`/`fetchTeacherClassesWithRoster`).
   */
  async markAttendance(input: {
    classId: string;
    date: string;
    markedBy: string;
    entries: { studentId: string; status: AttendanceStatus }[];
  }): Promise<AttendanceRecord[]> {
    const { attendance } = await http.put<{ attendance: BackendAttendanceMarkResult[] }>(
      `/attendance/courses/${input.classId}`,
      {
        attendanceDate: input.date,
        records: input.entries.map((e) => ({ enrollmentId: e.studentId, status: e.status })),
      },
    );
    return attendance.map((r) => ({
      id: r.id,
      classId: r.courseId,
      studentId: r.enrollmentId,
      date: input.date,
      status: r.status,
      markedBy: r.markedById,
    }));
  },

};
