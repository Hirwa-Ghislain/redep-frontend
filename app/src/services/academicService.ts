import type {
  AcademicTerm,
  Assessment,
  AssessmentType,
  AttendanceRecord,
  AttendanceStatus,
  Grade,
  SchoolClass,
  Student,
  TeacherProfile,
} from "@/types";
import { db, simulate, snapshot } from "@/mocks/db";
import { uid } from "@/lib/utils";

export interface StudentAcademicSummary {
  assessments: Array<Assessment & { grade: Grade | null }>;
  attendanceRate: number; // 0..1 across recorded days
  recentAttendance: AttendanceRecord[];
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
  async teacher(teacherId: string): Promise<TeacherProfile> {
    const t = db.teachers.find((t) => t.id === teacherId);
    if (!t) throw { code: "NOT_FOUND", message: "Teacher not found.", status: 404 };
    return simulate(snapshot(t));
  },

  // GET /api/v1/schools/:id/teachers
  async teachersBySchool(schoolId: string): Promise<TeacherProfile[]> {
    return simulate(snapshot(db.teachers.filter((t) => t.schoolId === schoolId)));
  },

  // PUT /api/v1/teachers/:id
  async updateTeacher(id: string, patch: Partial<Pick<TeacherProfile, "subjects" | "classIds" | "phone">>): Promise<TeacherProfile> {
    const t = db.teachers.find((t) => t.id === id);
    if (!t) throw { code: "NOT_FOUND", message: "Teacher not found.", status: 404 };
    Object.assign(t, patch);
    return simulate(snapshot(t));
  },

  /** Classes a teacher teaches, with rosters. GET /api/v1/teachers/:id/classes */
  async teacherClasses(teacherId: string): Promise<Array<SchoolClass & { students: Student[] }>> {
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
  },

  // GET /api/v1/classes/:id/attendance?date=
  async attendance(classId: string, date: string): Promise<AttendanceRecord[]> {
    return simulate(snapshot(db.attendance.filter((a) => a.classId === classId && a.date === date)), 200);
  },

  /** Bulk upsert one class-day of attendance. POST /api/v1/classes/:id/attendance */
  async markAttendance(input: {
    classId: string;
    date: string;
    markedBy: string;
    entries: { studentId: string; status: AttendanceStatus }[];
  }): Promise<AttendanceRecord[]> {
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
