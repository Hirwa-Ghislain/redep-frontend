import type {
  DistrictStat,
  EnrollmentTrendPoint,
  MinistrySchoolsResult,
  MinistryStaffingSummary,
  NationalKpis,
  ResignationStatus,
  ResignationSummary,
} from "@/types";
import { db, nowIso, simulate, snapshot } from "@/mocks/db";
import { http, USE_MOCKS } from "@/lib/api/client";

/** Subset of the `GET /education-authority/dashboard` response this service actually uses.
 *  See E-SHURI-backend/src/modules/education-authority/education-authority.service.ts `dashboard()`. */
interface EducationAuthorityDashboard {
  headline: {
    schools: number;
    activeSchools: number;
    students: number;
    totalCapacity: number;
  };
  people: {
    staffByRole: { role: string; count: number }[];
  };
  operations: {
    activeJobs: number;
  };
}

/** Subset of `GET /education-authority/capacity`. */
interface EducationAuthorityCapacity {
  schools: { schoolId: string; schoolName: string; district: string; capacity: number; enrolled: number }[];
  byDistrict: { district: string; capacity: number; enrolled: number; utilizationPct: number }[];
}

export const ministryService = {
  // GET /education-authority/dashboard
  async kpis(): Promise<NationalKpis> {
    if (USE_MOCKS) {
      const enrolled = db.districtStats.reduce((s, d) => s + d.enrolled, 0);
      const capacity = db.districtStats.reduce((s, d) => s + d.capacity, 0);
      return simulate({
        totalSchools: db.districtStats.reduce((s, d) => s + d.schools, 0),
        activeSchools: db.schools.filter((s) => s.status === "ACTIVE").length,
        pendingSchools: db.onboardingRequests.filter((r) => r.status !== "APPROVED" && r.status !== "REJECTED").length,
        totalStudents: enrolled,
        totalTeachers: 28_400,
        totalParents: 412_000,
        capacityUtilization: enrolled / capacity,
        openVacancies: db.vacancies.filter((v) => v.status === "OPEN").length,
        pendingTransfers: db.transfers.filter((t) => t.status === "PENDING").length,
        avgSatisfaction:
          db.districtStats.reduce((s, d) => s + (d.satisfaction ?? 0), 0) / db.districtStats.length,
      });
    }
    const dashboard = await http.get<EducationAuthorityDashboard>("/education-authority/dashboard");
    const totalTeachers = dashboard.people.staffByRole.find((r) => r.role === "TEACHER")?.count ?? 0;
    return {
      totalSchools: dashboard.headline.schools,
      activeSchools: dashboard.headline.activeSchools,
      totalStudents: dashboard.headline.students,
      totalTeachers,
      capacityUtilization: dashboard.headline.totalCapacity
        ? dashboard.headline.students / dashboard.headline.totalCapacity
        : 0,
      openVacancies: dashboard.operations.activeJobs,
      // pendingSchools/totalParents/pendingTransfers/avgSatisfaction: no equivalent in the
      // real backend (see types/index.ts NationalKpis) — intentionally omitted, not fabricated.
    };
  },

  // GET /education-authority/capacity + /education-authority/staffing (merged client-side)
  async districtStats(): Promise<DistrictStat[]> {
    if (USE_MOCKS) return simulate(snapshot(db.districtStats));

    const [capacity, staffing] = await Promise.all([
      http.get<EducationAuthorityCapacity>("/education-authority/capacity"),
      http.get<MinistryStaffingSummary>("/education-authority/staffing"),
    ]);

    // Per-school district info already comes back on the capacity payload, so school counts
    // per district are derived from it directly rather than a second call to /schools.
    const schoolsPerDistrict = new Map<string, number>();
    for (const s of capacity.schools) schoolsPerDistrict.set(s.district, (schoolsPerDistrict.get(s.district) ?? 0) + 1);
    const openVacanciesPerDistrict = new Map(staffing.byDistrict.map((d) => [d.district, d.count]));

    return capacity.byDistrict.map((d) => ({
      district: d.district,
      schools: schoolsPerDistrict.get(d.district) ?? 0,
      enrolled: d.enrolled,
      capacity: d.capacity,
      teacherGap: openVacanciesPerDistrict.get(d.district) ?? 0,
      // transfersOut/transfersIn/satisfaction: no equivalent in the real backend, omitted.
    }));
  },

  // GET /education-authority/enrollment-trends?months=
  async enrollmentTrends(months = 12): Promise<EnrollmentTrendPoint[]> {
    if (USE_MOCKS) {
      // Six terms of national trend data (mock-only demo shape).
      return simulate([
        { period: "2025 T1", enrolled: 726_000, applications: 84_200, capacity: 801_000 },
        { period: "2025 T2", enrolled: 731_500, applications: 21_400, capacity: 806_000 },
        { period: "2025 T3", enrolled: 735_100, applications: 18_900, capacity: 812_500 },
        { period: "2026 T1", enrolled: 748_900, applications: 96_800, capacity: 824_000 },
        { period: "2026 T2", enrolled: 752_000, applications: 24_100, capacity: 828_800 },
        { period: "2026 T3*", enrolled: 764_500, applications: 31_600, capacity: 835_000 },
      ]);
    }
    const res = await http.get<{ points: { period: string; enrolled: number }[] }>(
      `/education-authority/enrollment-trends?months=${months}`,
    );
    // applications/capacity: not tracked over time by the real backend, omitted per point.
    return res.points;
  },

  /** Registry of platform schools with capacity context. GET /education-authority/schools
   *  (education-authority's own view — richer than the public school listing: verification
   *  status, ownership, Cambridge program, staff counts). Fetches the first page at the
   *  backend's max page size (100); a district/search filter narrows further server-side. */
  async schoolsRegistry(params: { search?: string; district?: string } = {}): Promise<MinistrySchoolsResult> {
    if (USE_MOCKS) {
      const schools = snapshot(db.schools).map((s) => ({
        id: s.id,
        name: s.name,
        registrationNumber: s.code,
        nesaSchoolId: null,
        email: s.contactEmail,
        phone: s.contactPhone,
        status: s.status,
        governmentVerifiedAt: null,
        ownership: s.type,
        hasCambridgeProgram: false,
        boardingType: s.boardingAvailable ? "BOARDING" : "DAY",
        accreditedLevels: s.levels,
        nesaProfileSyncedAt: null,
        province: "",
        district: s.district,
        sector: s.sector,
        cell: "",
        village: "",
        createdAt: nowIso(),
        capacity: s.capacity,
        students: s.enrolled,
        availableSpots: Math.max(0, s.capacity - s.enrolled),
        teachers: 0,
        accountants: 0,
        counts: { classes: 0, staff: 0, enrollments: s.enrolled, studentApplications: 0 },
      }));
      return simulate({
        schools,
        pagination: { page: 1, limit: schools.length, total: schools.length, pages: 1 },
      });
    }
    const qs = new URLSearchParams({ limit: "100" });
    if (params.search) qs.set("search", params.search);
    if (params.district) qs.set("district", params.district);
    return http.get<MinistrySchoolsResult>(`/education-authority/schools?${qs.toString()}`);
  },

  // GET /education-authority/staffing  (national open-vacancy counts by district/title)
  async staffing(): Promise<MinistryStaffingSummary> {
    if (USE_MOCKS) {
      const open = db.vacancies.filter((v) => v.status === "OPEN");
      const byDistrictMap = new Map<string, number>();
      const byTitleMap = new Map<string, number>();
      for (const v of open) {
        byDistrictMap.set(v.district, (byDistrictMap.get(v.district) ?? 0) + 1);
        byTitleMap.set(v.title, (byTitleMap.get(v.title) ?? 0) + 1);
      }
      return simulate({
        totalOpenVacancies: open.length,
        byDistrict: [...byDistrictMap.entries()].map(([district, count]) => ({ district, count })),
        byTitle: [...byTitleMap.entries()].map(([title, count]) => ({ title, count })),
      });
    }
    return http.get<MinistryStaffingSummary>("/education-authority/staffing");
  },

  /** Real resignation (single-school withdrawal) data — GET /education-authority/resignations.
   *  There is no cross-school transfer concept in this backend; this replaces the old mock
   *  "transfers in/out" numbers used by the ministry Transfer trends page. */
  async resignations(params: { district?: string; status?: ResignationStatus } = {}): Promise<ResignationSummary> {
    if (USE_MOCKS) {
      const records = snapshot(db.transfers).map((t) => ({
        id: t.id,
        studentName: t.studentName,
        schoolName: t.schoolName,
        district: db.schools.find((s) => s.id === t.schoolId)?.district ?? "—",
        status: (t.status === "CONFIRMED" ? "APPROVED" : t.status === "REJECTED" ? "REJECTED" : "PENDING") as ResignationStatus,
        requestedAt: t.requestedAt,
        decidedAt: t.resolvedAt ?? null,
      }));
      const totalsByStatus: Record<ResignationStatus, number> = {
        PENDING: 0,
        PAYMENT_REQUIRED: 0,
        APPROVED: 0,
        REJECTED: 0,
      };
      for (const r of records) totalsByStatus[r.status] += 1;
      const filtered = records.filter(
        (r) => (!params.district || r.district === params.district) && (!params.status || r.status === params.status),
      );
      return simulate({ items: filtered, totalsByStatus });
    }
    const qs = new URLSearchParams();
    if (params.district) qs.set("district", params.district);
    if (params.status) qs.set("status", params.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return http.get<ResignationSummary>(`/education-authority/resignations${suffix}`);
  },
};
