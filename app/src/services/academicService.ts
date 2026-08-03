import type {
  AcademicTerm,
  Assessment,
  AssessmentType,
  AttendanceRecord,
  AttendanceStatus,
  Gender,
  SchoolClass,
  SchoolLevel,
  Grade,
  Student,
  StudentStatus,
  TeacherProfile,
} from "@/types";
import { db, simulate, snapshot } from "@/mocks/db";
import { uid } from "@/lib/utils";
import { http, USE_MOCKS } from "@/lib/api/client";
import { useAuthStore } from "@/stores/authStore";

export interface StudentAcademicSummary {
  assessments: Array<Assessment & { grade: Grade | null }>;
  attendanceRate: number; // 0..1 across recorded days
  recentAttendance: AttendanceRecord[];
}

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
  // GET /api/v1/terms
  async terms(): Promise<AcademicTerm[]> {
    return simulate(snapshot(db.terms), 100);
  },

  async currentTerm(): Promise<AcademicTerm> {
    return simulate(snapshot(db.terms.find((t) => t.current)!), 100);
  },

  // GET /api/v1/teachers/:id
  // Live: no single "teacher profile" endpoint exists — assembled from the authenticated
  // user (name/email/phone/joined date) plus `/teacher/classes` (subjects taught, derived
  // from the courses assigned by the school admin — there's no separate "subjects" field).
  async teacher(teacherId: string): Promise<TeacherProfile> {
    if (USE_MOCKS) {
      const t = db.teachers.find((t) => t.id === teacherId);
      if (!t) throw { code: "NOT_FOUND", message: "Teacher not found.", status: 404 };
      return simulate(snapshot(t));
    }
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

  // GET /api/v1/schools/:id/teachers
  async teachersBySchool(schoolId: string): Promise<TeacherProfile[]> {
    return simulate(snapshot(db.teachers.filter((t) => t.schoolId === schoolId)));
  },

  // PUT /api/v1/teachers/:id
  // Live: not supported. The backend only lets a teacher edit their own first/last name
  // (`PATCH /auth/me`, see `authService.updateProfile`) — phone/subjects/classes have no
  // teacher-editable equivalent (subjects/classes are assigned by the school admin via
  // `Course`/`SchoolClass`). ProfilePage calls `authService.updateProfile` directly for
  // the name fields and shows everything else read-only in live mode.
  async updateTeacher(id: string, patch: Partial<Pick<TeacherProfile, "subjects" | "classIds" | "phone">>): Promise<TeacherProfile> {
    if (USE_MOCKS) {
      const t = db.teachers.find((t) => t.id === id);
      if (!t) throw { code: "NOT_FOUND", message: "Teacher not found.", status: 404 };
      Object.assign(t, patch);
      return simulate(snapshot(t));
    }
    throw { code: "NOT_SUPPORTED", message: "This isn't editable here — update your name from Settings instead.", status: 400 };
  },

  /** Classes a teacher teaches, with rosters. GET /api/v1/teachers/:id/classes */
  async teacherClasses(teacherId: string): Promise<Array<SchoolClass & { students: Student[] }>> {
    if (USE_MOCKS) {
      const t = db.teachers.find((t) => t.id === teacherId);
      if (!t) throw { code: "NOT_FOUND", message: "Teacher not found.", status: 404 };
      const out = t.classIds
        .map((id) => db.classes.find((c) => c.id === id))
        .filter((c): c is SchoolClass => Boolean(c))
        .map((c) => ({
          ...snapshot(c),
          students: snapshot(db.students.filter((s) => s.classId === c.id && s.status === "ENROLLED")),
        }));
      return simulate(out);
    }
    // Real backend is self-scoped via the auth token — `teacherId` isn't sent.
    return fetchTeacherClassesWithRoster();
  },

  // GET /api/v1/classes/:id/attendance?date=
  // Live: `classId` here is actually the Course id (see `teacherClasses` above); calls
  // `GET /teacher/courses/:courseId/attendance?date=`. Only students with an existing
  // record are returned — AttendancePage already defaults unmarked students to PRESENT.
  async attendance(classId: string, date: string): Promise<AttendanceRecord[]> {
    if (USE_MOCKS) {
      return simulate(snapshot(db.attendance.filter((a) => a.classId === classId && a.date === date)), 200);
    }
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
    if (USE_MOCKS) {
      const saved: AttendanceRecord[] = [];
      for (const entry of input.entries) {
        let record = db.attendance.find(
          (a) => a.classId === input.classId && a.date === input.date && a.studentId === entry.studentId,
        );
        if (record) {
          record.status = entry.status;
          record.markedBy = input.markedBy;
        } else {
          record = {
            id: uid("att"), classId: input.classId, studentId: entry.studentId,
            date: input.date, status: entry.status, markedBy: input.markedBy,
          };
          db.attendance.push(record);
        }
        saved.push(record);
      }
      return simulate(snapshot(saved), 400);
    }
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

  // GET /api/v1/teachers/:id/assessments
  async assessmentsByTeacher(teacherId: string): Promise<Assessment[]> {
    return simulate(
      snapshot(db.assessments.filter((a) => a.teacherId === teacherId).sort((a, b) => b.date.localeCompare(a.date))),
    );
  },

  // POST /api/v1/assessments
  async createAssessment(input: {
    schoolId: string;
    classId: string;
    teacherId: string;
    subject: string;
    title: string;
    type: AssessmentType;
    maxScore: number;
    date: string;
    termId: string;
  }): Promise<Assessment> {
    const assessment: Assessment = { ...input, id: uid("as") };
    db.assessments.push(assessment);
    return simulate(snapshot(assessment));
  },

  /** Gradebook for one assessment: roster + existing grades. */
  async gradebook(assessmentId: string): Promise<{ assessment: Assessment; rows: Array<{ student: Student; grade: Grade | null }> }> {
    const assessment = db.assessments.find((a) => a.id === assessmentId);
    if (!assessment) throw { code: "NOT_FOUND", message: "Assessment not found.", status: 404 };
    const roster = db.students.filter((s) => s.classId === assessment.classId && s.status === "ENROLLED");
    const rows = roster.map((student) => ({
      student: snapshot(student),
      grade: snapshot(db.grades.find((g) => g.assessmentId === assessmentId && g.studentId === student.id) ?? null),
    }));
    return simulate({ assessment: snapshot(assessment), rows });
  },

  // PUT /api/v1/assessments/:id/grades
  async saveGrades(assessmentId: string, entries: { studentId: string; score: number; comment?: string }[]): Promise<void> {
    for (const entry of entries) {
      const existing = db.grades.find((g) => g.assessmentId === assessmentId && g.studentId === entry.studentId);
      if (existing) {
        existing.score = entry.score;
        existing.comment = entry.comment;
      } else {
        db.grades.push({ id: uid("gr"), assessmentId, studentId: entry.studentId, score: entry.score, comment: entry.comment });
      }
    }
    return simulate(undefined, 400);
  },

  /** Everything a parent needs for one child's academics tab. */
  // GET /api/v1/students/:id/academics
  async studentSummary(studentId: string): Promise<StudentAcademicSummary> {
    const student = db.students.find((s) => s.id === studentId);
    if (!student) throw { code: "NOT_FOUND", message: "Student not found.", status: 404 };
    const classAssessments = db.assessments
      .filter((a) => a.classId === student.classId)
      .sort((a, b) => b.date.localeCompare(a.date));
    const assessments = classAssessments.map((a) => ({
      ...snapshot(a),
      grade: snapshot(db.grades.find((g) => g.assessmentId === a.id && g.studentId === studentId) ?? null),
    }));
    const records = db.attendance
      .filter((a) => a.studentId === studentId)
      .sort((a, b) => b.date.localeCompare(a.date));
    const present = records.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
    return simulate({
      assessments,
      attendanceRate: records.length ? present / records.length : 1,
      recentAttendance: snapshot(records.slice(0, 15)),
    });
  },
};
