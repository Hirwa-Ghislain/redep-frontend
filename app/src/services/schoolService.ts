import type { PublicSchoolClass, SatisfactionSurvey, School, SchoolClass, SchoolLevel, SchoolType } from "@/types";
import { db, nowIso, simulate, snapshot } from "@/mocks/db";
import { uid } from "@/lib/utils";
import { API_URL, http, USE_MOCKS } from "@/lib/api/client";

/** A NESA location record (province/district/sector/cell/village), as returned by GET /locations/*. */
export interface NesaLocationOption {
  id: string;
  locationCode: string;
  locationType: "PROVINCE" | "DISTRICT" | "SECTOR" | "CELL" | "VILLAGE";
  locationName: string;
}

export interface SchoolFilters {
  q?: string;
  district?: string;
  level?: SchoolLevel;
  type?: SchoolType;
  hasSeats?: boolean;
  boarding?: boolean;
}

/** Static assets (`SchoolImage.path`, …) are served from the API's origin under `/uploads/...`,
 *  not under the `/api/v1` prefix used for JSON endpoints. */
const API_ORIGIN = API_URL.replace(/\/api\/v1\/?$/, "");
const assetUrl = (path: string) => (path.startsWith("http") ? path : `${API_ORIGIN}${path}`);

/** Backend `accreditedLevels` is a free-text NESA combination list, not the frontend's
 *  5-value enum — this is a best-effort keyword guess, not an exact mapping. */
function guessLevels(accreditedLevels: unknown): SchoolLevel[] {
  const text = JSON.stringify(accreditedLevels ?? []).toUpperCase();
  const out: SchoolLevel[] = [];
  if (text.includes("NURSERY") || text.includes("PRE-PRIMARY") || text.includes("PRE PRIMARY")) out.push("NURSERY");
  if (text.includes("PRIMARY")) out.push("PRIMARY");
  if (text.includes("ORDINARY") || /\bO-?LEVEL\b/.test(text) || text.includes("O LEVEL")) out.push("O_LEVEL");
  if (text.includes("ADVANCED") || /\bA-?LEVEL\b/.test(text) || text.includes("A LEVEL")) out.push("A_LEVEL");
  if (text.includes("TVET") || text.includes("TECHNICAL") || text.includes("VOCATIONAL")) out.push("TVET");
  return [...new Set(out)];
}

interface BackendPublicClass {
  id: string;
  name: string;
  capacity: number;
  currentEnrollment: number;
  minimumEntryGrade: string | number | null;
  minimumConductGrade: string | number | null;
  availableSpots: number;
  isFull: boolean;
}

interface BackendPublicSchool {
  id: string;
  name: string;
  registrationNumber: string | null;
  email: string;
  phone: string;
  district: string;
  sector: string;
  description: string | null;
  status: "ACTIVE" | "SUSPENDED";
  ownership: "PUBLIC" | "PRIVATE" | "GOVERNMENT_AIDED" | "UNKNOWN";
  boardingType: string | null;
  accreditedLevels: unknown;
  governmentVerifiedAt?: string;
  images: { id: string; path: string }[];
  achievements: { id: string; title: string; description: string | null; proofPath: string | null; achievedAt: string | null }[];
  fees: { id: string; type: string; name: string; amount: number; currency: string }[];
  classes: BackendPublicClass[];
}

function mapBackendClass(c: BackendPublicClass): PublicSchoolClass {
  return {
    id: c.id,
    name: c.name,
    capacity: c.capacity,
    currentEnrollment: c.currentEnrollment,
    minimumEntryGrade: c.minimumEntryGrade === null ? null : Number(c.minimumEntryGrade),
    minimumConductGrade: c.minimumConductGrade === null ? null : Number(c.minimumConductGrade),
    availableSpots: c.availableSpots,
    isFull: c.isFull,
  };
}

function mapBackendSchool(raw: BackendPublicSchool): School {
  const classes = (raw.classes ?? []).map(mapBackendClass);
  const capacity = classes.reduce((sum, c) => sum + c.capacity, 0);
  const enrolled = classes.reduce((sum, c) => sum + c.currentEnrollment, 0);
  const amounts = (raw.fees ?? []).map((f) => Number(f.amount));
  return {
    id: raw.id,
    name: raw.name,
    code: raw.registrationNumber ?? raw.id.slice(0, 8).toUpperCase(),
    type: raw.ownership,
    levels: guessLevels(raw.accreditedLevels),
    district: raw.district,
    sector: raw.sector,
    description: raw.description ?? "",
    foundedYear: raw.governmentVerifiedAt ? new Date(raw.governmentVerifiedAt).getFullYear() : 0,
    capacity,
    enrolled,
    feesRange: amounts.length ? { min: Math.min(...amounts), max: Math.max(...amounts) } : { min: 0, max: 0 },
    // Not modeled by the real backend — no facilities catalog.
    facilities: [],
    achievements: (raw.achievements ?? []).map((a) => a.title),
    photos: (raw.images ?? []).map((i) => assetUrl(i.path)),
    status: raw.status,
    contactEmail: raw.email,
    contactPhone: raw.phone,
    // No survey system in the real backend — left undefined, never fabricated.
    satisfactionScore: undefined,
    boardingAvailable: raw.boardingType !== null && raw.boardingType.toUpperCase() !== "DAY",
    classes,
    feeSummaries: (raw.fees ?? []).map((f) => ({
      id: f.id,
      type: (f.type === "APPLICATION" || f.type === "TUITION" ? f.type : "OTHER") as "APPLICATION" | "TUITION" | "OTHER",
      name: f.name,
      amount: Number(f.amount),
      currency: f.currency,
    })),
  };
}

export const schoolService = {
  // GET /api/v1/schools?district=&search=
  async list(filters: SchoolFilters = {}): Promise<School[]> {
    if (USE_MOCKS) {
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
    }
    const qs = new URLSearchParams({
      ...(filters.district ? { district: filters.district } : {}),
      ...(filters.q ? { search: filters.q } : {}),
    }).toString();
    const res = await http.get<{ schools: BackendPublicSchool[] }>(`/schools${qs ? `?${qs}` : ""}`);
    let out = res.schools.map(mapBackendSchool);
    // The backend doesn't support these filters server-side — applied client-side instead.
    if (filters.type) out = out.filter((s) => s.type === filters.type);
    if (filters.hasSeats) out = out.filter((s) => s.capacity - s.enrolled > 0);
    if (filters.boarding) out = out.filter((s) => s.boardingAvailable);
    if (filters.level) out = out.filter((s) => s.levels.includes(filters.level!));
    return out;
  },

  // GET /api/v1/schools/:id
  async get(id: string): Promise<School> {
    if (USE_MOCKS) {
      const school = db.schools.find((s) => s.id === id);
      if (!school) throw { code: "NOT_FOUND", message: "School not found.", status: 404 };
      return simulate(snapshot(school));
    }
    const res = await http.get<{ school: BackendPublicSchool }>(`/schools/${id}`);
    return mapBackendSchool(res.school);
  },

  /** Distinct district list for filters. No dedicated endpoint on the real backend —
   *  derived client-side from the unfiltered school list there. */
  async districts(): Promise<string[]> {
    if (USE_MOCKS) return simulate([...new Set(db.districtStats.map((d) => d.district))].sort());
    const schools = await this.list();
    return [...new Set(schools.map((s) => s.district))].sort();
  },

  // GET /api/v1/schools/:id/classes — school-admin management endpoint, no public equivalent.
  // Left mock-only; parent-facing pages use `School.classes` from get()/list() instead.
  async classes(schoolId: string): Promise<SchoolClass[]> {
    return simulate(snapshot(db.classes.filter((c) => c.schoolId === schoolId)));
  },

  // PUT /api/v1/schools/:id — school-admin only, left mock-only (see schoolService owner notes).
  async updateProfile(id: string, patch: Partial<School>): Promise<School> {
    const school = db.schools.find((s) => s.id === id);
    if (!school) throw { code: "NOT_FOUND", message: "School not found.", status: 404 };
    Object.assign(school, patch, { id: school.id });
    return simulate(snapshot(school));
  },

  // POST /api/v1/schools/:id/classes  |  PUT /api/v1/classes/:id — school-admin only, mock-only.
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

  // GET /api/v1/schools/:id/surveys — no survey backend; mock-only (see UnderDevelopment usage).
  async surveys(schoolId: string): Promise<SatisfactionSurvey[]> {
    return simulate(snapshot(db.surveys.filter((s) => s.schoolId === schoolId)));
  },

  // POST /api/v1/schools/:id/surveys — no survey backend; mock-only.
  async submitSurvey(input: { schoolId: string; parentId: string; score: number; comment?: string }): Promise<SatisfactionSurvey> {
    const survey: SatisfactionSurvey = { ...input, id: uid("sv"), submittedAt: nowIso() };
    db.surveys.push(survey);
    return simulate(snapshot(survey));
  },

  /* ------------------------------------------------------------------ */
  /* School-admin/staff portal (school-side write actions + rosters).    */
  /* Self-contained real calls — independent of the public get()/list()  */
  /* mapping above so the two halves can evolve without colliding.       */
  /* ------------------------------------------------------------------ */

  /**
   * Re-syncs the school's profile from its accredited NESA record. This is the ONLY
   * profile-level edit endpoint the real backend exposes — there is no generic
   * "edit school profile" PATCH. PATCH /schools/:schoolId/nesa-profile
   */
  async syncNesaProfile(schoolId: string): Promise<School> {
    if (USE_MOCKS) {
      const school = db.schools.find((s) => s.id === schoolId);
      if (!school) throw { code: "NOT_FOUND", message: "School not found.", status: 404 };
      return simulate(snapshot(school));
    }
    const res = await http.patch<{ school: BackendPublicSchool }>(`/schools/${schoolId}/nesa-profile`);
    return mapBackendSchool(res.school);
  },

  /** Creates a class. POST /schools/:schoolId/classes — only { name, capacity } accepted. */
  async createRealClass(schoolId: string, input: { name: string; capacity: number }): Promise<RealSchoolClass> {
    if (USE_MOCKS) {
      const cls = { schoolId, name: input.name, capacity: input.capacity, enrolled: 0, level: "PRIMARY" as SchoolLevel, id: uid("cls") };
      db.classes.push(cls);
      return simulate({
        id: cls.id, name: cls.name, capacity: cls.capacity, currentEnrollment: 0,
        availableSpots: cls.capacity, isFull: false, minimumEntryGrade: null, minimumConductGrade: null, classTeacherId: null,
      });
    }
    const res = await http.post<{ class: RealSchoolClass }>(`/schools/${schoolId}/classes`, input);
    return res.class;
  },

  /** Assigns/updates the homeroom teacher of a class. PATCH /schools/:schoolId/classes/:classId/teacher */
  async assignClassTeacher(schoolId: string, classId: string, teacherId: string): Promise<RealSchoolClass> {
    if (USE_MOCKS) {
      const cls = db.classes.find((c) => c.id === classId);
      if (cls) cls.homeroomTeacherId = teacherId;
      return simulate({
        id: classId, name: cls?.name ?? "", capacity: cls?.capacity ?? 0, currentEnrollment: cls?.enrolled ?? 0,
        availableSpots: Math.max(0, (cls?.capacity ?? 0) - (cls?.enrolled ?? 0)), isFull: false,
        minimumEntryGrade: null, minimumConductGrade: null, classTeacherId: teacherId,
      });
    }
    const res = await http.patch<{ class: RealSchoolClass }>(`/schools/${schoolId}/classes/${classId}/teacher`, { teacherId });
    return res.class;
  },

  /** Sets minimum entry/conduct grade admission criteria for a class (used by automatic admissions).
   *  PATCH /schools/:schoolId/classes/:classId/admission-criteria */
  async setAdmissionCriteria(
    schoolId: string,
    classId: string,
    input: { minimumEntryGrade: number; minimumConductGrade: number },
  ): Promise<RealSchoolClass> {
    if (USE_MOCKS) {
      return simulate({
        id: classId, name: "", capacity: 0, currentEnrollment: 0, availableSpots: 0, isFull: false,
        minimumEntryGrade: input.minimumEntryGrade, minimumConductGrade: input.minimumConductGrade,
      });
    }
    const res = await http.patch<{ class: RealSchoolClass }>(`/schools/${schoolId}/classes/${classId}/admission-criteria`, input);
    return res.class;
  },

  /** Adds a course under a class, taught by a given teacher. POST /schools/:schoolId/classes/:classId/courses */
  async addCourse(
    schoolId: string,
    classId: string,
    input: { name: string; teacherId: string },
  ): Promise<{ id: string; name: string; classId: string; teacherId: string }> {
    if (USE_MOCKS) return simulate({ id: uid("course"), name: input.name, classId, teacherId: input.teacherId });
    const res = await http.post<{ course: { id: string; name: string; classId: string; teacherId: string } }>(
      `/schools/${schoolId}/classes/${classId}/courses`, input,
    );
    return res.course;
  },

  /** Teacher roster with homeroom + course assignments. GET /schools/:schoolId/teachers */
  async teachersReal(schoolId: string): Promise<RealSchoolTeacher[]> {
    if (USE_MOCKS) {
      return simulate(
        db.teachers.filter((t) => t.schoolId === schoolId).map((t) => {
          const [firstName, ...rest] = t.name.split(" ");
          return {
            userId: t.id, firstName: firstName ?? t.name, lastName: rest.join(" "),
            email: t.email, phone: t.phone,
            homeroomClasses: db.classes.filter((c) => c.homeroomTeacherId === t.id).map((c) => ({ id: c.id, name: c.name })),
            courses: t.subjects.map((s, i) => ({ id: `${t.id}-course-${i}`, name: s, classId: t.classIds[0] ?? "" })),
          };
        }),
      );
    }
    const res = await http.get<{ teachers: RealSchoolTeacher[] }>(`/schools/${schoolId}/teachers`);
    return res.teachers;
  },

  /** Adds a school achievement (optionally with a proof file). POST /schools/:schoolId/achievements */
  async addAchievement(
    schoolId: string,
    input: { title: string; description?: string; achievedAt?: string },
    proof?: File,
  ): Promise<RealSchoolAchievement> {
    if (USE_MOCKS) {
      return simulate({ id: uid("ach"), title: input.title, description: input.description ?? null, proofPath: null, achievedAt: input.achievedAt ?? null });
    }
    const form = new FormData();
    form.append("title", input.title);
    if (input.description) form.append("description", input.description);
    if (input.achievedAt) form.append("achievedAt", input.achievedAt);
    if (proof) form.append("proof", proof);
    const res = await http.post<{ achievement: RealSchoolAchievement }>(`/schools/${schoolId}/achievements`, form);
    return res.achievement;
  },

  /** XentriPay-supported payment providers for building payment destinations. GET /schools/payment-providers */
  async paymentProviders(): Promise<PaymentProviderOption[]> {
    if (USE_MOCKS) {
      return simulate([
        { code: "BK_BANK", name: "Bank of Kigali", type: "BANK" },
        { code: "MTN_MOMO", name: "MTN Mobile Money", type: "MOBILE_MONEY" },
        { code: "AIRTEL_MONEY", name: "Airtel Money", type: "MOBILE_MONEY" },
      ]);
    }
    const res = await http.get<{ providers: PaymentProviderOption[] }>("/schools/payment-providers");
    return res.providers;
  },

  /** GET /schools/:schoolId/payment-destinations */
  async paymentDestinations(schoolId: string): Promise<PaymentDestination[]> {
    if (USE_MOCKS) {
      return simulate(
        db.paymentChannels.filter((c) => c.schoolId === schoolId).map((c) => ({
          id: c.id, schoolId, type: c.type === "BANK" ? "BANK" : "MOBILE_MONEY",
          label: c.label, providerCode: c.type, providerName: c.type,
          accountName: c.label, accountNumber: c.accountNumber, isActive: c.active,
        })),
      );
    }
    const res = await http.get<{ destinations: PaymentDestination[] }>(`/schools/${schoolId}/payment-destinations`);
    return res.destinations;
  },

  /** POST /schools/:schoolId/payment-destinations */
  async addPaymentDestination(schoolId: string, input: PaymentDestinationInput): Promise<PaymentDestination> {
    if (USE_MOCKS) {
      const ch = {
        id: uid("ch"), schoolId, type: "BANK" as const, label: input.label,
        accountNumber: input.accountNumber ?? input.phoneNumber ?? "", active: true,
      };
      db.paymentChannels.push(ch);
      return simulate({
        id: ch.id, schoolId, type: "BANK", label: input.label, providerCode: input.providerCode,
        providerName: input.providerCode, accountName: input.accountName,
        accountNumber: input.accountNumber, phoneNumber: input.phoneNumber, isActive: true,
      });
    }
    const res = await http.post<{ destination: PaymentDestination }>(`/schools/${schoolId}/payment-destinations`, input);
    return res.destination;
  },

  // --- NESA location lookups (live backend only — power the province → village
  // cascading selects on the real school-creation form). GET /api/v1/locations/provinces
  async nesaProvinces(): Promise<NesaLocationOption[]> {
    const res = await http.get<{ locations: NesaLocationOption[] }>("/locations/provinces");
    return res.locations;
  },

  // GET /api/v1/locations/:parentCode/children
  async nesaLocationChildren(parentCode: string): Promise<NesaLocationOption[]> {
    const res = await http.get<{ locations: NesaLocationOption[] }>(`/locations/${encodeURIComponent(parentCode)}/children`);
    return res.locations;
  },

  // POST /api/v1/schools — SCHOOL_ADMIN-only, multipart (images[]/achievementProofs[]).
  // The backend cross-checks name + exact province..village against the NESA accreditation
  // registry and rejects the request if there's no unique accredited match.
  async createSchool(formData: FormData): Promise<School> {
    const res = await http.post<{ school: BackendPublicSchool }>("/schools", formData);
    return mapBackendSchool(res.school);
  },
};

export interface RealSchoolClass {
  id: string;
  name: string;
  capacity: number;
  currentEnrollment: number;
  availableSpots: number;
  isFull: boolean;
  minimumEntryGrade: number | null;
  minimumConductGrade: number | null;
  classTeacherId?: string | null;
}

export interface RealSchoolAchievement {
  id: string;
  title: string;
  description: string | null;
  proofPath: string | null;
  achievedAt: string | null;
}

export interface RealSchoolTeacher {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  homeroomClasses: { id: string; name: string }[];
  courses: { id: string; name: string; classId: string }[];
}

export interface PaymentProviderOption {
  code: string;
  name: string;
  type: "BANK" | "MOBILE_MONEY" | "WALLET";
}

export interface PaymentDestinationInput {
  label: string;
  providerCode: string;
  accountName: string;
  accountNumber?: string;
  phoneNumber?: string;
}

export interface PaymentDestination {
  id: string;
  schoolId: string;
  type: string;
  label: string;
  providerCode: string;
  providerName: string;
  accountName: string;
  accountNumber?: string | null;
  phoneNumber?: string | null;
  isActive: boolean;
}
