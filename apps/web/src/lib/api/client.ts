import type { components } from "@/lib/api/schema";

export type ErrorDetail = components["schemas"]["ErrorDetail"];

/** Base path for every API call. Always same-origin; Next rewrites it to the API service. */
export const API_BASE = "/api/v1";

/** A non-2xx response, normalised from the API's `{ error: { code, message, request_id } }` envelope. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;
  readonly details: ErrorDetail[];

  constructor(init: {
    status: number;
    code: string;
    message: string;
    requestId?: string | null;
    details?: ErrorDetail[] | null;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.requestId = init.requestId ?? null;
    this.details = init.details ?? [];
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export type QueryValue = string | number | boolean | null | undefined | readonly string[];
export type QueryParams = Record<string, QueryValue>;

/**
 * Serialise query params. Empty values are dropped; arrays become repeated keys
 * (`status=PENDING&status=REVERSED`), which is what the API expects.
 */
export function buildQueryString(params: QueryParams | undefined): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value as readonly string[]) {
        if (item !== "") search.append(key, item);
      }
    } else {
      search.append(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function isErrorEnvelope(
  value: unknown,
): value is { error: { code: string; message: string; request_id?: string | null; details?: ErrorDetail[] | null } } {
  if (typeof value !== "object" || value === null || !("error" in value)) return false;
  const error = (value as { error: unknown }).error;
  return typeof error === "object" && error !== null && "code" in error && "message" in error;
}

/** Turn any failed Response into an ApiError, tolerating non-JSON bodies (e.g. proxy errors). */
export async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON error body (gateway/proxy); fall through to a generic error.
  }
  if (isErrorEnvelope(body)) {
    return new ApiError({
      status: response.status,
      code: body.error.code,
      message: body.error.message,
      requestId: body.error.request_id ?? response.headers.get("x-request-id"),
      details: body.error.details ?? [],
    });
  }
  return new ApiError({
    status: response.status,
    code: response.status >= 500 ? "SERVER_ERROR" : "HTTP_ERROR",
    message:
      response.status >= 500
        ? "The service is temporarily unavailable. Please try again."
        : `Request failed (${response.status}).`,
    requestId: response.headers.get("x-request-id"),
  });
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: QueryParams;
  /** JSON body. Use `formData` for multipart uploads instead. */
  body?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
}

/** Small typed fetch wrapper. Cookies are same-origin, so `credentials: "same-origin"` is enough. */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", query, body, formData, signal } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  let payload: BodyInit | undefined;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}${buildQueryString(query)}`, {
      method,
      headers,
      body: payload,
      credentials: "same-origin",
      cache: "no-store",
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Could not reach the server. Check your connection and try again.",
    });
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
