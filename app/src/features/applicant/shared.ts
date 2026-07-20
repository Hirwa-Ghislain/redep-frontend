import type { ApplicantProfile, EmploymentType, PositionType } from "@/types";

/** Human labels for vacancy position types (no map exists in @/lib/status). */
export const POSITION_TYPE_LABEL: Record<PositionType, string> = {
  TEACHER: "Teacher",
  ACCOUNTANT: "Accountant",
  ADMINISTRATOR: "Administrator",
  LIBRARIAN: "Librarian",
  DRIVER: "Driver",
  OTHER: "Other",
};

export const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
};

/**
 * Profile strength 0..1 — each filled section counts equally:
 * headline, bio, district, subjects, education, experience, documents.
 */
export function profileStrength(p: ApplicantProfile): number {
  const sections = [
    Boolean(p.headline.trim()),
    Boolean(p.bio.trim()),
    Boolean(p.district.trim()),
    p.subjects.length > 0,
    p.education.length > 0,
    p.experience.length > 0,
    p.documents.length > 0,
  ];
  return sections.filter(Boolean).length / sections.length;
}

/** Whole days from now until an ISO date; negative = already past. */
export function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}
