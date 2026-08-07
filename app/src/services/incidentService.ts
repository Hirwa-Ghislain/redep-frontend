import type { Incident, IncidentReportInput, IncidentSeverity, IncidentStatus } from "@/types";
import { db, nowIso, simulate, snapshot } from "@/mocks/db";
import { refCode, uid } from "@/lib/utils";
import { http, USE_MOCKS } from "@/lib/api/client";

export interface IncidentSubmissionResult {
  referenceCode: string;
  /** Shown to the reporter once — the backend only stores its hash, so it can never be re-shown. */
  trackingCode: string;
}

function appendEvidence(form: FormData, files: File[] | undefined) {
  for (const file of files ?? []) form.append("evidence", file);
}

function toFormData(input: IncidentReportInput): FormData {
  const form = new FormData();
  form.append("schoolId", input.schoolId);
  form.append("reporterType", input.reporterType);
  if (input.reporterName) form.append("reporterName", input.reporterName);
  if (input.reporterEmail) form.append("reporterEmail", input.reporterEmail);
  if (input.reporterPhone) form.append("reporterPhone", input.reporterPhone);
  form.append("identityProtected", String(input.identityProtected ?? true));
  form.append("category", input.category);
  form.append("subjectType", input.subjectType);
  if (input.subjectName) form.append("subjectName", input.subjectName);
  form.append("title", input.title);
  form.append("description", input.description);
  if (input.location) form.append("location", input.location);
  if (input.occurredAt) form.append("occurredAt", input.occurredAt);
  form.append("immediateDanger", String(input.immediateDanger ?? false));
  return form;
}

function mockSeverity(input: IncidentReportInput): IncidentSeverity {
  if (input.immediateDanger) return "CRITICAL";
  if (["PHYSICAL_VIOLENCE", "SEXUAL_ABUSE", "WEAPON"].includes(input.category)) return "HIGH";
  if (["HARASSMENT", "BULLYING", "DISCRIMINATION", "DRUGS", "UNSAFE_CONDITIONS"].includes(input.category)) return "MEDIUM";
  return "LOW";
}

function mockSubmit(input: IncidentReportInput, files?: File[]): IncidentSubmissionResult {
  const referenceCode = refCode("INC");
  const trackingCode = uid("trk").toUpperCase();
  const incident: Incident = {
    id: uid("inc"),
    referenceCode,
    schoolId: input.schoolId,
    reporterType: input.reporterType,
    reporterName: input.identityProtected === false ? input.reporterName : undefined,
    reporterEmail: input.identityProtected === false ? input.reporterEmail : undefined,
    reporterPhone: input.identityProtected === false ? input.reporterPhone : undefined,
    identityProtected: input.identityProtected ?? true,
    category: input.category,
    subjectType: input.subjectType,
    subjectName: input.subjectName,
    title: input.title,
    description: input.description,
    location: input.location,
    occurredAt: input.occurredAt,
    immediateDanger: input.immediateDanger ?? false,
    severity: mockSeverity(input),
    status: "SUBMITTED",
    evidence: (files ?? []).map((f) => ({ id: uid("ev"), filename: f.name })),
    createdAt: nowIso(),
  };
  db.incidents.push(incident);
  // A real tracking lookup only needs the reference + tracking code; store the code on the
  // record itself in mock mode since there's no separate hash table to check against.
  (incident as Incident & { _trackingCode?: string })._trackingCode = trackingCode;
  return { referenceCode, trackingCode };
}

export const incidentService = {
  // POST /incidents/public — anonymous or named, no auth required.
  async reportPublic(input: IncidentReportInput, files?: File[]): Promise<IncidentSubmissionResult> {
    if (USE_MOCKS) return simulate(mockSubmit(input, files));
    const form = toFormData(input);
    appendEvidence(form, files);
    return http.post<IncidentSubmissionResult>("/incidents/public", form);
  },

  // POST /incidents — same shape, but the reporter is the authenticated user.
  async reportAuthenticated(input: IncidentReportInput, files?: File[]): Promise<IncidentSubmissionResult> {
    if (USE_MOCKS) return simulate(mockSubmit(input, files));
    const form = toFormData(input);
    appendEvidence(form, files);
    return http.post<IncidentSubmissionResult>("/incidents", form);
  },

  // GET /incidents/public/:referenceCode?trackingCode=...
  async track(referenceCode: string, trackingCode: string): Promise<Incident | null> {
    if (USE_MOCKS) {
      const incident = db.incidents.find(
        (i) => i.referenceCode === referenceCode && (i as Incident & { _trackingCode?: string })._trackingCode === trackingCode,
      );
      return simulate(incident ? snapshot(incident) : null);
    }
    try {
      return await http.get<Incident>(`/incidents/public/${encodeURIComponent(referenceCode)}?trackingCode=${encodeURIComponent(trackingCode)}`);
    } catch {
      return null;
    }
  },

  // GET /schools/:schoolId/incidents
  async forSchool(schoolId: string, params: { status?: IncidentStatus; severity?: IncidentSeverity } = {}): Promise<Incident[]> {
    if (USE_MOCKS) {
      let out = db.incidents.filter((i) => i.schoolId === schoolId);
      if (params.status) out = out.filter((i) => i.status === params.status);
      if (params.severity) out = out.filter((i) => i.severity === params.severity);
      return simulate(snapshot(out));
    }
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.severity) qs.set("severity", params.severity);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const res = await http.get<{ incidents: Incident[] }>(`/schools/${schoolId}/incidents${suffix}`);
    return res.incidents;
  },

  // PATCH /schools/:schoolId/incidents/:incidentId/acknowledge
  async acknowledge(schoolId: string, incidentId: string): Promise<void> {
    if (USE_MOCKS) {
      const incident = db.incidents.find((i) => i.id === incidentId && i.schoolId === schoolId);
      if (!incident) throw { code: "NOT_FOUND", message: "Incident not found.", status: 404 };
      incident.schoolAcknowledgedAt = nowIso();
      await simulate(null);
      return;
    }
    await http.patch(`/schools/${schoolId}/incidents/${incidentId}/acknowledge`);
  },

  // GET /education-authority/incidents
  async authorityList(
    params: { schoolId?: string; severity?: IncidentSeverity; status?: IncidentStatus; page?: number; limit?: number } = {},
  ): Promise<Incident[]> {
    if (USE_MOCKS) {
      let out = db.incidents;
      if (params.schoolId) out = out.filter((i) => i.schoolId === params.schoolId);
      if (params.severity) out = out.filter((i) => i.severity === params.severity);
      if (params.status) out = out.filter((i) => i.status === params.status);
      return simulate(snapshot(out).map((i) => ({ ...i, schoolName: db.schools.find((s) => s.id === i.schoolId)?.name })));
    }
    const qs = new URLSearchParams();
    if (params.schoolId) qs.set("schoolId", params.schoolId);
    if (params.severity) qs.set("severity", params.severity);
    if (params.status) qs.set("status", params.status);
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const res = await http.get<{ incidents: Incident[] }>(`/education-authority/incidents${suffix}`);
    return res.incidents;
  },

  // PATCH /education-authority/incidents/:incidentId
  async authorityUpdate(
    incidentId: string,
    input: { status: IncidentStatus; note: string; visibleToReporter?: boolean; resolutionSummary?: string },
  ): Promise<void> {
    if (USE_MOCKS) {
      const incident = db.incidents.find((i) => i.id === incidentId);
      if (!incident) throw { code: "NOT_FOUND", message: "Incident not found.", status: 404 };
      incident.status = input.status;
      if (input.resolutionSummary) incident.resolutionSummary = input.resolutionSummary;
      await simulate(null);
      return;
    }
    await http.patch(`/education-authority/incidents/${incidentId}`, input);
  },
};
