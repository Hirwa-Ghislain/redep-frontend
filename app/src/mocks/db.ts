/**
 * In-memory mock database, seeded deterministically.
 * Every portal reads/writes this through `services/*` — swap those for HTTP
 * calls when the Spring Boot backend lands. Mutations persist for the session.
 *
 * All people here are fictional.
 */

import type {
  AcademicTerm,
  AdmissionApplication,
  Announcement,
  AppNotification,
  ApplicantProfile,
  Assessment,
  AttendanceRecord,
  AuditLogEntry,
  DistrictStat,
  DocumentRef,
  FeeStructure,
  Grade,
  Incident,
  JobApplication,
  Message,
  MessageThread,
  Payment,
  PaymentChannel,
  Receipt,
  RoleDefinition,
  SatisfactionSurvey,
  School,
  SchoolClass,
  SchoolOnboardingRequest,
  StaffMember,
  Student,
  TeacherProfile,
  TransferRequest,
  User,
  Vacancy,
} from "@/types";
import { ALL_SCHOOL_PERMISSIONS, P } from "@/config/permissions";
import { DEFAULT_ROLE_PERMISSIONS } from "@/config/roles";

/* ------------------------------ deterministic RNG ------------------------------ */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260717);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

const FIRST_NAMES = [
  "Aline", "Eric", "Claudine", "Jean", "Divine", "Kevin", "Sandrine", "Patrick",
  "Solange", "Yves", "Chantal", "Emmanuel", "Josiane", "Fabrice", "Clarisse",
  "Olivier", "Diane", "Innocent", "Ange", "Samuel", "Alice", "Pacifique",
  "Vestine", "Thierry", "Grace", "Honorine", "Didier", "Beatha", "Egide", "Nadia",
];
const LAST_NAMES = [
  "Uwimana", "Mukamana", "Niyonzima", "Habimana", "Uwase", "Ishimwe", "Mugisha",
  "Iradukunda", "Nshimiyimana", "Umutoni", "Byiringiro", "Ingabire", "Ndayisaba",
  "Mutesi", "Hakizimana", "Niyigena", "Tuyishime", "Umuhoza", "Karangwa", "Rukundo",
];

/* ---------------------------------- date utils --------------------------------- */

const DAY = 86_400_000;
const NOW = new Date("2026-07-17T09:30:00Z").getTime();
export const nowIso = () => new Date().toISOString();
const daysAgo = (n: number, hourOffset = 0) => new Date(NOW - n * DAY + hourOffset * 3_600_000).toISOString();
const dateOnly = (n: number) => new Date(NOW - n * DAY).toISOString().slice(0, 10);

/* ---------------------------------- demo ids ----------------------------------- */

export const DEMO = {
  parentId: "u_parent",
  schoolAdminId: "u_schooladmin",
  accountantId: "u_accountant",
  teacherId: "u_teacher",
  applicantId: "u_applicant",
  ministryId: "u_ministry",
  systemAdminId: "u_sysadmin",
  schoolId: "sch_umurav",
  kivuSchoolId: "sch_kivu",
} as const;

/* ----------------------------------- terms ------------------------------------- */

const terms: AcademicTerm[] = [
  { id: "term_2026_1", year: 2026, term: 1, label: "2026 · Term 1", startDate: "2026-01-12", endDate: "2026-04-17", current: false },
  { id: "term_2026_2", year: 2026, term: 2, label: "2026 · Term 2", startDate: "2026-05-04", endDate: "2026-08-14", current: true },
  { id: "term_2026_3", year: 2026, term: 3, label: "2026 · Term 3", startDate: "2026-09-07", endDate: "2026-12-11", current: false },
];
const T1 = "term_2026_1";
const T2 = "term_2026_2";

/* ---------------------------------- schools ------------------------------------ */

const schools: School[] = [
  {
    id: DEMO.schoolId, name: "umurav Academy", code: "UA-041", type: "PRIVATE",
    levels: ["PRIMARY", "O_LEVEL", "A_LEVEL"], district: "Gasabo", sector: "Remera",
    description:
      "A combined day school in Remera focused on sciences and languages, with a strong record in national examinations and a well-equipped innovation lab.",
    motto: "Learn. Build. Serve.", foundedYear: 2004, capacity: 1200, enrolled: 1064,
    feesRange: { min: 95_000, max: 260_000 },
    facilities: ["Science laboratories", "Innovation lab", "Library", "Sports field", "School canteen", "Computer lab"],
    achievements: ["Top 5 district — 2025 national exams", "National science fair winners 2024", "Debate club — provincial champions"],
    photos: [], status: "ACTIVE", contactEmail: "info@umurav-academy.example.rw", contactPhone: "+250 78x xxx 041",
    satisfactionScore: 4.5, boardingAvailable: false,
  },
  {
    id: DEMO.kivuSchoolId, name: "Lake Kivu College", code: "LKC-102", type: "GOVERNMENT_AIDED",
    levels: ["PRIMARY", "O_LEVEL"], district: "Rubavu", sector: "Gisenyi",
    description:
      "A lakeside government-aided school serving Rubavu families, known for its reading culture and community service programme.",
    motto: "Knowledge like water.", foundedYear: 1987, capacity: 900, enrolled: 812,
    feesRange: { min: 45_000, max: 120_000 },
    facilities: ["Library", "Sports field", "School garden", "Computer lab"],
    achievements: ["Best reading programme — Western Province 2025", "Clean school award 2024"],
    photos: [], status: "ACTIVE", contactEmail: "office@lakekivu-college.example.rw", contactPhone: "+250 78x xxx 102",
    satisfactionScore: 4.2, boardingAvailable: true,
  },
  {
    id: "sch_ibanze", name: "Ibanze Primary School", code: "IPS-233", type: "PUBLIC",
    levels: ["NURSERY", "PRIMARY"], district: "Kicukiro", sector: "Niboye",
    description: "A public nursery and primary school with a play-based early years programme and strong parent community.",
    foundedYear: 1995, capacity: 700, enrolled: 661,
    feesRange: { min: 15_000, max: 60_000 },
    facilities: ["Playground", "Library corner", "School meals kitchen"],
    achievements: ["District literacy award 2025"],
    photos: [], status: "ACTIVE", contactEmail: "ibanze@example.rw", contactPhone: "+250 78x xxx 233",
    satisfactionScore: 4.0, boardingAvailable: false,
  },
  {
    id: "sch_kabuye", name: "Mount Kabuye School", code: "MKS-310", type: "PUBLIC",
    levels: ["PRIMARY", "O_LEVEL"], district: "Musanze", sector: "Muhoza",
    description: "A public school at the foot of Mount Kabuye with a growing STEM club and strong girls' football team.",
    foundedYear: 1979, capacity: 850, enrolled: 793,
    feesRange: { min: 20_000, max: 85_000 },
    facilities: ["Science room", "Sports field", "Library"],
    achievements: ["Girls' football — national semi-finals 2025"],
    photos: [], status: "ACTIVE", contactEmail: "kabuye@example.rw", contactPhone: "+250 78x xxx 310",
    satisfactionScore: 4.1, boardingAvailable: false,
  },
  {
    id: "sch_isonga", name: "Isonga TVET Institute", code: "ITI-450", type: "GOVERNMENT_AIDED",
    levels: ["TVET"], district: "Huye", sector: "Ngoma",
    description: "A technical institute offering construction, ICT and hospitality trades with industry attachment placements.",
    foundedYear: 2011, capacity: 400, enrolled: 331,
    feesRange: { min: 60_000, max: 150_000 },
    facilities: ["Workshops", "ICT lab", "Training kitchen"],
    achievements: ["WorldSkills Rwanda medalists 2024"],
    photos: [], status: "ACTIVE", contactEmail: "isonga@example.rw", contactPhone: "+250 78x xxx 450",
    satisfactionScore: 4.3, boardingAvailable: true,
  },
  {
    id: "sch_amahoro", name: "Amahoro International School", code: "AIS-508", type: "PRIVATE",
    levels: ["NURSERY", "PRIMARY", "O_LEVEL", "A_LEVEL"], district: "Nyarugenge", sector: "Kiyovu",
    description: "A private international school in central Kigali offering a bilingual curriculum and small class sizes.",
    foundedYear: 2015, capacity: 650, enrolled: 540,
    feesRange: { min: 180_000, max: 550_000 },
    facilities: ["Swimming pool", "Music room", "Science laboratories", "Library", "Cafeteria"],
    achievements: ["IB-track pilot cohort 2025"],
    photos: [], status: "ACTIVE", contactEmail: "amahoro@example.rw", contactPhone: "+250 78x xxx 508",
    satisfactionScore: 4.6, boardingAvailable: false,
  },
  {
    id: "sch_urumuri", name: "Urumuri Girls School", code: "UGS-612", type: "GOVERNMENT_AIDED",
    levels: ["O_LEVEL", "A_LEVEL"], district: "Muhanga", sector: "Nyamabuye",
    description: "A boarding school for girls with an outstanding sciences track record and mentorship programme.",
    foundedYear: 1968, capacity: 600, enrolled: 588,
    feesRange: { min: 70_000, max: 190_000 },
    facilities: ["Boarding houses", "Science laboratories", "Library", "Chapel", "Sports field"],
    achievements: ["Top girls' school — national exams 2025", "Mathematics olympiad finalists"],
    photos: [], status: "ACTIVE", contactEmail: "urumuri@example.rw", contactPhone: "+250 78x xxx 612",
    satisfactionScore: 4.7, boardingAvailable: true,
  },
  {
    id: "sch_intare", name: "Intare Combined School", code: "ICS-720", type: "PUBLIC",
    levels: ["PRIMARY", "O_LEVEL"], district: "Rwamagana", sector: "Kigabiro",
    description: "A large public combined school serving Rwamagana town with new classrooms funded in 2024.",
    foundedYear: 1990, capacity: 1000, enrolled: 876,
    feesRange: { min: 18_000, max: 75_000 },
    facilities: ["New classroom block", "Sports field", "Library"],
    achievements: ["District quiz champions 2025"],
    photos: [], status: "ACTIVE", contactEmail: "intare@example.rw", contactPhone: "+250 78x xxx 720",
    satisfactionScore: 3.9, boardingAvailable: false,
  },
  {
    id: "sch_nyungwe", name: "Nyungwe Valley Academy", code: "NVA-815", type: "PRIVATE",
    levels: ["PRIMARY"], district: "Rusizi", sector: "Kamembe",
    description: "A young private primary school with an environmental education focus and forest classroom days.",
    foundedYear: 2019, capacity: 350, enrolled: 298,
    feesRange: { min: 80_000, max: 140_000 },
    facilities: ["Eco-garden", "Library", "Art room"],
    achievements: ["Green Schools award 2025"],
    photos: [], status: "ACTIVE", contactEmail: "nyungwe@example.rw", contactPhone: "+250 78x xxx 815",
    satisfactionScore: 4.4, boardingAvailable: false,
  },
  {
    id: "sch_gasabohills", name: "Gasabo Hills School", code: "GHS-903", type: "PUBLIC",
    levels: ["PRIMARY", "O_LEVEL"], district: "Gasabo", sector: "Kimironko",
    description: "A busy public school in Kimironko close to full capacity, with an active parents' committee.",
    foundedYear: 1984, capacity: 1100, enrolled: 1042,
    feesRange: { min: 15_000, max: 70_000 },
    facilities: ["Sports field", "Library", "School meals kitchen"],
    achievements: ["Community service award 2024"],
    photos: [], status: "ACTIVE", contactEmail: "gasabohills@example.rw", contactPhone: "+250 78x xxx 903",
    satisfactionScore: 3.8, boardingAvailable: false,
  },
];

/* ---------------------------------- classes ------------------------------------ */

const classes: SchoolClass[] = [];
// umurav Academy: P1–P6 + S1–S6 (one stream each, capacities vary)
const umuravLevels: Array<{ name: string; level: SchoolClass["level"] }> = [
  { name: "P1 A", level: "PRIMARY" }, { name: "P2 A", level: "PRIMARY" },
  { name: "P3 A", level: "PRIMARY" }, { name: "P4 A", level: "PRIMARY" },
  { name: "P5 A", level: "PRIMARY" }, { name: "P6 A", level: "PRIMARY" },
  { name: "S1 A", level: "O_LEVEL" }, { name: "S2 A", level: "O_LEVEL" },
  { name: "S3 A", level: "O_LEVEL" }, { name: "S4 A", level: "A_LEVEL" },
  { name: "S5 A", level: "A_LEVEL" }, { name: "S6 A", level: "A_LEVEL" },
];
umuravLevels.forEach((c, i) => {
  const capacity = c.level === "PRIMARY" ? 100 : 90;
  classes.push({
    id: `cls_ua_${i + 1}`, schoolId: DEMO.schoolId, name: c.name, level: c.level,
    capacity, enrolled: capacity - randInt(2, 14),
  });
});
// Lake Kivu College: P4–P6 + S1–S3
["P4 A", "P5 A", "P6 A", "S1 A", "S2 A", "S3 A"].forEach((name, i) => {
  classes.push({
    id: `cls_lk_${i + 1}`, schoolId: DEMO.kivuSchoolId, name,
    level: name.startsWith("P") ? "PRIMARY" : "O_LEVEL", capacity: 80, enrolled: 80 - randInt(3, 12),
  });
});
// A couple of classes for other schools (capacity data for discovery/ministry)
for (const s of schools) {
  if (s.id === DEMO.schoolId || s.id === DEMO.kivuSchoolId) continue;
  const n = randInt(3, 5);
  for (let i = 0; i < n; i++) {
    const level = pick(s.levels);
    classes.push({
      id: `cls_${s.id.slice(4)}_${i + 1}`, schoolId: s.id,
      name: level === "PRIMARY" ? `P${i + 1} A` : level === "NURSERY" ? `N${i + 1}` : `S${i + 1} A`,
      level, capacity: 80, enrolled: 80 - randInt(0, 18),
    });
  }
}

const UA = (name: string) => classes.find((c) => c.schoolId === DEMO.schoolId && c.name === name)!;
const LK = (name: string) => classes.find((c) => c.schoolId === DEMO.kivuSchoolId && c.name === name)!;

/* ----------------------------------- users ------------------------------------- */

const users: User[] = [
  {
    id: DEMO.parentId, firstName: "Immaculée", lastName: "Uwase", email: "parent@demo.rw",
    phone: "+250 788 000 001", roles: ["PARENT"], permissions: DEFAULT_ROLE_PERMISSIONS.PARENT,
    createdAt: daysAgo(420),
  },
  {
    id: DEMO.schoolAdminId, firstName: "Jean-Claude", lastName: "Mugisha", email: "school@demo.rw",
    phone: "+250 788 000 002", roles: ["SCHOOL_ADMIN"], permissions: DEFAULT_ROLE_PERMISSIONS.SCHOOL_ADMIN,
    schoolId: DEMO.schoolId, createdAt: daysAgo(600),
  },
  {
    id: DEMO.accountantId, firstName: "Beata", lastName: "Mukamana", email: "accountant@demo.rw",
    phone: "+250 788 000 003", roles: ["SCHOOL_STAFF"],
    permissions: [
      P.SCHOOL_DASHBOARD_VIEW, P.FEES_VIEW, P.FEES_CONFIGURE, P.PAYMENTS_VIEW,
      P.PAYMENTS_RECORD, P.ACCOUNTING_VIEW, P.ACCOUNTING_EXPORT, P.STUDENTS_VIEW,
    ],
    schoolId: DEMO.schoolId, staffRoleName: "Accountant", createdAt: daysAgo(310),
  },
  {
    id: DEMO.teacherId, firstName: "Eric", lastName: "Niyonzima", email: "teacher@demo.rw",
    phone: "+250 788 000 004", roles: ["TEACHER"], permissions: DEFAULT_ROLE_PERMISSIONS.TEACHER,
    schoolId: DEMO.schoolId, createdAt: daysAgo(500),
  },
  {
    id: DEMO.applicantId, firstName: "Divine", lastName: "Ingabire", email: "applicant@demo.rw",
    phone: "+250 788 000 005", roles: ["APPLICANT"], permissions: DEFAULT_ROLE_PERMISSIONS.APPLICANT,
    createdAt: daysAgo(90),
  },
  {
    id: DEMO.ministryId, firstName: "Alphonse", lastName: "Karangwa", email: "ministry@demo.rw",
    phone: "+250 788 000 006", roles: ["MINISTRY_ADMIN"], permissions: DEFAULT_ROLE_PERMISSIONS.MINISTRY_ADMIN,
    createdAt: daysAgo(700),
  },
  {
    id: DEMO.systemAdminId, firstName: "Sandrine", lastName: "Umutoni", email: "admin@demo.rw",
    phone: "+250 788 000 007", roles: ["SYSTEM_ADMIN"], permissions: DEFAULT_ROLE_PERMISSIONS.SYSTEM_ADMIN,
    createdAt: daysAgo(800),
  },
];

// Extra parents (for school-side volume)
const extraParents: User[] = Array.from({ length: 40 }, (_, i) => {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  return {
    id: `u_p${i + 1}`, firstName, lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.rw`,
    phone: `+250 78${randInt(2, 9)} ${randInt(100, 999)} ${randInt(100, 999)}`,
    roles: ["PARENT"] as User["roles"], permissions: [], createdAt: daysAgo(randInt(30, 400)),
  };
});
users.push(...extraParents);

/* ---------------------------------- teachers ----------------------------------- */

const SUBJECT_SETS = [
  ["Mathematics", "Physics"], ["English", "Literature"], ["Kinyarwanda", "Social Studies"],
  ["Biology", "Chemistry"], ["Geography", "History"], ["ICT"], ["Entrepreneurship", "Economics"],
  ["Physical Education"], ["French"], ["Sciences"],
];

const teachers: TeacherProfile[] = [
  {
    id: DEMO.teacherId, schoolId: DEMO.schoolId, name: "Eric Niyonzima",
    email: "teacher@demo.rw", phone: "+250 788 000 004",
    subjects: ["Mathematics", "Physics"],
    classIds: [UA("S1 A").id, UA("S2 A").id, UA("S4 A").id],
    hiredAt: daysAgo(500),
  },
];
for (let i = 0; i < 9; i++) {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const name = `${firstName} ${lastName}`;
  const tId = `u_t${i + 1}`;
  const assigned = [pick(classes.filter((c) => c.schoolId === DEMO.schoolId)).id, pick(classes.filter((c) => c.schoolId === DEMO.schoolId)).id];
  teachers.push({
    id: tId, schoolId: DEMO.schoolId, name,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@umurav-academy.example.rw`,
    phone: `+250 78${randInt(2, 9)} ${randInt(100, 999)} ${randInt(100, 999)}`,
    subjects: SUBJECT_SETS[i % SUBJECT_SETS.length]!,
    classIds: [...new Set(assigned)], hiredAt: daysAgo(randInt(100, 900)),
  });
  users.push({
    id: tId, firstName, lastName, email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@umurav-academy.example.rw`,
    phone: "+250 788 111 111", roles: ["TEACHER"], permissions: [], schoolId: DEMO.schoolId,
    createdAt: daysAgo(randInt(100, 900)),
  });
}
// Homeroom assignments for umurav classes
classes.filter((c) => c.schoolId === DEMO.schoolId).forEach((c, i) => {
  c.homeroomTeacherId = teachers[i % teachers.length]!.id;
});
// Kivu teacher for parent's third child
const kivuTeacher: TeacherProfile = {
  id: "u_t_lk1", schoolId: DEMO.kivuSchoolId, name: "Claudine Umuhoza",
  email: "claudine.umuhoza@lakekivu-college.example.rw", phone: "+250 788 222 222",
  subjects: ["English", "Kinyarwanda"], classIds: [LK("P5 A").id], hiredAt: daysAgo(700),
};
teachers.push(kivuTeacher);
users.push({
  id: kivuTeacher.id, firstName: "Claudine", lastName: "Umuhoza", email: kivuTeacher.email,
  phone: kivuTeacher.phone, roles: ["TEACHER"], permissions: [], schoolId: DEMO.kivuSchoolId,
  createdAt: daysAgo(700),
});

/* ---------------------------------- students ----------------------------------- */

const students: Student[] = [
  // Demo parent's children
  {
    id: "st_ange", schoolId: DEMO.schoolId, classId: UA("P3 A").id, parentId: DEMO.parentId,
    firstName: "Ange", lastName: "Uwase", gender: "F", dateOfBirth: "2018-03-22",
    status: "ENROLLED", admissionDate: "2024-01-15",
  },
  {
    id: "st_kevin", schoolId: DEMO.schoolId, classId: UA("S2 A").id, parentId: DEMO.parentId,
    firstName: "Kevin", lastName: "Uwase", gender: "M", dateOfBirth: "2012-09-05",
    status: "ENROLLED", admissionDate: "2023-01-16",
  },
  {
    id: "st_keza", schoolId: DEMO.kivuSchoolId, classId: LK("P5 A").id, parentId: DEMO.parentId,
    firstName: "Keza", lastName: "Uwase", gender: "F", dateOfBirth: "2015-11-30",
    status: "ENROLLED", admissionDate: "2022-01-17",
  },
];

// Fill umurav classes with students belonging to the extra parents
let stSeq = 0;
for (const cls of classes.filter((c) => c.schoolId === DEMO.schoolId)) {
  const count = cls.name === "P3 A" || cls.name === "S2 A" ? 23 : 24;
  for (let i = 0; i < count; i++) {
    const parent = pick(extraParents);
    const firstName = pick(FIRST_NAMES);
    stSeq += 1;
    students.push({
      id: `st_${stSeq}`, schoolId: DEMO.schoolId, classId: cls.id, parentId: parent.id,
      firstName, lastName: parent.lastName, gender: rand() > 0.5 ? "F" : "M",
      dateOfBirth: `${2026 - (cls.level === "PRIMARY" ? randInt(7, 12) : randInt(13, 19))}-0${randInt(1, 9)}-1${randInt(0, 9)}`,
      status: "ENROLLED", admissionDate: daysAgo(randInt(150, 900)).slice(0, 10),
    });
  }
}
// A handful of former students (for the Former Students view)
for (let i = 0; i < 6; i++) {
  const parent = pick(extraParents);
  stSeq += 1;
  students.push({
    id: `st_${stSeq}`, schoolId: DEMO.schoolId, classId: pick(classes.filter((c) => c.schoolId === DEMO.schoolId)).id,
    parentId: parent.id, firstName: pick(FIRST_NAMES), lastName: parent.lastName,
    gender: rand() > 0.5 ? "F" : "M", dateOfBirth: "2013-05-10",
    status: i % 2 === 0 ? "FORMER" : "TRANSFERRED", admissionDate: daysAgo(900).slice(0, 10),
    leftAt: daysAgo(randInt(30, 200)).slice(0, 10),
  });
}

/* --------------------------------- fee setup ------------------------------------ */

const feeStructures: FeeStructure[] = [];
const feeDefs: Array<{ name: string; category: FeeStructure["category"]; amount: number; level?: FeeStructure["level"]; optional: boolean }> = [
  { name: "Tuition — Primary", category: "TUITION", amount: 95_000, level: "PRIMARY", optional: false },
  { name: "Tuition — O-Level", category: "TUITION", amount: 150_000, level: "O_LEVEL", optional: false },
  { name: "Tuition — A-Level", category: "TUITION", amount: 180_000, level: "A_LEVEL", optional: false },
  { name: "Lunch programme", category: "LUNCH", amount: 45_000, optional: false },
  { name: "School transport", category: "TRANSPORT", amount: 60_000, optional: true },
  { name: "Uniform set", category: "UNIFORM", amount: 35_000, optional: true },
  { name: "Examination fee", category: "EXAMINATION", amount: 15_000, optional: false },
];
for (const termId of [T1, T2]) {
  feeDefs.forEach((f, i) => {
    feeStructures.push({
      id: `fee_ua_${termId}_${i}`, schoolId: DEMO.schoolId, name: f.name, category: f.category,
      amount: f.amount, level: f.level, termId, optional: f.optional,
    });
  });
}
// Lake Kivu fees (current term only, simpler set)
[
  { name: "Tuition — Primary", category: "TUITION" as const, amount: 45_000, level: "PRIMARY" as const, optional: false },
  { name: "Tuition — O-Level", category: "TUITION" as const, amount: 75_000, level: "O_LEVEL" as const, optional: false },
  { name: "Lunch programme", category: "LUNCH" as const, amount: 30_000, optional: false },
  { name: "Boarding", category: "OTHER" as const, amount: 90_000, optional: true },
].forEach((f, i) => {
  feeStructures.push({ id: `fee_lk_${i}`, schoolId: DEMO.kivuSchoolId, name: f.name, category: f.category, amount: f.amount, level: (f as { level?: FeeStructure["level"] }).level, termId: T2, optional: f.optional });
});

const paymentChannels: PaymentChannel[] = [
  { id: "ch_ua_bank", schoolId: DEMO.schoolId, type: "BANK", label: "Bank of Kigali — School account", accountNumber: "00040-XXXXXX-41", active: true },
  { id: "ch_ua_mtn", schoolId: DEMO.schoolId, type: "MOMO_MTN", label: "MTN MoMo Pay", accountNumber: "*182*8*1*004041#", active: true },
  { id: "ch_ua_airtel", schoolId: DEMO.schoolId, type: "MOMO_AIRTEL", label: "Airtel Money", accountNumber: "*500*5*004041#", active: false },
  { id: "ch_lk_bank", schoolId: DEMO.kivuSchoolId, type: "BANK", label: "BPR — School account", accountNumber: "4002-XXXXXX-102", active: true },
  { id: "ch_lk_mtn", schoolId: DEMO.kivuSchoolId, type: "MOMO_MTN", label: "MTN MoMo Pay", accountNumber: "*182*8*1*002102#", active: true },
];

/* ---------------------------------- payments ----------------------------------- */

const payments: Payment[] = [];
const receipts: Receipt[] = [];
let paySeq = 0;

function seedPayment(opts: {
  student: Student; feeStructure: FeeStructure; daysBack: number;
  status?: Payment["status"]; channel?: Payment["channelType"]; recordedBy?: string;
}): void {
  paySeq += 1;
  const school = schools.find((s) => s.id === opts.student.schoolId)!;
  const parent = users.find((u) => u.id === opts.student.parentId);
  const term = terms.find((t) => t.id === opts.feeStructure.termId)!;
  const reference = `RDP-${String(260_000 + paySeq)}`;
  const payment: Payment = {
    id: `pay_${paySeq}`, schoolId: opts.student.schoolId, studentId: opts.student.id,
    parentId: opts.student.parentId, feeStructureId: opts.feeStructure.id,
    category: opts.feeStructure.category, amount: opts.feeStructure.amount,
    channelType: opts.channel ?? (rand() > 0.4 ? "MOMO_MTN" : "BANK"),
    reference, status: opts.status ?? "COMPLETED", paidAt: daysAgo(opts.daysBack, randInt(-8, 8)),
    termId: opts.feeStructure.termId, recordedBy: opts.recordedBy,
  };
  payments.push(payment);
  if (payment.status === "COMPLETED") {
    receipts.push({
      id: `rcp_${paySeq}`, paymentId: payment.id, reference,
      schoolId: school.id, schoolName: school.name,
      studentId: opts.student.id, studentName: `${opts.student.firstName} ${opts.student.lastName}`,
      parentName: parent ? `${parent.firstName} ${parent.lastName}` : "Parent",
      amount: payment.amount, category: payment.category, channelType: payment.channelType,
      termLabel: term.label, issuedAt: payment.paidAt,
    });
  }
}

const uaFeesT2 = feeStructures.filter((f) => f.schoolId === DEMO.schoolId && f.termId === T2);
const uaFeesT1 = feeStructures.filter((f) => f.schoolId === DEMO.schoolId && f.termId === T1);
const lkFees = feeStructures.filter((f) => f.schoolId === DEMO.kivuSchoolId);
const ange = students.find((s) => s.id === "st_ange")!;
const kevin = students.find((s) => s.id === "st_kevin")!;
const keza = students.find((s) => s.id === "st_keza")!;

// Demo parent: T1 fully paid for both umurav children; T2 partially paid.
for (const f of uaFeesT1.filter((f) => !f.optional)) {
  if (!f.level || f.level === "PRIMARY") seedPayment({ student: ange, feeStructure: f, daysBack: randInt(95, 150) });
  if (!f.level || f.level === "O_LEVEL") seedPayment({ student: kevin, feeStructure: f, daysBack: randInt(95, 150) });
}
seedPayment({ student: ange, feeStructure: uaFeesT2.find((f) => f.category === "TUITION" && f.level === "PRIMARY")!, daysBack: 55, channel: "MOMO_MTN" });
seedPayment({ student: ange, feeStructure: uaFeesT2.find((f) => f.category === "LUNCH")!, daysBack: 41 });
seedPayment({ student: kevin, feeStructure: uaFeesT2.find((f) => f.category === "TUITION" && f.level === "O_LEVEL")!, daysBack: 50, channel: "BANK" });
// Keza at Lake Kivu: tuition paid, lunch outstanding
seedPayment({ student: keza, feeStructure: lkFees.find((f) => f.category === "TUITION" && f.level === "PRIMARY")!, daysBack: 60, channel: "MOMO_MTN" });
// One pending payment (in-flight MoMo)
seedPayment({ student: kevin, feeStructure: uaFeesT2.find((f) => f.category === "EXAMINATION")!, daysBack: 0, status: "PENDING", channel: "MOMO_MTN" });

// Volume for the school ledger: other umurav students paying T2 fees
const uaStudents = students.filter((s) => s.schoolId === DEMO.schoolId && s.status === "ENROLLED" && s.parentId !== DEMO.parentId);
for (let i = 0; i < 130; i++) {
  const st = pick(uaStudents);
  const cls = classes.find((c) => c.id === st.classId)!;
  const candidates = uaFeesT2.filter((f) => !f.level || f.level === cls.level);
  seedPayment({
    student: st, feeStructure: pick(candidates), daysBack: randInt(0, 70),
    status: rand() > 0.93 ? "FAILED" : "COMPLETED",
    recordedBy: rand() > 0.85 ? "Beata Mukamana" : undefined,
  });
}

/* --------------------------------- admissions ---------------------------------- */

const admissions: AdmissionApplication[] = [];

const doc = (type: DocumentRef["type"], fileName: string, status: DocumentRef["status"] = "PENDING"): DocumentRef => ({
  id: `doc_${Math.floor(rand() * 1e9).toString(36)}`, type, fileName, uploadedAt: daysAgo(randInt(1, 30)), status,
});

// Demo parent's application to Nyungwe Valley Academy (4th child, under review)
admissions.push({
  id: "adm_demo_1", schoolId: "sch_nyungwe", parentId: DEMO.parentId, parentName: "Immaculée Uwase",
  childFirstName: "Igor", childLastName: "Uwase", gender: "M", dateOfBirth: "2020-02-14",
  levelApplied: "PRIMARY", previousSchool: "—",
  documents: [doc("BIRTH_CERTIFICATE", "igor-birth-certificate.pdf", "VERIFIED"), doc("PARENT_ID", "parent-id.pdf", "VERIFIED")],
  status: "UNDER_REVIEW", submittedAt: daysAgo(9),
  timeline: [
    { at: daysAgo(9), status: "SUBMITTED", actor: "Immaculée Uwase" },
    { at: daysAgo(6), status: "UNDER_REVIEW", actor: "Admissions office", note: "Documents received and being verified." },
  ],
});

// Incoming applications for the demo school
const admStatuses: AdmissionApplication["status"][] = [
  "SUBMITTED", "SUBMITTED", "SUBMITTED", "UNDER_REVIEW", "UNDER_REVIEW", "UNDER_REVIEW",
  "INFO_REQUESTED", "APPROVED", "APPROVED", "REJECTED", "WAITLISTED", "SUBMITTED", "UNDER_REVIEW", "WAITLISTED",
];
admStatuses.forEach((status, i) => {
  const parent = pick(extraParents);
  const firstName = pick(FIRST_NAMES);
  const level = pick(["PRIMARY", "O_LEVEL", "A_LEVEL"] as const);
  const submittedAt = daysAgo(randInt(2, 40));
  const timeline: AdmissionApplication["timeline"] = [{ at: submittedAt, status: "SUBMITTED", actor: `${parent.firstName} ${parent.lastName}` }];
  if (status !== "SUBMITTED") timeline.push({ at: daysAgo(randInt(1, 5)), status, actor: "Admissions office" });
  admissions.push({
    id: `adm_ua_${i + 1}`, schoolId: DEMO.schoolId, parentId: parent.id,
    parentName: `${parent.firstName} ${parent.lastName}`,
    childFirstName: firstName, childLastName: parent.lastName,
    gender: rand() > 0.5 ? "F" : "M",
    dateOfBirth: `${level === "PRIMARY" ? 2019 : 2011}-0${randInt(1, 9)}-0${randInt(1, 9)}`,
    levelApplied: level, previousSchool: rand() > 0.5 ? pick(schools).name : undefined,
    documents: [
      doc("BIRTH_CERTIFICATE", "birth-certificate.pdf", status === "APPROVED" ? "VERIFIED" : "PENDING"),
      doc("ACADEMIC_RECORDS", "previous-report.pdf"),
    ],
    status, submittedAt, timeline,
  });
});

/* -------------------------------- announcements -------------------------------- */

const announcements: Announcement[] = [
  {
    id: "ann_nat_1", schoolId: null, title: "2026 Term 3 national calendar confirmed",
    body: "The Ministry confirms Term 3 of the 2026 academic year runs 7 September – 11 December. Schools should publish local calendars and fee structures by 15 August.",
    category: "CIRCULAR", audience: "SCHOOLS", authorName: "Ministry of Education",
    publishedAt: daysAgo(12), pinned: true,
  },
  {
    id: "ann_ua_1", schoolId: DEMO.schoolId, title: "Parents' meeting — Term 2 progress",
    body: "All parents are invited to the Term 2 progress meeting on Saturday 25 July at 9:00 in the main hall. Homeroom teachers will share class reports; the fees office will be open for questions.",
    category: "MEETING", audience: "PARENTS", authorName: "Jean-Claude Mugisha",
    publishedAt: daysAgo(4), pinned: true,
  },
  {
    id: "ann_ua_2", schoolId: DEMO.schoolId, title: "Science fair — visitors welcome",
    body: "Our annual science fair takes place Friday 31 July. Parents and guardians are welcome from 14:00. Students should submit project titles to their science teachers by 22 July.",
    category: "EVENT", audience: "ALL", authorName: "Academic office",
    publishedAt: daysAgo(2), pinned: false,
  },
  {
    id: "ann_ua_3", schoolId: DEMO.schoolId, title: "Early closure — staff training",
    body: "School will close at 12:30 on Wednesday 22 July for staff professional development. Transport will run at 12:45. Lunch will be served before departure.",
    category: "CLOSURE", audience: "ALL", authorName: "Administration",
    publishedAt: daysAgo(1), pinned: false,
  },
  {
    id: "ann_lk_1", schoolId: DEMO.kivuSchoolId, title: "Reading week and book drive",
    body: "Lake Kivu College's reading week begins 27 July. We welcome book donations at the front office. P5 and P6 will present book reviews on Friday.",
    category: "EVENT", audience: "PARENTS", authorName: "Library team",
    publishedAt: daysAgo(3), pinned: false,
  },
  {
    id: "ann_ua_4", schoolId: DEMO.schoolId, title: "Staff notice: gradebook deadline",
    body: "Teachers should complete Term 2 continuous assessment entries in the gradebook by 5 August, ahead of report generation.",
    category: "GENERAL", audience: "TEACHERS", authorName: "Academic office",
    publishedAt: daysAgo(5), pinned: false,
  },
];

/* ----------------------------- messages & threads ------------------------------ */

const threads: MessageThread[] = [
  {
    id: "th_1", subject: "Kevin — Mathematics progress", schoolId: DEMO.schoolId,
    studentId: "st_kevin", studentName: "Kevin Uwase",
    participants: [
      { id: DEMO.parentId, name: "Immaculée Uwase", role: "PARENT" },
      { id: DEMO.teacherId, name: "Eric Niyonzima", role: "TEACHER" },
    ],
    lastMessageAt: daysAgo(0, -2), lastMessagePreview: "Thank you — we will practice the revision set this weekend.",
    unreadCount: 1,
  },
  {
    id: "th_2", subject: "Transport route change request", schoolId: DEMO.schoolId,
    studentId: "st_ange", studentName: "Ange Uwase",
    participants: [
      { id: DEMO.parentId, name: "Immaculée Uwase", role: "PARENT" },
      { id: DEMO.schoolAdminId, name: "School office", role: "SCHOOL_ADMIN" },
    ],
    lastMessageAt: daysAgo(2), lastMessagePreview: "The Kimironko route has a seat available from August — shall we reserve it?",
    unreadCount: 0,
  },
  {
    id: "th_3", subject: "Keza — reading club permission", schoolId: DEMO.kivuSchoolId,
    studentId: "st_keza", studentName: "Keza Uwase",
    participants: [
      { id: DEMO.parentId, name: "Immaculée Uwase", role: "PARENT" },
      { id: kivuTeacher.id, name: "Claudine Umuhoza", role: "TEACHER" },
    ],
    lastMessageAt: daysAgo(6), lastMessagePreview: "Keza has been selected for the inter-school reading club!",
    unreadCount: 0,
  },
];

const messages: Message[] = [
  { id: "msg_1", threadId: "th_1", senderId: DEMO.teacherId, senderName: "Eric Niyonzima", senderRole: "TEACHER", body: "Muraho! Kevin scored 68% on the Term 2 mid-test — a good improvement from 54%. He still rushes word problems; I recommend 20 minutes of practice on the revision set I shared in class.", sentAt: daysAgo(1) },
  { id: "msg_2", threadId: "th_1", senderId: DEMO.parentId, senderName: "Immaculée Uwase", senderRole: "PARENT", body: "Thank you for the update, this is encouraging. Which topics should we prioritise at home?", sentAt: daysAgo(0, -4) },
  { id: "msg_3", threadId: "th_1", senderId: DEMO.teacherId, senderName: "Eric Niyonzima", senderRole: "TEACHER", body: "Fractions in word problems and unit conversions. Thank you — we will practice the revision set this weekend.", sentAt: daysAgo(0, -2) },
  { id: "msg_4", threadId: "th_2", senderId: DEMO.parentId, senderName: "Immaculée Uwase", senderRole: "PARENT", body: "Hello — from next term Ange will be picked up from Kimironko instead of Remera. Is there space on that route?", sentAt: daysAgo(3) },
  { id: "msg_5", threadId: "th_2", senderId: DEMO.schoolAdminId, senderName: "School office", senderRole: "SCHOOL_ADMIN", body: "The Kimironko route has a seat available from August — shall we reserve it?", sentAt: daysAgo(2) },
  { id: "msg_6", threadId: "th_3", senderId: kivuTeacher.id, senderName: "Claudine Umuhoza", senderRole: "TEACHER", body: "Keza has been selected for the inter-school reading club! Please sign the permission form in her bag by Friday.", sentAt: daysAgo(6) },
];

/* -------------------------------- notifications -------------------------------- */

const notifications: AppNotification[] = [
  { id: "nt_p1", userId: DEMO.parentId, type: "MESSAGE", title: "New message from Eric Niyonzima", body: "Kevin — Mathematics progress", read: false, createdAt: daysAgo(0, -2), link: "/parent/messages" },
  { id: "nt_p2", userId: DEMO.parentId, type: "ADMISSION", title: "Application under review", body: "Nyungwe Valley Academy is reviewing Igor's application.", read: false, createdAt: daysAgo(6), link: "/parent/applications" },
  { id: "nt_p3", userId: DEMO.parentId, type: "PAYMENT", title: "Payment pending", body: "Examination fee for Kevin (RWF 15,000) is awaiting MoMo confirmation.", read: false, createdAt: daysAgo(0, -1), link: "/parent/payments" },
  { id: "nt_p4", userId: DEMO.parentId, type: "ANNOUNCEMENT", title: "Parents' meeting — 25 July", body: "umurav Academy invites you to the Term 2 progress meeting.", read: true, createdAt: daysAgo(4), link: "/parent/announcements" },
  { id: "nt_s1", userId: DEMO.schoolAdminId, type: "ADMISSION", title: "3 new applications", body: "New admission applications are waiting for review.", read: false, createdAt: daysAgo(1), link: "/school/admissions" },
  { id: "nt_s2", userId: DEMO.schoolAdminId, type: "TRANSFER", title: "Transfer request", body: "A parent requested a transfer for a P4 student.", read: false, createdAt: daysAgo(2), link: "/school/transfers" },
  { id: "nt_s3", userId: DEMO.schoolAdminId, type: "RECRUITMENT", title: "8 applicants for Mathematics teacher", body: "Your vacancy is attracting applications.", read: true, createdAt: daysAgo(3), link: "/school/recruitment" },
  { id: "nt_t1", userId: DEMO.teacherId, type: "MESSAGE", title: "Reply from Immaculée Uwase", body: "Which topics should we prioritise at home?", read: false, createdAt: daysAgo(0, -4), link: "/teacher/messages" },
  { id: "nt_t2", userId: DEMO.teacherId, type: "ANNOUNCEMENT", title: "Gradebook deadline 5 August", body: "Complete Term 2 assessment entries before report generation.", read: false, createdAt: daysAgo(5), link: "/teacher/announcements" },
  { id: "nt_a1", userId: DEMO.applicantId, type: "RECRUITMENT", title: "You were shortlisted", body: "Urumuri Girls School shortlisted you for Physics Teacher.", read: false, createdAt: daysAgo(1), link: "/applicant/applications" },
  { id: "nt_m1", userId: DEMO.ministryId, type: "SYSTEM", title: "Monthly enrollment digest ready", body: "June 2026 national enrollment digest has been generated.", read: false, createdAt: daysAgo(2), link: "/ministry/reports" },
  { id: "nt_ad1", userId: DEMO.systemAdminId, type: "SYSTEM", title: "2 onboarding requests pending", body: "New schools are waiting for verification.", read: false, createdAt: daysAgo(1), link: "/admin/schools" },
];

/* --------------------------------- attendance ---------------------------------- */

const attendance: AttendanceRecord[] = [];
let attSeq = 0;
// Last 12 weekdays for each of the demo teacher's classes
const teacherClasses = teachers.find((t) => t.id === DEMO.teacherId)!.classIds;
const schoolDays: string[] = [];
for (let d = 0; schoolDays.length < 12; d++) {
  const date = new Date(NOW - d * DAY);
  const day = date.getUTCDay();
  if (day !== 0 && day !== 6) schoolDays.push(date.toISOString().slice(0, 10));
}
for (const classId of teacherClasses) {
  const classStudents = students.filter((s) => s.classId === classId && s.status === "ENROLLED");
  for (const date of schoolDays) {
    for (const st of classStudents) {
      const r = rand();
      attSeq += 1;
      attendance.push({
        id: `att_${attSeq}`, classId, studentId: st.id, date,
        status: r > 0.94 ? "ABSENT" : r > 0.9 ? "LATE" : r > 0.88 ? "EXCUSED" : "PRESENT",
        markedBy: DEMO.teacherId,
      });
    }
  }
}

/* --------------------------------- assessments --------------------------------- */

const assessments: Assessment[] = [];
const grades: Grade[] = [];
let gSeq = 0;

function seedAssessment(opts: {
  classId: string; teacherId: string; subject: string; title: string;
  type: Assessment["type"]; maxScore: number; daysBack: number; termId: string;
}) {
  const id = `as_${assessments.length + 1}`;
  assessments.push({
    id, schoolId: DEMO.schoolId, classId: opts.classId, teacherId: opts.teacherId,
    subject: opts.subject, title: opts.title, type: opts.type, maxScore: opts.maxScore,
    date: dateOnly(opts.daysBack), termId: opts.termId,
  });
  for (const st of students.filter((s) => s.classId === opts.classId && s.status === "ENROLLED")) {
    gSeq += 1;
    // Kevin gets a deliberate improvement arc in Mathematics
    const isKevin = st.id === "st_kevin" && opts.subject === "Mathematics";
    const base = isKevin ? (opts.daysBack > 60 ? 54 : 68) : randInt(38, 96);
    grades.push({
      id: `gr_${gSeq}`, assessmentId: id, studentId: st.id,
      score: Math.round((base / 100) * opts.maxScore),
      comment: isKevin ? "Improving steadily — keep practicing word problems." : rand() > 0.85 ? pick(["Excellent work.", "Needs more revision.", "Very attentive in class.", "Late submission."]) : undefined,
    });
  }
}

for (const classId of teacherClasses) {
  seedAssessment({ classId, teacherId: DEMO.teacherId, subject: "Mathematics", title: "Term 1 final exam", type: "EXAM", maxScore: 100, daysBack: 95, termId: T1 });
  seedAssessment({ classId, teacherId: DEMO.teacherId, subject: "Mathematics", title: "Algebra quiz", type: "QUIZ", maxScore: 20, daysBack: 38, termId: T2 });
  seedAssessment({ classId, teacherId: DEMO.teacherId, subject: "Mathematics", title: "Term 2 mid-test", type: "TEST", maxScore: 50, daysBack: 21, termId: T2 });
  seedAssessment({ classId, teacherId: DEMO.teacherId, subject: "Physics", title: "Forces & motion assignment", type: "ASSIGNMENT", maxScore: 30, daysBack: 10, termId: T2 });
}
// Grades for Ange (P3) from her homeroom teacher, so the parent view has data
const angeTeacher = classes.find((c) => c.id === ange.classId)!.homeroomTeacherId!;
seedAssessment({ classId: ange.classId, teacherId: angeTeacher, subject: "Kinyarwanda", title: "Reading assessment", type: "TEST", maxScore: 40, daysBack: 25, termId: T2 });
seedAssessment({ classId: ange.classId, teacherId: angeTeacher, subject: "Mathematics", title: "Numbers quiz", type: "QUIZ", maxScore: 20, daysBack: 14, termId: T2 });

/* ---------------------------------- transfers ---------------------------------- */

const transfers: TransferRequest[] = [
  {
    id: "tr_1", studentId: students.find((s) => s.status === "ENROLLED" && s.parentId !== DEMO.parentId)!.id,
    studentName: "Fabrice Habimana", schoolId: DEMO.schoolId, schoolName: "umurav Academy",
    parentId: "u_p3", parentName: "Parent of Fabrice", type: "TRANSFER",
    reason: "Family relocating to Musanze district.", status: "PENDING", requestedAt: daysAgo(2),
  },
  {
    id: "tr_2", studentId: "st_31", studentName: "Clarisse Ndayisaba",
    schoolId: DEMO.schoolId, schoolName: "umurav Academy",
    parentId: "u_p7", parentName: "Parent of Clarisse", type: "RESIGNATION",
    reason: "Moving abroad.", status: "CONFIRMED", requestedAt: daysAgo(40), resolvedAt: daysAgo(33),
  },
];

/* --------------------------------- recruitment --------------------------------- */

const vacancies: Vacancy[] = [
  {
    id: "vac_1", schoolId: DEMO.schoolId, schoolName: "umurav Academy", district: "Gasabo",
    title: "Mathematics Teacher (O-Level)", positionType: "TEACHER", subject: "Mathematics",
    employmentType: "FULL_TIME", salaryRange: { min: 250_000, max: 380_000 },
    description: "We are looking for an experienced O-Level Mathematics teacher to join our sciences department from Term 3.",
    requirements: ["Bachelor's degree in Education or Mathematics", "3+ years teaching experience", "REB registration", "Strong classroom technology skills"],
    deadline: daysAgo(-14), status: "OPEN", postedAt: daysAgo(10), applicantsCount: 8,
  },
  {
    id: "vac_2", schoolId: DEMO.schoolId, schoolName: "umurav Academy", district: "Gasabo",
    title: "School Accountant", positionType: "ACCOUNTANT",
    employmentType: "FULL_TIME", salaryRange: { min: 300_000, max: 450_000 },
    description: "Manage fees collection, reconciliation and reporting for a 1,000+ student school.",
    requirements: ["Accounting degree (CPA is an advantage)", "Experience with school or SME accounting", "Integrity and attention to detail"],
    deadline: daysAgo(-21), status: "OPEN", postedAt: daysAgo(6), applicantsCount: 5,
  },
  {
    id: "vac_3", schoolId: "sch_urumuri", schoolName: "Urumuri Girls School", district: "Muhanga",
    title: "Physics Teacher (A-Level)", positionType: "TEACHER", subject: "Physics",
    employmentType: "FULL_TIME",
    description: "A-Level Physics teacher for our sciences combinations; boarding school allowances included.",
    requirements: ["Bachelor's in Physics or Education", "A-Level teaching experience", "Willing to live on campus"],
    deadline: daysAgo(-7), status: "OPEN", postedAt: daysAgo(15), applicantsCount: 12,
  },
  {
    id: "vac_4", schoolId: DEMO.kivuSchoolId, schoolName: "Lake Kivu College", district: "Rubavu",
    title: "School Librarian", positionType: "LIBRARIAN",
    employmentType: "PART_TIME",
    description: "Run our library and reading programme, three days a week.",
    requirements: ["Library science or literature background", "Passion for children's reading"],
    deadline: daysAgo(-10), status: "OPEN", postedAt: daysAgo(8), applicantsCount: 3,
  },
  {
    id: "vac_5", schoolId: "sch_amahoro", schoolName: "Amahoro International School", district: "Nyarugenge",
    title: "School Driver", positionType: "DRIVER",
    employmentType: "FULL_TIME",
    description: "Safe, punctual driver for our Kigali transport routes.",
    requirements: ["Category D licence", "5+ years experience", "Clean driving record"],
    deadline: daysAgo(-5), status: "OPEN", postedAt: daysAgo(12), applicantsCount: 9,
  },
  {
    id: "vac_6", schoolId: "sch_isonga", schoolName: "Isonga TVET Institute", district: "Huye",
    title: "ICT Trainer", positionType: "TEACHER", subject: "ICT",
    employmentType: "CONTRACT",
    description: "Deliver practical ICT modules (networking, office applications) to TVET learners.",
    requirements: ["ICT diploma or degree", "Industry experience preferred"],
    deadline: daysAgo(-18), status: "OPEN", postedAt: daysAgo(4), applicantsCount: 6,
  },
  {
    id: "vac_7", schoolId: "sch_kabuye", schoolName: "Mount Kabuye School", district: "Musanze",
    title: "English Teacher (Primary)", positionType: "TEACHER", subject: "English",
    employmentType: "FULL_TIME",
    description: "Primary English teacher with phonics experience.",
    requirements: ["Education degree", "Phonics training an advantage"],
    deadline: daysAgo(3), status: "CLOSED", postedAt: daysAgo(45), applicantsCount: 17,
  },
];

const applicantProfiles: ApplicantProfile[] = [
  {
    userId: DEMO.applicantId, headline: "Physics & Mathematics teacher — 6 years experience",
    bio: "Passionate secondary school teacher specialised in Physics and Mathematics, with experience preparing candidates for national examinations and running STEM clubs.",
    district: "Kigali City", subjects: ["Physics", "Mathematics"], experienceYears: 6,
    education: [
      { qualification: "BSc Physics with Education", institution: "University of Rwanda — College of Education", year: 2019 },
      { qualification: "A-Level (PCM)", institution: "Urumuri Girls School", year: 2015 },
    ],
    experience: [
      { title: "Physics Teacher", organization: "Gasabo Hills School", from: "2022-01", description: "A-Level Physics; led the school to district science fair finals." },
      { title: "Mathematics Teacher", organization: "Intare Combined School", from: "2019-02", to: "2021-12", description: "O-Level Mathematics across four streams." },
    ],
    documents: [doc("CV", "divine-ingabire-cv.pdf", "VERIFIED"), doc("LICENSE", "reb-registration.pdf", "VERIFIED")],
  },
];

const jobApplications: JobApplication[] = [
  {
    id: "japp_1", vacancyId: "vac_3", vacancyTitle: "Physics Teacher (A-Level)", schoolName: "Urumuri Girls School",
    applicantId: DEMO.applicantId, applicantName: "Divine Ingabire",
    applicantHeadline: "Physics & Mathematics teacher — 6 years experience",
    coverLetter: "I have prepared A-Level candidates in Physics for four national examination cycles and would be honoured to join Urumuri's renowned sciences programme.",
    cvFileName: "divine-ingabire-cv.pdf", stage: "SHORTLISTED", appliedAt: daysAgo(9),
    timeline: [
      { at: daysAgo(9), stage: "APPLIED" },
      { at: daysAgo(1), stage: "SHORTLISTED", note: "Invited to teaching demonstration on 28 July." },
    ],
  },
  {
    id: "japp_2", vacancyId: "vac_1", vacancyTitle: "Mathematics Teacher (O-Level)", schoolName: "umurav Academy",
    applicantId: DEMO.applicantId, applicantName: "Divine Ingabire",
    applicantHeadline: "Physics & Mathematics teacher — 6 years experience",
    coverLetter: "My O-Level Mathematics results at Intare Combined School improved pass rates by 18 percentage points over two years.",
    cvFileName: "divine-ingabire-cv.pdf", stage: "APPLIED", appliedAt: daysAgo(5),
    timeline: [{ at: daysAgo(5), stage: "APPLIED" }],
  },
  {
    id: "japp_3", vacancyId: "vac_7", vacancyTitle: "English Teacher (Primary)", schoolName: "Mount Kabuye School",
    applicantId: DEMO.applicantId, applicantName: "Divine Ingabire",
    applicantHeadline: "Physics & Mathematics teacher — 6 years experience",
    coverLetter: "Although my specialisation is sciences, I hold a phonics certificate and taught lower primary English for one year.",
    cvFileName: "divine-ingabire-cv.pdf", stage: "REJECTED", appliedAt: daysAgo(30),
    timeline: [
      { at: daysAgo(30), stage: "APPLIED" },
      { at: daysAgo(20), stage: "REJECTED", note: "Position filled by a primary-specialised candidate." },
    ],
  },
];

// Pipeline volume for the demo school's Mathematics vacancy
const pipelineStages: JobApplication["stage"][] = ["APPLIED", "APPLIED", "APPLIED", "SHORTLISTED", "SHORTLISTED", "INTERVIEW", "OFFERED", "REJECTED"];
pipelineStages.forEach((stage, i) => {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const appId = `japp_ua_${i + 1}`;
  const applicantId = `u_app${i + 1}`;
  const headline = pick([
    "Mathematics teacher — 4 years experience", "Recent education graduate, mathematics major",
    "O-Level maths specialist", "STEM educator and club mentor",
  ]);
  jobApplications.push({
    id: appId, vacancyId: "vac_1", vacancyTitle: "Mathematics Teacher (O-Level)", schoolName: "umurav Academy",
    applicantId, applicantName: `${firstName} ${lastName}`, applicantHeadline: headline,
    coverLetter: "I am excited to apply for the Mathematics Teacher role and contribute to umurav Academy's strong sciences record.",
    cvFileName: `${firstName.toLowerCase()}-${lastName.toLowerCase()}-cv.pdf`,
    stage, appliedAt: daysAgo(randInt(2, 9)),
    timeline: [{ at: daysAgo(randInt(2, 9)), stage: "APPLIED" }],
  });
  applicantProfiles.push({
    userId: applicantId, headline, bio: "Dedicated educator focused on learner outcomes.",
    district: pick(["Gasabo", "Kicukiro", "Nyarugenge", "Musanze"]), subjects: ["Mathematics"],
    experienceYears: randInt(1, 8),
    education: [{ qualification: "BEd Mathematics", institution: "University of Rwanda", year: randInt(2015, 2024) }],
    experience: [], documents: [],
  });
});

/* -------------------------------- staff & roles -------------------------------- */

const roleDefs: RoleDefinition[] = [
  {
    id: "role_sys_admin", schoolId: null, name: "System Administrator",
    description: "Full platform access.", permissions: DEFAULT_ROLE_PERMISSIONS.SYSTEM_ADMIN, system: true,
  },
  {
    id: "role_ministry", schoolId: null, name: "Education Authority",
    description: "National oversight, statistics and reporting.", permissions: DEFAULT_ROLE_PERMISSIONS.MINISTRY_ADMIN, system: true,
  },
  {
    id: "role_school_admin", schoolId: null, name: "School Administrator",
    description: "Full access within their school.", permissions: [...ALL_SCHOOL_PERMISSIONS], system: true,
  },
  {
    id: "role_ua_accountant", schoolId: DEMO.schoolId, name: "Accountant",
    description: "Fees, payments and accounting.",
    permissions: [P.SCHOOL_DASHBOARD_VIEW, P.FEES_VIEW, P.FEES_CONFIGURE, P.PAYMENTS_VIEW, P.PAYMENTS_RECORD, P.ACCOUNTING_VIEW, P.ACCOUNTING_EXPORT, P.STUDENTS_VIEW],
    system: false,
  },
  {
    id: "role_ua_registrar", schoolId: DEMO.schoolId, name: "Registrar",
    description: "Admissions, students and transfers.",
    permissions: [P.SCHOOL_DASHBOARD_VIEW, P.ADMISSIONS_VIEW, P.ADMISSIONS_REVIEW, P.STUDENTS_VIEW, P.STUDENTS_MANAGE, P.CLASSES_VIEW, P.TRANSFERS_VIEW, P.TRANSFERS_MANAGE],
    system: false,
  },
  {
    id: "role_ua_comms", schoolId: DEMO.schoolId, name: "Communications Officer",
    description: "Announcements and parent messaging.",
    permissions: [P.SCHOOL_DASHBOARD_VIEW, P.ANNOUNCEMENTS_VIEW, P.ANNOUNCEMENTS_PUBLISH, P.MESSAGES_VIEW, P.MESSAGES_SEND],
    system: false,
  },
];

const staff: StaffMember[] = [
  { id: "stf_1", schoolId: DEMO.schoolId, userId: DEMO.accountantId, name: "Beata Mukamana", email: "accountant@demo.rw", roleId: "role_ua_accountant", roleName: "Accountant", status: "ACTIVE", joinedAt: daysAgo(310) },
  { id: "stf_2", schoolId: DEMO.schoolId, userId: "u_stf2", name: "Olivier Byiringiro", email: "olivier.byiringiro@umurav-academy.example.rw", roleId: "role_ua_registrar", roleName: "Registrar", status: "ACTIVE", joinedAt: daysAgo(200) },
  { id: "stf_3", schoolId: DEMO.schoolId, userId: "u_stf3", name: "Josiane Mutesi", email: "josiane.mutesi@umurav-academy.example.rw", roleId: "role_ua_comms", roleName: "Communications Officer", status: "INVITED", joinedAt: daysAgo(3) },
];

/* ------------------------------ onboarding requests ---------------------------- */

const onboardingRequests: SchoolOnboardingRequest[] = [
  {
    id: "onb_1", schoolName: "Kigali Riverside School", type: "PRIVATE", district: "Kicukiro", sector: "Gahanga",
    contactName: "Innocent Rukundo", contactEmail: "director@riverside.example.rw", contactPhone: "+250 788 333 001",
    message: "New primary school opening January 2027, 400 seats.",
    status: "PENDING", submittedAt: daysAgo(2),
    documents: [doc("LICENSE", "operating-license.pdf"), doc("OTHER", "registration-certificate.pdf")],
  },
  {
    id: "onb_2", schoolName: "Akagera Science School", type: "GOVERNMENT_AIDED", district: "Nyagatare", sector: "Karangazi",
    contactName: "Vestine Niyigena", contactEmail: "head@akagera-science.example.rw", contactPhone: "+250 788 333 002",
    status: "VERIFYING", submittedAt: daysAgo(8),
    documents: [doc("LICENSE", "district-authorization.pdf", "VERIFIED")],
  },
  {
    id: "onb_3", schoolName: "Huye Hillside Academy", type: "PRIVATE", district: "Huye", sector: "Tumba",
    contactName: "Egide Hakizimana", contactEmail: "info@hillside.example.rw", contactPhone: "+250 788 333 003",
    status: "APPROVED", submittedAt: daysAgo(30),
    documents: [doc("LICENSE", "operating-license.pdf", "VERIFIED")],
  },
];

/* ---------------------------------- audit log ---------------------------------- */

const auditLog: AuditLogEntry[] = [
  { id: "aud_1", actorName: "Sandrine Umutoni", actorRole: "SYSTEM_ADMIN", action: "SCHOOL_APPROVED", target: "Huye Hillside Academy", detail: "Onboarding request approved after document verification.", at: daysAgo(30) },
  { id: "aud_2", actorName: "Jean-Claude Mugisha", actorRole: "SCHOOL_ADMIN", action: "ROLE_CREATED", target: "Communications Officer", detail: "Custom role with 5 permissions.", at: daysAgo(3, -2) },
  { id: "aud_3", actorName: "Jean-Claude Mugisha", actorRole: "SCHOOL_ADMIN", action: "STAFF_INVITED", target: "Josiane Mutesi", detail: "Invited as Communications Officer.", at: daysAgo(3) },
  { id: "aud_4", actorName: "Beata Mukamana", actorRole: "SCHOOL_STAFF", action: "PAYMENT_RECORDED", target: "RDP-260112", detail: "Offline bank payment recorded manually.", at: daysAgo(4) },
  { id: "aud_5", actorName: "Alphonse Karangwa", actorRole: "MINISTRY_ADMIN", action: "REPORT_GENERATED", target: "June 2026 national digest", at: daysAgo(2) },
  { id: "aud_6", actorName: "Sandrine Umutoni", actorRole: "SYSTEM_ADMIN", action: "USER_SUSPENDED", target: "spam.account@example.rw", detail: "Repeated abuse reports.", at: daysAgo(11) },
  { id: "aud_7", actorName: "Jean-Claude Mugisha", actorRole: "SCHOOL_ADMIN", action: "VACANCY_PUBLISHED", target: "Mathematics Teacher (O-Level)", at: daysAgo(10) },
  { id: "aud_8", actorName: "Sandrine Umutoni", actorRole: "SYSTEM_ADMIN", action: "SETTINGS_UPDATED", target: "Payment channels", detail: "Enabled Airtel Money nationally.", at: daysAgo(15) },
];

/* --------------------------------- district stats ------------------------------ */

const districtStats: DistrictStat[] = [
  { district: "Gasabo", schools: 148, enrolled: 96_500, capacity: 104_200, teacherGap: 210, transfersOut: 340, transfersIn: 415, satisfaction: 4.1 },
  { district: "Kicukiro", schools: 96, enrolled: 61_800, capacity: 66_100, teacherGap: 122, transfersOut: 214, transfersIn: 268, satisfaction: 4.0 },
  { district: "Nyarugenge", schools: 74, enrolled: 45_200, capacity: 50_900, teacherGap: 88, transfersOut: 190, transfersIn: 176, satisfaction: 4.2 },
  { district: "Musanze", schools: 112, enrolled: 78_400, capacity: 81_000, teacherGap: 174, transfersOut: 156, transfersIn: 142, satisfaction: 4.0 },
  { district: "Rubavu", schools: 105, enrolled: 74_100, capacity: 79_800, teacherGap: 168, transfersOut: 148, transfersIn: 131, satisfaction: 3.9 },
  { district: "Huye", schools: 88, enrolled: 59_300, capacity: 64_400, teacherGap: 96, transfersOut: 122, transfersIn: 119, satisfaction: 4.1 },
  { district: "Muhanga", schools: 79, enrolled: 52_600, capacity: 57_300, teacherGap: 84, transfersOut: 96, transfersIn: 104, satisfaction: 4.3 },
  { district: "Rwamagana", schools: 71, enrolled: 48_900, capacity: 55_700, teacherGap: 102, transfersOut: 88, transfersIn: 97, satisfaction: 3.8 },
  { district: "Nyagatare", schools: 93, enrolled: 68_700, capacity: 78_500, teacherGap: 190, transfersOut: 74, transfersIn: 86, satisfaction: 3.7 },
  { district: "Rusizi", schools: 84, enrolled: 56_200, capacity: 63_800, teacherGap: 142, transfersOut: 69, transfersIn: 58, satisfaction: 3.9 },
  { district: "Nyamagabe", schools: 76, enrolled: 49_800, capacity: 58_100, teacherGap: 129, transfersOut: 61, transfersIn: 49, satisfaction: 3.8 },
  { district: "Gicumbi", schools: 89, enrolled: 60_400, capacity: 69_000, teacherGap: 155, transfersOut: 82, transfersIn: 71, satisfaction: 3.9 },
];

/* ---------------------------------- incidents ----------------------------------- */

const incidents: Incident[] = [
  {
    id: "inc_1",
    referenceCode: "INC-8F3K2N1Q",
    schoolId: DEMO.schoolId,
    reporterType: "ANONYMOUS",
    identityProtected: true,
    category: "BULLYING",
    subjectType: "STUDENT",
    subjectName: "A P5 student",
    title: "Repeated bullying near the sports field",
    description:
      "A group of older students has been targeting a younger student during break time for the past two weeks, taking their lunch money and threatening them if they tell a teacher.",
    location: "Sports field, east side",
    immediateDanger: false,
    severity: "MEDIUM",
    status: "SCHOOL_RESPONSE_REQUESTED",
    authorityNotifiedAt: daysAgo(6),
    evidence: [],
    createdAt: daysAgo(7),
  },
  {
    id: "inc_2",
    referenceCode: "INC-4R7T9B2X",
    schoolId: DEMO.schoolId,
    reporterType: "PARENT",
    reporterName: "Concerned parent",
    reporterEmail: "parent.watch@example.rw",
    identityProtected: false,
    category: "UNSAFE_CONDITIONS",
    subjectType: "UNKNOWN",
    title: "Exposed electrical wiring in the P3 classroom block",
    description:
      "There is exposed wiring hanging near the ceiling in the P3 classroom block that students can reach when standing on desks. It has been like this since the term started.",
    location: "P3 classroom block",
    immediateDanger: true,
    severity: "HIGH",
    status: "REVIEWING",
    evidence: [{ id: "ev_1", filename: "wiring-photo.jpg" }],
    createdAt: daysAgo(3),
  },
  {
    id: "inc_3",
    referenceCode: "INC-2Q5W8L4M",
    schoolId: DEMO.kivuSchoolId,
    reporterType: "TEACHER",
    reporterName: "Homeroom teacher",
    identityProtected: false,
    category: "EXAM_MALPRACTICE",
    subjectType: "STUDENT",
    title: "Suspected exam paper leak before the term 2 mathematics exam",
    description:
      "Several students appeared to already know the exact exam questions the morning before the scheduled mathematics exam, matching the sealed paper exactly.",
    immediateDanger: false,
    severity: "MEDIUM",
    status: "RESOLVED",
    authorityNotifiedAt: daysAgo(28),
    schoolAcknowledgedAt: daysAgo(27),
    resolutionSummary: "The exam was re-set and administered under closer invigilation; the source of the leak was traced to a staff photocopying error and addressed with the school.",
    evidence: [],
    createdAt: daysAgo(30),
  },
];

/* ----------------------------------- surveys ----------------------------------- */

const surveys: SatisfactionSurvey[] = [
  { id: "sv_1", schoolId: DEMO.schoolId, parentId: "u_p2", score: 5, comment: "Communication has improved a lot since last year.", submittedAt: daysAgo(20) },
  { id: "sv_2", schoolId: DEMO.schoolId, parentId: "u_p9", score: 4, submittedAt: daysAgo(18) },
  { id: "sv_3", schoolId: DEMO.schoolId, parentId: "u_p14", score: 4, comment: "Would like more feedback from teachers.", submittedAt: daysAgo(12) },
  { id: "sv_4", schoolId: DEMO.kivuSchoolId, parentId: "u_p5", score: 4, submittedAt: daysAgo(9) },
];

/* ------------------------------------ export ----------------------------------- */

export const db = {
  terms,
  schools,
  classes,
  users,
  teachers,
  students,
  feeStructures,
  paymentChannels,
  payments,
  receipts,
  admissions,
  announcements,
  threads,
  messages,
  notifications,
  attendance,
  assessments,
  grades,
  transfers,
  vacancies,
  jobApplications,
  applicantProfiles,
  roleDefs,
  staff,
  onboardingRequests,
  auditLog,
  districtStats,
  surveys,
  incidents,
};

/** Simulated network latency for the mock layer. */
export function simulate<T>(data: T, ms?: number): Promise<T> {
  const latency = ms ?? 180 + Math.random() * 320;
  return new Promise((resolve) => setTimeout(() => resolve(data), latency));
}

/** Deep-ish clone for reads so accidental mutation of query data doesn't corrupt the DB. */
export function snapshot<T>(data: T): T {
  return structuredClone(data);
}
