import type { PublicSchoolClass, School, SchoolLevel, SchoolType } from "@/types";
import { API_URL, http } from "@/lib/api/client";

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
    const res = await http.get<{ school: BackendPublicSchool }>(`/schools/${id}`);
    return mapBackendSchool(res.school);
  },

  /** Distinct district list for filters. No dedicated endpoint on the real backend —
   *  derived client-side from the unfiltered school list there. */
  async districts(): Promise<string[]> {
    const schools = await this.list();
    return [...new Set(schools.map((s) => s.district))].sort();
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
    const res = await http.patch<{ school: BackendPublicSchool }>(`/schools/${schoolId}/nesa-profile`);
    return mapBackendSchool(res.school);
  },

  /** Updates the school-owned profile fields that aren't sourced from NESA. PATCH /schools/:schoolId */
  async updateProfile(schoolId: string, input: { description?: string }): Promise<School> {
    const res = await http.patch<{ school: BackendPublicSchool }>(`/schools/${schoolId}`, input);
    return mapBackendSchool(res.school);
  },

  /** Creates a class. POST /schools/:schoolId/classes — only { name, capacity } accepted. */
  async createRealClass(schoolId: string, input: { name: string; capacity: number }): Promise<RealSchoolClass> {
    const res = await http.post<{ class: RealSchoolClass }>(`/schools/${schoolId}/classes`, input);
    return res.class;
  },

  /** Assigns/updates the homeroom teacher of a class. PATCH /schools/:schoolId/classes/:classId/teacher */
  async assignClassTeacher(schoolId: string, classId: string, teacherId: string): Promise<RealSchoolClass> {
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
    const res = await http.patch<{ class: RealSchoolClass }>(`/schools/${schoolId}/classes/${classId}/admission-criteria`, input);
    return res.class;
  },

  /** Adds a course under a class, taught by a given teacher. POST /schools/:schoolId/classes/:classId/courses */
  async addCourse(
    schoolId: string,
    classId: string,
    input: { name: string; teacherId: string },
  ): Promise<{ id: string; name: string; classId: string; teacherId: string }> {
    const res = await http.post<{ course: { id: string; name: string; classId: string; teacherId: string } }>(
      `/schools/${schoolId}/classes/${classId}/courses`, input,
    );
    return res.course;
  },

  /** Teacher roster with homeroom + course assignments. GET /schools/:schoolId/teachers */
  async teachersReal(schoolId: string): Promise<RealSchoolTeacher[]> {
    const res = await http.get<{ teachers: RealSchoolTeacher[] }>(`/schools/${schoolId}/teachers`);
    return res.teachers;
  },

  /** Adds a school achievement (optionally with a proof file). POST /schools/:schoolId/achievements */
  async addAchievement(
    schoolId: string,
    input: { title: string; description?: string; achievedAt?: string },
    proof?: File,
  ): Promise<RealSchoolAchievement> {
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
    const res = await http.get<{ providers: PaymentProviderOption[] }>("/schools/payment-providers");
    return res.providers;
  },

  /** GET /schools/:schoolId/payment-destinations */
  async paymentDestinations(schoolId: string): Promise<PaymentDestination[]> {
    const res = await http.get<{ destinations: PaymentDestination[] }>(`/schools/${schoolId}/payment-destinations`);
    return res.destinations;
  },

  /** POST /schools/:schoolId/payment-destinations */
  async addPaymentDestination(schoolId: string, input: PaymentDestinationInput): Promise<PaymentDestination> {
    const res = await http.post<{ destination: PaymentDestination }>(`/schools/${schoolId}/payment-destinations`, input);
    return res.destination;
  },

  /** PATCH /schools/:schoolId/payment-destinations/:destinationId */
  async updatePaymentDestination(schoolId: string, destinationId: string, input: PaymentDestinationInput): Promise<PaymentDestination> {
    const res = await http.patch<{ destination: PaymentDestination }>(`/schools/${schoolId}/payment-destinations/${destinationId}`, input);
    return res.destination;
  },

  /** DELETE /schools/:schoolId/payment-destinations/:destinationId */
  async removePaymentDestination(schoolId: string, destinationId: string): Promise<void> {
    await http.delete(`/schools/${schoolId}/payment-destinations/${destinationId}`);
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
  feeId?: string;
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
