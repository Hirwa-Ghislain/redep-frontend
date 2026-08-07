/**
 * HTTP client for the E-SHURI backend (Express 5 + Prisma).
 *
 * All service modules route through here when `VITE_USE_MOCKS=false`.
 * Contract (see E-SHURI-backend README + swagger):
 *   - Auth: `Authorization: Bearer <accessToken>` for the short-lived access token.
 *     The refresh token lives in an httpOnly cookie set by the server — the browser
 *     sends it automatically on same-site requests, so `credentials: "include"` is
 *     required and the client never reads/stores it itself.
 *   - Envelope: `{ success: true, message?, data }` on success,
 *     `{ success: false, code, message, details? }` (via AppError) on failure.
 *   - Multipart bodies (`FormData`) are passed through as-is (no JSON stringify,
 *     no Content-Type header — the browser sets the multipart boundary).
 */

export const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";
export const USE_MOCKS: boolean = (import.meta.env.VITE_USE_MOCKS ?? "false") === "true";

export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
  status: number;
}

type AccessToken = string | null;

let tokenProvider: () => AccessToken = () => null;
let onTokenRefreshed: (accessToken: string) => void = () => {};
let onUnauthorized: () => void = () => {};
let refreshInFlight: Promise<string | null> | null = null;
let languageProvider: () => string = () => "en";

/** Registered by the auth store at startup (avoids a circular import). */
export function configureApiAuth(opts: {
  getAccessToken: () => AccessToken;
  onTokenRefreshed: (accessToken: string) => void;
  onUnauthorized: () => void;
}) {
  tokenProvider = opts.getAccessToken;
  onTokenRefreshed = opts.onTokenRefreshed;
  onUnauthorized = opts.onUnauthorized;
}

/** Registered by the i18n store at startup — every request carries the current language. */
export function configureApiLanguage(getLanguage: () => string) {
  languageProvider = getLanguage;
}

interface BackendEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
  details?: { fieldErrors?: Record<string, string> } | Record<string, string>;
}

async function parseError(res: Response): Promise<ApiError> {
  let body: Partial<BackendEnvelope<unknown>> = {};
  try {
    body = await res.json();
  } catch {
    /* non-JSON error body */
  }
  const fieldErrors =
    body.details && typeof body.details === "object" && "fieldErrors" in body.details
      ? (body.details as { fieldErrors?: Record<string, string> }).fieldErrors
      : undefined;
  return {
    code: body.code ?? "UNKNOWN",
    message: body.message ?? `Request failed (${res.status})`,
    fieldErrors,
    status: res.status,
  };
}

/** Attempts a single silent refresh via the httpOnly cookie. Coalesces concurrent callers. */
async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, { method: "POST", credentials: "include" });
      if (!res.ok) return null;
      const body = (await res.json()) as BackendEnvelope<{ accessToken: string }>;
      const accessToken = body.data?.accessToken;
      if (!accessToken) return null;
      onTokenRefreshed(accessToken);
      return accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const accessToken = tokenProvider();
  const isFormData = init.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    "Accept-Language": languageProvider(),
    ...(init.headers as Record<string, string> | undefined),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" });

  if (res.status === 401 && !retried && path !== "/auth/refresh" && path !== "/auth/login") {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(path, init, true);
    onUnauthorized();
    throw await parseError(res);
  }

  if (!res.ok) throw await parseError(res);

  if (res.status === 204) return undefined as T;
  const envelope = (await res.json()) as BackendEnvelope<T>;
  return envelope.data as T;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
