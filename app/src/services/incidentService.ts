import type { Incident, IncidentReportInput, IncidentSeverity, IncidentStatus } from "@/types";
import { http } from "@/lib/api/client";

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

export const incidentService = {
  // POST /incidents/public — anonymous or named, no auth required.
  async reportPublic(input: IncidentReportInput, files?: File[]): Promise<IncidentSubmissionResult> {
    const form = toFormData(input);
    appendEvidence(form, files);
    return http.post<IncidentSubmissionResult>("/incidents/public", form);
  },

  // POST /incidents — same shape, but the reporter is the authenticated user.
  async reportAuthenticated(input: IncidentReportInput, files?: File[]): Promise<IncidentSubmissionResult> {
    const form = toFormData(input);
    appendEvidence(form, files);
    return http.post<IncidentSubmissionResult>("/incidents", form);
  },

  // GET /incidents/public/:referenceCode?trackingCode=...
  async track(referenceCode: string, trackingCode: string): Promise<Incident | null> {
    try {
      return await http.get<Incident>(`/incidents/public/${encodeURIComponent(referenceCode)}?trackingCode=${encodeURIComponent(trackingCode)}`);
    } catch {
      return null;
    }
  },

  // GET /schools/:schoolId/incidents
  async forSchool(schoolId: string, params: { status?: IncidentStatus; severity?: IncidentSeverity } = {}): Promise<Incident[]> {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.severity) qs.set("severity", params.severity);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const res = await http.get<{ incidents: Incident[] }>(`/schools/${schoolId}/incidents${suffix}`);
    return res.incidents;
  },

  // PATCH /schools/:schoolId/incidents/:incidentId/acknowledge
  async acknowledge(schoolId: string, incidentId: string): Promise<void> {
    await http.patch(`/schools/${schoolId}/incidents/${incidentId}/acknowledge`);
  },

  // GET /education-authority/incidents
  async authorityList(
    params: { schoolId?: string; severity?: IncidentSeverity; status?: IncidentStatus; page?: number; limit?: number } = {},
  ): Promise<Incident[]> {
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
    await http.patch(`/education-authority/incidents/${incidentId}`, input);
  },
};
