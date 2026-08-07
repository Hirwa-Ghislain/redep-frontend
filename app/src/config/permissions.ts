/**
 * Permission catalog. Format: `domain.action`.
 * The backend is the source of truth at runtime — this catalog drives UI gating
 * and the role-builder screens (school-scoped + global).
 */

export const P = {
  // School portal
  SCHOOL_DASHBOARD_VIEW: "school.dashboard.view",
  SCHOOL_PROFILE_EDIT: "school.profile.edit",
  SCHOOL_SETTINGS_MANAGE: "school.settings.manage",

  ADMISSIONS_VIEW: "admissions.view",
  ADMISSIONS_REVIEW: "admissions.review",

  STUDENTS_VIEW: "students.view",
  STUDENTS_MANAGE: "students.manage",

  CLASSES_VIEW: "classes.view",
  CLASSES_MANAGE: "classes.manage",

  FEES_VIEW: "fees.view",
  FEES_CONFIGURE: "fees.configure",

  PAYMENTS_VIEW: "payments.view",
  PAYMENTS_RECORD: "payments.record",

  ACCOUNTING_VIEW: "accounting.view",
  ACCOUNTING_EXPORT: "accounting.export",

  ANNOUNCEMENTS_VIEW: "announcements.view",
  ANNOUNCEMENTS_PUBLISH: "announcements.publish",

  MESSAGES_VIEW: "messages.view",
  MESSAGES_SEND: "messages.send",

  TEACHERS_VIEW: "teachers.view",
  TEACHERS_MANAGE: "teachers.manage",

  STAFF_VIEW: "staff.view",
  STAFF_MANAGE: "staff.manage",
  ROLES_MANAGE: "roles.manage",

  RECRUITMENT_VIEW: "recruitment.view",
  RECRUITMENT_MANAGE: "recruitment.manage",

  TRANSFERS_VIEW: "transfers.view",
  TRANSFERS_MANAGE: "transfers.manage",

  INCIDENTS_VIEW: "incidents.view",
  INCIDENTS_MANAGE: "incidents.manage",

  // Ministry portal
  MINISTRY_DASHBOARD_VIEW: "ministry.dashboard.view",
  MINISTRY_SCHOOLS_VIEW: "ministry.schools.view",
  MINISTRY_SCHOOLS_VERIFY: "ministry.schools.verify",
  MINISTRY_REPORTS_GENERATE: "ministry.reports.generate",
  MINISTRY_ANNOUNCE: "ministry.announcements.publish",
  MINISTRY_INCIDENTS_MANAGE: "ministry.incidents.manage",

  // System admin
  PLATFORM_DASHBOARD_VIEW: "platform.dashboard.view",
  PLATFORM_SCHOOLS_MANAGE: "platform.schools.manage",
  PLATFORM_USERS_MANAGE: "platform.users.manage",
  PLATFORM_ROLES_MANAGE: "platform.roles.manage",
  PLATFORM_AUDIT_VIEW: "platform.audit.view",
  PLATFORM_SETTINGS_MANAGE: "platform.settings.manage",
  PLATFORM_BROADCAST: "platform.broadcast",
} as const;

export type PermissionKey = (typeof P)[keyof typeof P];

export interface PermissionCatalogItem {
  key: PermissionKey;
  label: string;
  description: string;
}

export interface PermissionCatalogGroup {
  group: string;
  items: PermissionCatalogItem[];
}

/** School-scoped catalog — what a School Admin can compose custom staff roles from. */
export const SCHOOL_PERMISSION_CATALOG: PermissionCatalogGroup[] = [
  {
    group: "General",
    items: [
      { key: P.SCHOOL_DASHBOARD_VIEW, label: "View dashboard", description: "See the school overview dashboard." },
      { key: P.SCHOOL_PROFILE_EDIT, label: "Edit public profile", description: "Update the school's public discovery listing." },
      { key: P.SCHOOL_SETTINGS_MANAGE, label: "Manage settings", description: "Change school-level settings." },
    ],
  },
  {
    group: "Admissions",
    items: [
      { key: P.ADMISSIONS_VIEW, label: "View applications", description: "See incoming admission applications." },
      { key: P.ADMISSIONS_REVIEW, label: "Review applications", description: "Approve, reject, waitlist or request more info." },
    ],
  },
  {
    group: "Students & classes",
    items: [
      { key: P.STUDENTS_VIEW, label: "View students", description: "Browse the student directory." },
      { key: P.STUDENTS_MANAGE, label: "Manage students", description: "Edit student records and statuses." },
      { key: P.CLASSES_VIEW, label: "View classes", description: "See classes and seat capacity." },
      { key: P.CLASSES_MANAGE, label: "Manage classes", description: "Create classes and adjust capacity." },
    ],
  },
  {
    group: "Finance",
    items: [
      { key: P.FEES_VIEW, label: "View fee setup", description: "See configured fee structures." },
      { key: P.FEES_CONFIGURE, label: "Configure fees", description: "Create and edit fee structures and payment channels." },
      { key: P.PAYMENTS_VIEW, label: "View payments", description: "See the payments ledger." },
      { key: P.PAYMENTS_RECORD, label: "Record payments", description: "Record offline/manual payments." },
      { key: P.ACCOUNTING_VIEW, label: "View accounting", description: "See accounting summaries and receipts." },
      { key: P.ACCOUNTING_EXPORT, label: "Export reports", description: "Export accounting reports." },
    ],
  },
  {
    group: "Communication",
    items: [
      { key: P.ANNOUNCEMENTS_VIEW, label: "View announcements", description: "Read school announcements." },
      { key: P.ANNOUNCEMENTS_PUBLISH, label: "Publish announcements", description: "Publish announcements to parents/teachers/staff." },
      { key: P.MESSAGES_VIEW, label: "View messages", description: "Read school office message threads." },
      { key: P.MESSAGES_SEND, label: "Send messages", description: "Reply and start message threads." },
    ],
  },
  {
    group: "People",
    items: [
      { key: P.TEACHERS_VIEW, label: "View teachers", description: "See the teacher roster." },
      { key: P.TEACHERS_MANAGE, label: "Manage teachers", description: "Assign subjects and classes." },
      { key: P.STAFF_VIEW, label: "View staff", description: "See staff members and their roles." },
      { key: P.STAFF_MANAGE, label: "Manage staff", description: "Invite and suspend staff members." },
      { key: P.ROLES_MANAGE, label: "Manage roles", description: "Create custom roles and permission sets." },
    ],
  },
  {
    group: "Recruitment",
    items: [
      { key: P.RECRUITMENT_VIEW, label: "View recruitment", description: "See vacancies and applicant pipelines." },
      { key: P.RECRUITMENT_MANAGE, label: "Manage recruitment", description: "Post vacancies and move applicants through stages." },
    ],
  },
  {
    group: "Transfers",
    items: [
      { key: P.TRANSFERS_VIEW, label: "View transfers", description: "See transfer and exit requests." },
      { key: P.TRANSFERS_MANAGE, label: "Resolve transfers", description: "Confirm or reject transfer/exit requests." },
    ],
  },
  {
    group: "Safeguarding",
    items: [
      { key: P.INCIDENTS_VIEW, label: "View incident reports", description: "See safeguarding incident reports about your school." },
      { key: P.INCIDENTS_MANAGE, label: "Acknowledge incident reports", description: "Acknowledge safeguarding incident reports." },
    ],
  },
];

/** Everything school-scoped, for the SCHOOL_ADMIN built-in role. */
export const ALL_SCHOOL_PERMISSIONS: PermissionKey[] = SCHOOL_PERMISSION_CATALOG.flatMap(
  (g) => g.items.map((i) => i.key),
);

export const ALL_MINISTRY_PERMISSIONS: PermissionKey[] = [
  P.MINISTRY_DASHBOARD_VIEW,
  P.MINISTRY_SCHOOLS_VIEW,
  P.MINISTRY_SCHOOLS_VERIFY,
  P.MINISTRY_REPORTS_GENERATE,
  P.MINISTRY_ANNOUNCE,
  P.MINISTRY_INCIDENTS_MANAGE,
];

export const ALL_PLATFORM_PERMISSIONS: PermissionKey[] = [
  P.PLATFORM_DASHBOARD_VIEW,
  P.PLATFORM_SCHOOLS_MANAGE,
  P.PLATFORM_USERS_MANAGE,
  P.PLATFORM_ROLES_MANAGE,
  P.PLATFORM_AUDIT_VIEW,
  P.PLATFORM_SETTINGS_MANAGE,
  P.PLATFORM_BROADCAST,
];
