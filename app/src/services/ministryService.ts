import type { DistrictStat, EnrollmentTrendPoint, NationalKpis, School, Vacancy } from "@/types";
import { db, simulate, snapshot } from "@/mocks/db";

export const ministryService = {
  // GET /api/v1/ministry/kpis
  async kpis(): Promise<NationalKpis> {
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
        db.districtStats.reduce((s, d) => s + d.satisfaction, 0) / db.districtStats.length,
    });
  },

  // GET /api/v1/ministry/districts
  async districtStats(): Promise<DistrictStat[]> {
    return simulate(snapshot(db.districtStats));
  },

  // GET /api/v1/ministry/enrollment-trends
  async enrollmentTrends(): Promise<EnrollmentTrendPoint[]> {
    // Six terms of national trend data (backend will aggregate for real)
    return simulate([
      { period: "2025 T1", enrolled: 726_000, applications: 84_200, capacity: 801_000 },
      { period: "2025 T2", enrolled: 731_500, applications: 21_400, capacity: 806_000 },
      { period: "2025 T3", enrolled: 735_100, applications: 18_900, capacity: 812_500 },
      { period: "2026 T1", enrolled: 748_900, applications: 96_800, capacity: 824_000 },
      { period: "2026 T2", enrolled: 752_000, applications: 24_100, capacity: 828_800 },
      { period: "2026 T3*", enrolled: 764_500, applications: 31_600, capacity: 835_000 },
    ]);
  },

  /** Registry of platform schools with capacity context. GET /api/v1/ministry/schools */
  async schoolsRegistry(): Promise<School[]> {
    return simulate(snapshot(db.schools));
  },

  // GET /api/v1/ministry/staffing  (national vacancy view)
  async staffing(): Promise<{ vacancies: Vacancy[]; byPosition: { position: string; count: number }[] }> {
    const open = db.vacancies.filter((v) => v.status === "OPEN");
    const byPositionMap = new Map<string, number>();
    for (const v of open) byPositionMap.set(v.positionType, (byPositionMap.get(v.positionType) ?? 0) + 1);
    return simulate({
      vacancies: snapshot(open),
      byPosition: [...byPositionMap.entries()].map(([position, count]) => ({ position, count })),
    });
  },

  // GET /api/v1/ministry/transfers
  async transferTrends(): Promise<{ byDistrict: { district: string; out: number; in: number }[] }> {
    return simulate({
      byDistrict: db.districtStats.map((d) => ({ district: d.district, out: d.transfersOut, in: d.transfersIn })),
    });
  },
};
