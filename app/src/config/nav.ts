import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BarChart3,
  BookOpenCheck,
  Briefcase,
  Building2,
  CalendarCheck,
  ClipboardList,
  Compass,
  FileBarChart,
  FileText,
  GraduationCap,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Radio,
  ReceiptText,
  School,
  ScrollText,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import { P } from "./permissions";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** When set, hidden unless the user holds this permission. */
  permission?: string;
  end?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const PARENT_NAV: NavSection[] = [
  {
    items: [
      { label: "Overview", to: "/parent", icon: LayoutDashboard, end: true },
      { label: "Find schools", to: "/parent/discover", icon: Compass },
      { label: "Applications", to: "/parent/applications", icon: FileText },
      { label: "My children", to: "/parent/children", icon: UsersRound },
    ],
  },
  {
    title: "Money",
    items: [
      { label: "Fees & payments", to: "/parent/payments", icon: Wallet },
      { label: "Receipts", to: "/parent/receipts", icon: ReceiptText },
    ],
  },
  {
    title: "Connect",
    items: [
      { label: "Messages", to: "/parent/messages", icon: MessageSquare },
      { label: "Announcements", to: "/parent/announcements", icon: Megaphone },
      { label: "Transfers", to: "/parent/transfers", icon: ArrowLeftRight },
    ],
  },
  {
    items: [{ label: "Settings", to: "/parent/settings", icon: Settings }],
  },
];

export const SCHOOL_NAV: NavSection[] = [
  {
    items: [
      { label: "Overview", to: "/school", icon: LayoutDashboard, end: true, permission: P.SCHOOL_DASHBOARD_VIEW },
      { label: "Admissions", to: "/school/admissions", icon: ClipboardList, permission: P.ADMISSIONS_VIEW },
      { label: "Students", to: "/school/students", icon: GraduationCap, permission: P.STUDENTS_VIEW },
      { label: "Classes & seats", to: "/school/classes", icon: School, permission: P.CLASSES_VIEW },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Fee setup", to: "/school/fees", icon: Wallet, permission: P.FEES_VIEW },
      { label: "Payments", to: "/school/payments", icon: TrendingUp, permission: P.PAYMENTS_VIEW },
      { label: "Accounting", to: "/school/accounting", icon: ReceiptText, permission: P.ACCOUNTING_VIEW },
    ],
  },
  {
    title: "Communication",
    items: [
      { label: "Announcements", to: "/school/announcements", icon: Megaphone, permission: P.ANNOUNCEMENTS_VIEW },
      { label: "Messages", to: "/school/messages", icon: MessageSquare, permission: P.MESSAGES_VIEW },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Teachers", to: "/school/teachers", icon: BookOpenCheck, permission: P.TEACHERS_VIEW },
      { label: "Staff & roles", to: "/school/staff", icon: KeyRound, permission: P.STAFF_VIEW },
      { label: "Recruitment", to: "/school/recruitment", icon: Briefcase, permission: P.RECRUITMENT_VIEW },
      { label: "Transfers", to: "/school/transfers", icon: ArrowLeftRight, permission: P.TRANSFERS_VIEW },
    ],
  },
  {
    items: [
      { label: "School profile", to: "/school/profile", icon: Building2, permission: P.SCHOOL_PROFILE_EDIT },
      { label: "Settings", to: "/school/settings", icon: Settings, permission: P.SCHOOL_SETTINGS_MANAGE },
    ],
  },
];

export const TEACHER_NAV: NavSection[] = [
  {
    items: [
      { label: "Overview", to: "/teacher", icon: LayoutDashboard, end: true },
      { label: "My classes", to: "/teacher/classes", icon: School },
      { label: "Attendance", to: "/teacher/attendance", icon: CalendarCheck },
      { label: "Assessments", to: "/teacher/assessments", icon: BookOpenCheck },
    ],
  },
  {
    title: "Connect",
    items: [
      { label: "Messages", to: "/teacher/messages", icon: MessageSquare },
      { label: "Announcements", to: "/teacher/announcements", icon: Megaphone },
    ],
  },
  {
    items: [{ label: "Profile", to: "/teacher/profile", icon: UserRound }],
  },
];

export const APPLICANT_NAV: NavSection[] = [
  {
    items: [
      { label: "Overview", to: "/applicant", icon: LayoutDashboard, end: true },
      { label: "Job board", to: "/applicant/jobs", icon: Briefcase },
      { label: "My applications", to: "/applicant/applications", icon: FileText },
      { label: "Profile & CV", to: "/applicant/profile", icon: UserRound },
    ],
  },
];

export const MINISTRY_NAV: NavSection[] = [
  {
    items: [
      { label: "National overview", to: "/ministry", icon: LayoutDashboard, end: true },
      { label: "Schools registry", to: "/ministry/schools", icon: Building2 },
      { label: "Enrollment", to: "/ministry/enrollment", icon: BarChart3 },
      { label: "Capacity", to: "/ministry/capacity", icon: School },
      { label: "Staffing", to: "/ministry/staffing", icon: Users },
      { label: "Transfers", to: "/ministry/transfers", icon: ArrowLeftRight },
    ],
  },
  {
    title: "Output",
    items: [
      { label: "Reports", to: "/ministry/reports", icon: FileBarChart, permission: P.MINISTRY_REPORTS_GENERATE },
      { label: "Circulars", to: "/ministry/circulars", icon: Megaphone, permission: P.MINISTRY_ANNOUNCE },
    ],
  },
];

export const ADMIN_NAV: NavSection[] = [
  {
    items: [
      { label: "Platform overview", to: "/admin", icon: LayoutDashboard, end: true },
      { label: "Schools", to: "/admin/schools", icon: Building2 },
      { label: "Users", to: "/admin/users", icon: Users },
      { label: "Roles & permissions", to: "/admin/roles", icon: ShieldCheck },
      { label: "Ministry accounts", to: "/admin/ministry", icon: Landmark },
    ],
  },
  {
    title: "Platform",
    items: [
      { label: "Broadcast", to: "/admin/broadcast", icon: Radio },
      { label: "Audit log", to: "/admin/audit", icon: ScrollText },
      { label: "Settings", to: "/admin/settings", icon: Settings },
    ],
  },
];
