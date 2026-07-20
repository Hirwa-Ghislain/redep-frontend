/**
 * HTTP client for the future Spring Boot backend.
 *
 * All service modules route through here when `VITE_USE_MOCKS=false`.
 * Contract (PLAN.md §7):
 *   - Auth: `Authorization: Bearer <accessToken>`
 *   - Errors: `{ code, message, fieldErrors? }`
 *   - Pagination: `{ items, page, pageSize, total }`
 */

export const API_URL: string = import.meta.env.VITE_API_URL ?? "/api/v1";
export const USE_MOCKS: boolean = (import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";

export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
  status: number;
}

type TokenPair = { accessToken: string; refreshToken: string } | null;

let tokenProvider: () => TokenPair = () => null;
let onUnauthorized: () => void = () => {};

/** Registered by the auth store at startup (avoids a circular import). */
export function configureApiAuth(opts: { getTokens: () => TokenPair; onUnauthorized: () => void }) {
  tokenProvider = opts.getTokens;
  onUnauthorized = opts.onUnauthorized;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokens = tokenProvider();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    // TODO(backend): attempt POST /auth/refresh with the refresh token before logging out.
    onUnauthorized();
  }

  if (!res.ok) {
    let body: Partial<ApiError> = {};
    try {
      body = await res.json();
    } catch {
      /* non-JSON error body */
    }
    const error: ApiError = {
      code: body.code ?? "UNKNOWN",
      message: body.message ?? `Request failed (${res.status})`,
      fieldErrors: body.fieldErrors,
      status: res.status,
    };
    throw error;
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
