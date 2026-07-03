import { useCallback, useRef } from 'react';
import { api } from '../../services/api';

/** Inclusive calendar day count: end − start + 1 (date-only, no TZ drift). */
export function computeCalendarDaysInclusive(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const [sy, sm, sd] = String(startDate).split('-').map(Number);
  const [ey, em, ed] = String(endDate).split('-').map(Number);
  if (![sy, sm, sd, ey, em, ed].every((n) => Number.isFinite(n))) return 0;
  const t0 = Date.UTC(sy, sm - 1, sd);
  const t1 = Date.UTC(ey, em - 1, ed);
  if (t1 < t0) return 0;
  return Math.floor((t1 - t0) / 86400000) + 1;
}

export function normalizeWarnings(warnings) {
  if (!warnings) return [];
  if (Array.isArray(warnings)) {
    return warnings
      .map((w) => (typeof w === 'string' ? w : w?.message ?? w?.text ?? String(w)))
      .filter(Boolean);
  }
  return [];
}

export function warningsRequireDocument(warnings) {
  return normalizeWarnings(warnings).some((s) => /document/i.test(s) && /required/i.test(s));
}

/** DRF / JSON may send 0/1 or strings; JS `0 !== false` must not mark disallowed as allowed. */
function coerceAllowedFlag(v) {
  if (v === true || v === 1 || v === '1' || v === 'true' || v === 'True') return true;
  if (v === false || v === 0 || v === '0' || v === 'false' || v === 'False') return false;
  return true;
}

/** Normalize API leave_options[] to a stable shape for UI. */
export function normalizeLeaveOptions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((opt, idx) => {
    const nested = opt?.leave_type && typeof opt.leave_type === 'object' ? opt.leave_type : null;
    const id =
      opt?.leave_type_id ??
      nested?.id ??
      opt?.id ??
      (typeof opt?.leave_type === 'number' || typeof opt?.leave_type === 'string' ? opt.leave_type : null) ??
      opt?.type_id ??
      `opt-${idx}`;
    const name =
      opt?.leave_type_name ??
      opt?.name ??
      nested?.name ??
      nested?.label ??
      opt?.label ??
      'Leave';
    const days =
      opt?.actual_available_balance ??
      opt?.days_available ??
      opt?.available_days ??
      opt?.balance ??
      opt?.remaining ??
      opt?.quota;
    const daysLabel =
      days != null && days !== ''
        ? `${Number.isFinite(Number(days)) ? Number(days) : days} days available`
        : 'days available';
    const label =
      typeof opt?.label === 'string' && opt.label.trim()
        ? opt.label.trim()
        : `${String(name).replace(/\s*leave\s*$/i, '').trim()} Leave - ${daysLabel}`.replace(/\s+/g, ' ');
    const isAllowed = coerceAllowedFlag(opt?.is_allowed) && coerceAllowedFlag(opt?.allowed);
    const reasons = Array.isArray(opt?.reasons_if_not_allowed)
      ? opt.reasons_if_not_allowed.filter(Boolean)
      : opt?.reason
        ? [String(opt.reason)]
        : [];
    const shortName = String(name).trim();
    const daysNum = days != null && days !== '' ? Number(days) : NaN;
    const daysAvailableRight = Number.isFinite(daysNum)
      ? `${daysNum % 1 === 0 ? String(Math.trunc(daysNum)) : String(daysNum)} days available`
      : days != null && days !== ''
        ? `${days} days available`
        : '';
    const subtitle =
      !isAllowed && reasons.length > 0
        ? String(reasons[0])
        : !isAllowed && opt?.reason
          ? String(opt.reason)
          : '';
    return {
      raw: opt,
      id: String(id),
      label,
      shortName,
      daysAvailableRight,
      subtitle,
      isAllowed,
      reason: opt?.reason ? String(opt.reason) : '',
      reasons_if_not_allowed: reasons.map(String),
    };
  });
}

/** Format actual_deducted_days for display (e.g. 2.0 → "2", 1.5 → "1.5"). */
export function formatDeductedDaysDisplay(n) {
  if (!Number.isFinite(n)) return '';
  if (n % 1 === 0) return String(Math.trunc(n));
  return String(n);
}

/**
 * POST /leave/employeeleaves/validate/
 * @param {AbortSignal} [signal]
 */
export async function postValidateLeave(body, signal) {
  const res = await api.post('leave/employeeleaves/validate/', body, { signal });
  return res.data;
}

/**
 * POST /leave/employeeleaves/ (JSON or FormData)
 */
export async function postApplyLeave(payload) {
  const isFd = typeof FormData !== 'undefined' && payload instanceof FormData;
  const res = await api.post('leave/employeeleaves/', payload);
  return res.data;
}

/**
 * Debounced runner: returns a function `schedule(fn)` that runs `fn` after `ms`, cancelling prior timers.
 */
export function useDebouncedSchedule(ms = 450) {
  const timerRef = useRef(null);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const schedule = useCallback(
    (fn) => {
      cancel();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        fn();
      }, ms);
    },
    [cancel, ms]
  );

  return { schedule, cancel };
}
