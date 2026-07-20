import type { SatisfactionSurvey, School, SchoolClass, SchoolLevel, SchoolType } from "@/types";
import { db, nowIso, simulate, snapshot } from "@/mocks/db";
import { uid } from "@/lib/utils";

export interface SchoolFilters {
  q?: string;
  district?: string;
  level?: SchoolLevel;
  type?: SchoolType;
  hasSeats?: boolean;
  boarding?: boolean;
}

export const schoolService = {
  // GET /api/v1/schools?q=&district=&level=&type=&hasSeats=
  async list(filters: SchoolFilters = {}): Promise<School[]> {
    let out = db.schools.filter((s) => s.status === "ACTIVE");
    if (filters.q) {
      const q = filters.q.toLowerCase();
      out = out.filter(
        (s) => s.name.toLowerCase().includes(q) || s.district.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q),
      );
    }
    if (filters.district) out = out.filter((s) => s.district === filters.district);
    if (filters.level) out = out.filter((s) => s.levels.includes(filters.level!));
    if (filters.type) out = out.filter((s) => s.type === filters.type);
    if (filters.hasSeats) out = out.filter((s) => s.capacity - s.enrolled > 0);
    if (filters.boarding) out = out.filter((s) => s.boardingAvailable);
    return simulate(snapshot(out));
  },

  // GET /api/v1/schools/:id
  async get(id: string): Promise<School> {
    const school = db.schools.find((s) => s.id === id);
    if (!school) throw { code: "NOT_FOUND", message: "School not found.", status: 404 };
    return simulate(snapshot(school));
  },

  /** Distinct district list for filters. GET /api/v1/districts */
  async districts(): Promise<string[]> {
    return simulate([...new Set(db.districtStats.map((d) => d.district))].sort());
  },

  // GET /api/v1/schools/:id/classes
  async classes(schoolId: string): Promise<SchoolClass[]> {
    return simulate(snapshot(db.classes.filter((c) => c.schoolId === schoolId)));
  },

  // PUT /api/v1/schools/:id
  async updateProfile(id: string, patch: Partial<School>): Promise<School> {
    const school = db.schools.find((s) => s.id === id);
    if (!school) throw { code: "NOT_FOUND", message: "School not found.", status: 404 };
    Object.assign(school, patch, { id: school.id });
    return simulate(snapshot(school));
  },

  // POST /api/v1/schools/:id/classes  |  PUT /api/v1/classes/:id
  async saveClass(input: Omit<SchoolClass, "id"> & { id?: string }): Promise<SchoolClass> {
    if (input.id) {
      const cls = db.classes.find((c) => c.id === input.id);
      if (!cls) throw { code: "NOT_FOUND", message: "Class not found.", status: 404 };
      Object.assign(cls, input);
      return simulate(snapshot(cls));
    }
    const cls: SchoolClass = { ...input, id: uid("cls") };
    db.classes.push(cls);
    return simulate(snapshot(cls));
  },

  // GET /api/v1/schools/:id/surveys
  async surveys(schoolId: string): Promise<SatisfactionSurvey[]> {
    return simulate(snapshot(db.surveys.filter((s) => s.schoolId === schoolId)));
  },

  // POST /api/v1/schools/:id/surveys
  async submitSurvey(input: { schoolId: string; parentId: string; score: number; comment?: string }): Promise<SatisfactionSurvey> {
    const survey: SatisfactionSurvey = { ...input, id: uid("sv"), submittedAt: nowIso() };
    db.surveys.push(survey);
    return simulate(snapshot(survey));
  },
};
