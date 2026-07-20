import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PortalShell } from "@/components/layout/PortalShell";
import { ProtectedRoute, RoleRedirect } from "@/components/auth/guards";
import { ADMIN_NAV, APPLICANT_NAV, MINISTRY_NAV, PARENT_NAV, SCHOOL_NAV, TEACHER_NAV } from "@/config/nav";
import { LogoMark } from "@/components/layout/Logo";

/* ----------------------------------- auth ---------------------------------- */
const LoginPage = lazy(() => import("@/features/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/features/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/features/auth/ForgotPasswordPage"));
const SchoolOnboardingPage = lazy(() => import("@/features/auth/SchoolOnboardingPage"));
const VerifyReceiptPage = lazy(() => import("@/features/auth/VerifyReceiptPage"));

/* ---------------------------------- parent --------------------------------- */
const ParentDashboard = lazy(() => import("@/features/parent/ParentDashboard"));
const DiscoverSchoolsPage = lazy(() => import("@/features/parent/DiscoverSchoolsPage"));
const SchoolProfilePage = lazy(() => import("@/features/parent/SchoolProfilePage"));
const ApplyPage = lazy(() => import("@/features/parent/ApplyPage"));
const ParentApplicationsPage = lazy(() => import("@/features/parent/ApplicationsPage"));
const ChildrenPage = lazy(() => import("@/features/parent/ChildrenPage"));
const ChildDetailPage = lazy(() => import("@/features/parent/ChildDetailPage"));
const ParentPaymentsPage = lazy(() => import("@/features/parent/PaymentsPage"));
const ParentReceiptsPage = lazy(() => import("@/features/parent/ReceiptsPage"));
const ParentTransfersPage = lazy(() => import("@/features/parent/TransfersPage"));

/* ---------------------------------- school --------------------------------- */
const SchoolDashboard = lazy(() => import("@/features/school/SchoolDashboard"));
const AdmissionsPage = lazy(() => import("@/features/school/AdmissionsPage"));
const StudentsPage = lazy(() => import("@/features/school/StudentsPage"));
const ClassesPage = lazy(() => import("@/features/school/ClassesPage"));
const FeesPage = lazy(() => import("@/features/school/FeesPage"));
const PaymentsLedgerPage = lazy(() => import("@/features/school/PaymentsLedgerPage"));
const AccountingPage = lazy(() => import("@/features/school/AccountingPage"));
const SchoolAnnouncementsPage = lazy(() => import("@/features/school/AnnouncementsPage"));
const TeachersPage = lazy(() => import("@/features/school/TeachersPage"));
const StaffRolesPage = lazy(() => import("@/features/school/StaffRolesPage"));
const RecruitmentPage = lazy(() => import("@/features/school/RecruitmentPage"));
const VacancyPipelinePage = lazy(() => import("@/features/school/VacancyPipelinePage"));
const SchoolTransfersPage = lazy(() => import("@/features/school/TransfersPage"));
const SchoolProfileEditorPage = lazy(() => import("@/features/school/SchoolProfileEditorPage"));
const SchoolSettingsPage = lazy(() => import("@/features/school/SchoolSettingsPage"));

/* --------------------------------- teacher --------------------------------- */
const TeacherDashboard = lazy(() => import("@/features/teacher/TeacherDashboard"));
const MyClassesPage = lazy(() => import("@/features/teacher/MyClassesPage"));
const AttendancePage = lazy(() => import("@/features/teacher/AttendancePage"));
const AssessmentsPage = lazy(() => import("@/features/teacher/AssessmentsPage"));
const GradebookPage = lazy(() => import("@/features/teacher/GradebookPage"));
const TeacherProfilePage = lazy(() => import("@/features/teacher/ProfilePage"));

/* -------------------------------- applicant -------------------------------- */
const ApplicantDashboard = lazy(() => import("@/features/applicant/ApplicantDashboard"));
const JobBoardPage = lazy(() => import("@/features/applicant/JobBoardPage"));
const VacancyDetailPage = lazy(() => import("@/features/applicant/VacancyDetailPage"));
const MyApplicationsPage = lazy(() => import("@/features/applicant/MyApplicationsPage"));
const ApplicantProfilePage = lazy(() => import("@/features/applicant/ProfilePage"));

/* --------------------------------- ministry -------------------------------- */
const MinistryDashboard = lazy(() => import("@/features/ministry/MinistryDashboard"));
const SchoolsRegistryPage = lazy(() => import("@/features/ministry/SchoolsRegistryPage"));
const EnrollmentPage = lazy(() => import("@/features/ministry/EnrollmentPage"));
const CapacityPage = lazy(() => import("@/features/ministry/CapacityPage"));
const StaffingPage = lazy(() => import("@/features/ministry/StaffingPage"));
const TransferTrendsPage = lazy(() => import("@/features/ministry/TransferTrendsPage"));
const ReportsPage = lazy(() => import("@/features/ministry/ReportsPage"));
const CircularsPage = lazy(() => import("@/features/ministry/CircularsPage"));

/* ----------------------------------- admin --------------------------------- */
const AdminDashboard = lazy(() => import("@/features/admin/AdminDashboard"));
const AdminSchoolsPage = lazy(() => import("@/features/admin/SchoolsPage"));
const AdminUsersPage = lazy(() => import("@/features/admin/UsersPage"));
const AdminRolesPage = lazy(() => import("@/features/admin/RolesPage"));
const MinistryAccountsPage = lazy(() => import("@/features/admin/MinistryAccountsPage"));
const BroadcastPage = lazy(() => import("@/features/admin/BroadcastPage"));
const AuditLogPage = lazy(() => import("@/features/admin/AuditLogPage"));
const PlatformSettingsPage = lazy(() => import("@/features/admin/PlatformSettingsPage"));

/* ---------------------------------- shared --------------------------------- */
const MessagesPage = lazy(() => import("@/features/shared/MessagesPage"));
const AnnouncementsFeedPage = lazy(() => import("@/features/shared/AnnouncementsFeedPage"));
const AccountSettingsPage = lazy(() => import("@/features/shared/AccountSettingsPage"));

function LoadingScreen() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-paper">
      <div className="animate-pulse">
        <LogoMark size={44} />
      </div>
    </div>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<RoleRedirect />} />

        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/school-onboarding" element={<SchoolOnboardingPage />} />
        <Route path="/verify-receipt" element={<VerifyReceiptPage />} />

        {/* Parent portal */}
        <Route element={<ProtectedRoute allow={["PARENT"]} />}>
          <Route element={<PortalShell nav={PARENT_NAV} portalLabel="Parent portal" />}>
            <Route path="/parent" element={<ParentDashboard />} />
            <Route path="/parent/discover" element={<DiscoverSchoolsPage />} />
            <Route path="/parent/discover/:schoolId" element={<SchoolProfilePage />} />
            <Route path="/parent/discover/:schoolId/apply" element={<ApplyPage />} />
            <Route path="/parent/applications" element={<ParentApplicationsPage />} />
            <Route path="/parent/children" element={<ChildrenPage />} />
            <Route path="/parent/children/:studentId" element={<ChildDetailPage />} />
            <Route path="/parent/payments" element={<ParentPaymentsPage />} />
            <Route path="/parent/receipts" element={<ParentReceiptsPage />} />
            <Route path="/parent/messages" element={<MessagesPage />} />
            <Route path="/parent/announcements" element={<AnnouncementsFeedPage />} />
            <Route path="/parent/transfers" element={<ParentTransfersPage />} />
            <Route path="/parent/settings" element={<AccountSettingsPage />} />
          </Route>
        </Route>

        {/* School portal (admin + custom staff roles) */}
        <Route element={<ProtectedRoute allow={["SCHOOL_ADMIN", "SCHOOL_STAFF"]} />}>
          <Route element={<PortalShell nav={SCHOOL_NAV} portalLabel="School portal" />}>
            <Route path="/school" element={<SchoolDashboard />} />
            <Route path="/school/admissions" element={<AdmissionsPage />} />
            <Route path="/school/students" element={<StudentsPage />} />
            <Route path="/school/classes" element={<ClassesPage />} />
            <Route path="/school/fees" element={<FeesPage />} />
            <Route path="/school/payments" element={<PaymentsLedgerPage />} />
            <Route path="/school/accounting" element={<AccountingPage />} />
            <Route path="/school/announcements" element={<SchoolAnnouncementsPage />} />
            <Route path="/school/messages" element={<MessagesPage />} />
            <Route path="/school/teachers" element={<TeachersPage />} />
            <Route path="/school/staff" element={<StaffRolesPage />} />
            <Route path="/school/recruitment" element={<RecruitmentPage />} />
            <Route path="/school/recruitment/:vacancyId" element={<VacancyPipelinePage />} />
            <Route path="/school/transfers" element={<SchoolTransfersPage />} />
            <Route path="/school/profile" element={<SchoolProfileEditorPage />} />
            <Route path="/school/settings" element={<SchoolSettingsPage />} />
          </Route>
        </Route>

        {/* Teacher portal */}
        <Route element={<ProtectedRoute allow={["TEACHER"]} />}>
          <Route element={<PortalShell nav={TEACHER_NAV} portalLabel="Teacher portal" />}>
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/teacher/classes" element={<MyClassesPage />} />
            <Route path="/teacher/attendance" element={<AttendancePage />} />
            <Route path="/teacher/assessments" element={<AssessmentsPage />} />
            <Route path="/teacher/assessments/:assessmentId" element={<GradebookPage />} />
            <Route path="/teacher/messages" element={<MessagesPage />} />
            <Route path="/teacher/announcements" element={<AnnouncementsFeedPage />} />
            <Route path="/teacher/profile" element={<TeacherProfilePage />} />
            <Route path="/teacher/settings" element={<AccountSettingsPage />} />
          </Route>
        </Route>

        {/* Applicant portal */}
        <Route element={<ProtectedRoute allow={["APPLICANT"]} />}>
          <Route element={<PortalShell nav={APPLICANT_NAV} portalLabel="Careers portal" />}>
            <Route path="/applicant" element={<ApplicantDashboard />} />
            <Route path="/applicant/jobs" element={<JobBoardPage />} />
            <Route path="/applicant/jobs/:vacancyId" element={<VacancyDetailPage />} />
            <Route path="/applicant/applications" element={<MyApplicationsPage />} />
            <Route path="/applicant/profile" element={<ApplicantProfilePage />} />
            <Route path="/applicant/settings" element={<AccountSettingsPage />} />
          </Route>
        </Route>

        {/* Ministry portal */}
        <Route element={<ProtectedRoute allow={["MINISTRY_ADMIN"]} />}>
          <Route element={<PortalShell nav={MINISTRY_NAV} portalLabel="Education authority" />}>
            <Route path="/ministry" element={<MinistryDashboard />} />
            <Route path="/ministry/schools" element={<SchoolsRegistryPage />} />
            <Route path="/ministry/enrollment" element={<EnrollmentPage />} />
            <Route path="/ministry/capacity" element={<CapacityPage />} />
            <Route path="/ministry/staffing" element={<StaffingPage />} />
            <Route path="/ministry/transfers" element={<TransferTrendsPage />} />
            <Route path="/ministry/reports" element={<ReportsPage />} />
            <Route path="/ministry/circulars" element={<CircularsPage />} />
            <Route path="/ministry/settings" element={<AccountSettingsPage />} />
          </Route>
        </Route>

        {/* System admin portal */}
        <Route element={<ProtectedRoute allow={["SYSTEM_ADMIN"]} />}>
          <Route element={<PortalShell nav={ADMIN_NAV} portalLabel="Platform administration" />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/schools" element={<AdminSchoolsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/roles" element={<AdminRolesPage />} />
            <Route path="/admin/ministry" element={<MinistryAccountsPage />} />
            <Route path="/admin/broadcast" element={<BroadcastPage />} />
            <Route path="/admin/audit" element={<AuditLogPage />} />
            <Route path="/admin/settings" element={<PlatformSettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
