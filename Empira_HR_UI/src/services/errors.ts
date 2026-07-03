import type { AxiosError } from 'axios';

export type FieldErrors = Record<string, string[]>;

export type NormalizedApiError = {
  message: string;
  fieldErrors?: FieldErrors;
  status?: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function asStringArray(v: unknown): string[] | undefined {
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v as string[];
  if (typeof v === 'string') return [v];
  return undefined;
}

function extractFieldErrors(data: unknown): FieldErrors | undefined {
  // DRF-style: { field: ["msg"] } or { non_field_errors: ["msg"] }
  if (!isRecord(data)) return undefined;
  const out: FieldErrors = {};
  for (const [k, v] of Object.entries(data)) {
    const msgs = asStringArray(v);
    if (msgs?.length) out[k] = msgs;
  }
  return Object.keys(out).length ? out : undefined;
}

export function normalizeApiError(err: unknown): NormalizedApiError {
  const fallback: NormalizedApiError = { message: 'Something went wrong. Please try again.' };

  if (!err) return fallback;

  const ax = err as AxiosError;
  if (typeof ax?.isAxiosError === 'boolean' && ax.isAxiosError) {
    const status = ax.response?.status;
    const data = ax.response?.data;
    const fieldErrors = extractFieldErrors(data);

    // prefer explicit message fields without leaking full payload
    let message = fallback.message;
    if (isRecord(data)) {
      const m =
        (typeof data.detail === 'string' && data.detail) ||
        (typeof data.message === 'string' && data.message) ||
        (typeof data.error === 'string' && data.error);
      if (m) message = m;
    }

    if (status === 0 || ax.code === 'ERR_NETWORK') {
      message = 'Network error. Check your connection and try again.';
    } else if (status === 401) {
      message = 'Your session has expired. Please sign in again.';
    } else if (status && status >= 500) {
      message = 'Server error. Please try again in a moment.';
    } else if (fieldErrors && (fieldErrors.non_field_errors?.[0] || fieldErrors.detail?.[0])) {
      message = fieldErrors.non_field_errors?.[0] || fieldErrors.detail?.[0] || message;
    }

    return { message, fieldErrors, status };
  }

  if (err instanceof Error && err.message) return { message: err.message };
  return fallback;
}

