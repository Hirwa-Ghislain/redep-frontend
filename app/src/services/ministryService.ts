import type {
  DistrictStat,
  EnrollmentTrendPoint,
  MinistrySchoolsResult,
  MinistryStaffingSummary,
  NationalKpis,
  ResignationStatus,
  ResignationSummary,
} from "@/types";
import { http } from "@/lib/api/client";

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
    const qs = new URLSearchParams({ limit: "100" });
    if (params.search) qs.set("search", params.search);
    if (params.district) qs.set("district", params.district);
    return http.get<MinistrySchoolsResult>(`/education-authority/schools?${qs.toString()}`);
  },

  // GET /education-authority/staffing  (national open-vacancy counts by district/title)
  async staffing(): Promise<MinistryStaffingSummary> {
    return http.get<MinistryStaffingSummary>("/education-authority/staffing");
  },

  /** Real resignation (single-school withdrawal) data — GET /education-authority/resignations.
   *  There is no cross-school transfer concept in this backend; this replaces the old mock
   *  "transfers in/out" numbers used by the ministry Transfer trends page. */
  async resignations(params: { district?: string; status?: ResignationStatus } = {}): Promise<ResignationSummary> {
    const qs = new URLSearchParams();
    if (params.district) qs.set("district", params.district);
    if (params.status) qs.set("status", params.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return http.get<ResignationSummary>(`/education-authority/resignations${suffix}`);
  },
};
