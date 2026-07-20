import type { School, SchoolClass, Student, StudentStatus, TeacherProfile } from "@/types";
import { db, simulate, snapshot } from "@/mocks/db";

export interface StudentWithContext extends Student {
  className: string;
  schoolName: string;
}

function withContext(s: Student): StudentWithContext {
  const cls = db.classes.find((c) => c.id === s.classId);
  const school = db.schools.find((sc) => sc.id === s.schoolId);
  return { ...snapshot(s), className: cls?.name ?? "—", schoolName: school?.name ?? "—" };
}

export const studentService = {
  // GET /api/v1/schools/:id/students?status=&classId=&q=
  async listBySchool(schoolId: string, opts: { status?: StudentStatus; classId?: string; q?: string } = {}): Promise<StudentWithContext[]> {
    let out = db.students.filter((s) => s.schoolId === schoolId);
    if (opts.status) out = out.filter((s) => s.status === opts.status);
    if (opts.classId) out = out.filter((s) => s.classId === opts.classId);
    if (opts.q) {
      const q = opts.q.toLowerCase();
      out = out.filter((s) => `${s.firstName} ${s.lastName}`.toLowerCase().includes(q));
    }
    return simulate(out.map(withContext));
  },

  // GET /api/v1/parents/:id/children
  async listByParent(parentId: string): Promise<StudentWithContext[]> {
    return simulate(db.students.filter((s) => s.parentId === parentId).map(withContext));
  },

  // GET /api/v1/students/:id
  async get(id: string): Promise<StudentWithContext> {
    const st = db.students.find((s) => s.id === id);
    if (!st) throw { code: "NOT_FOUND", message: "Student not found.", status: 404 };
    return simulate(withContext(st));
  },

  /** School, class and teachers for one child — powers the parent's child page. */
  // GET /api/v1/students/:id/context
  async context(id: string): Promise<{ student: StudentWithContext; school: School; schoolClass: SchoolClass | null; teachers: TeacherProfile[] }> {
    const st = db.students.find((s) => s.id === id);
    if (!st) throw { code: "NOT_FOUND", message: "Student not found.", status: 404 };
    const school = db.schools.find((s) => s.id === st.schoolId)!;
    const schoolClass = db.classes.find((c) => c.id === st.classId) ?? null;
    const teachers = db.teachers.filter((t) => t.classIds.includes(st.classId));
    return simulate({
      student: withContext(st),
      school: snapshot(school),
      schoolClass: schoolClass ? snapshot(schoolClass) : null,
      teachers: snapshot(teachers),
    });
  },

  // PATCH /api/v1/students/:id
  async update(id: string, patch: Partial<Pick<Student, "classId" | "status" | "leftAt">>): Promise<Student> {
    const st = db.students.find((s) => s.id === id);
    if (!st) throw { code: "NOT_FOUND", message: "Student not found.", status: 404 };
    Object.assign(st, patch);
    return simulate(snapshot(st));
  },
};
