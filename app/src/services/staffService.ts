import type { RoleDefinition, StaffMember } from "@/types";
import { db, nowIso, simulate, snapshot } from "@/mocks/db";
import { uid } from "@/lib/utils";
import { http, USE_MOCKS } from "@/lib/api/client";
import { schoolService, type RealSchoolTeacher } from "@/services/schoolService";

export interface RealInvitationResult {
  role: "TEACHER" | "ACCOUNTANT";
  requestedCount: number;
  invitedCount: number;
  failedCount: number;
  invited: Array<{ id: string; email: string; role: string; expiresAt: string; createdAt: string }>;
  failed: Array<{ email: string; code: string; message: string }>;
}

export const staffService = {
  // GET /api/v1/schools/:id/staff
  async list(schoolId: string): Promise<StaffMember[]> {
    return simulate(snapshot(db.staff.filter((s) => s.schoolId === schoolId)));
  },

  // POST /api/v1/schools/:id/staff/invite
  async invite(input: { schoolId: string; name: string; email: string; roleId: string }): Promise<StaffMember> {
    const role = db.roleDefs.find((r) => r.id === input.roleId);
    if (!role) throw { code: "NOT_FOUND", message: "Role not found.", status: 404 };
    const member: StaffMember = {
      id: uid("stf"), schoolId: input.schoolId, userId: uid("u"),
      name: input.name, email: input.email, roleId: role.id, roleName: role.name,
      status: "INVITED", joinedAt: nowIso(),
    };
    db.staff.push(member);
    db.auditLog.unshift({
      id: uid("aud"), actorName: "School admin", actorRole: "SCHOOL_ADMIN",
      action: "STAFF_INVITED", target: input.name, detail: `Invited as ${role.name}.`, at: nowIso(),
    });
    return simulate(snapshot(member));
  },

  // PATCH /api/v1/staff/:id
  async setStatus(id: string, status: StaffMember["status"]): Promise<StaffMember> {
    const member = db.staff.find((s) => s.id === id);
    if (!member) throw { code: "NOT_FOUND", message: "Staff member not found.", status: 404 };
    member.status = status;
    return simulate(snapshot(member));
  },

  /** School-scoped custom roles (plus visibility into the built-in school admin role). */
  // GET /api/v1/schools/:id/roles
  async roles(schoolId: string): Promise<RoleDefinition[]> {
    return simulate(snapshot(db.roleDefs.filter((r) => r.schoolId === schoolId)));
  },

  // GET /api/v1/roles  (global — system admin)
  async globalRoles(): Promise<RoleDefinition[]> {
    return simulate(snapshot(db.roleDefs.filter((r) => r.schoolId === null)));
  },

  // POST /api/v1/schools/:id/roles | PUT /api/v1/roles/:id
  async saveRole(input: Omit<RoleDefinition, "id" | "system"> & { id?: string }): Promise<RoleDefinition> {
    if (input.id) {
      const role = db.roleDefs.find((r) => r.id === input.id);
      if (!role) throw { code: "NOT_FOUND", message: "Role not found.", status: 404 };
      if (role.system) throw { code: "FORBIDDEN", message: "Built-in roles cannot be edited.", status: 403 };
      Object.assign(role, input);
      // Keep staff role labels in sync
      for (const member of db.staff) if (member.roleId === role.id) member.roleName = role.name;
      return simulate(snapshot(role));
    }
    const role: RoleDefinition = { ...input, id: uid("role"), system: false };
    db.roleDefs.push(role);
    db.auditLog.unshift({
      id: uid("aud"), actorName: "School admin", actorRole: "SCHOOL_ADMIN",
      action: "ROLE_CREATED", target: role.name, detail: `Custom role with ${role.permissions.length} permissions.`, at: nowIso(),
    });
    return simulate(snapshot(role));
  },

  // DELETE /api/v1/roles/:id
  async removeRole(id: string): Promise<void> {
    const role = db.roleDefs.find((r) => r.id === id);
    if (!role) return simulate(undefined);
    if (role.system) throw { code: "FORBIDDEN", message: "Built-in roles cannot be deleted.", status: 403 };
    if (db.staff.some((s) => s.roleId === id && s.status !== "SUSPENDED")) {
      throw { code: "IN_USE", message: "Reassign staff members before deleting this role.", status: 409 };
    }
    db.roleDefs.splice(db.roleDefs.indexOf(role), 1);
    return simulate(undefined);
  },

  /**
   * Real staff invitations — the backend only has fixed TEACHER/ACCOUNTANT roles
   * (no custom role catalog). POST /schools/:schoolId/invitations
   */
  async inviteReal(schoolId: string, input: { emails: string[]; role: "TEACHER" | "ACCOUNTANT" }): Promise<RealInvitationResult> {
    if (USE_MOCKS) {
      return simulate({
        role: input.role, requestedCount: input.emails.length, invitedCount: input.emails.length, failedCount: 0,
        invited: input.emails.map((email) => ({ id: uid("inv"), email, role: input.role, expiresAt: nowIso(), createdAt: nowIso() })),
        failed: [],
      });
    }
    return http.post<RealInvitationResult>(`/schools/${schoolId}/invitations`, input);
  },

  /** Real teacher roster (accountants are not separately listed by the backend). GET /schools/:schoolId/teachers */
  async listReal(schoolId: string): Promise<RealSchoolTeacher[]> {
    return schoolService.teachersReal(schoolId);
  },
};
