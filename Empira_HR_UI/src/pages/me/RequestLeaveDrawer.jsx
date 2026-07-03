import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { api } from '../../services/api';
import LeaveTypeDropdown from './LeaveTypeDropdown.jsx';
import LeaveNotifySection from './LeaveNotifySection.jsx';
import { formatDate } from './useLeaveData.js';
import {
  computeCalendarDaysInclusive,
  formatDeductedDaysDisplay,
  normalizeLeaveOptions,
  normalizeWarnings,
  postValidateLeave,
  useDebouncedSchedule,
} from './useLeaveValidation.js';

function FieldLabel({ children }) {
  return <label className="mb-1.5 block text-xs font-medium text-[#9FB3C8]">{children}</label>;
}

function Spinner({ className }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white ${className ?? ''}`}
      aria-hidden
    />
  );
}

function showToast(message) {
  if (typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.textContent = String(message ?? '');
  el.setAttribute('role', 'status');
  el.style.position = 'fixed';
  el.style.right = '16px';
  el.style.bottom = '16px';
  el.style.zIndex = '9999';
  el.style.maxWidth = '320px';
  el.style.padding = '10px 12px';
  el.style.borderRadius = '10px';
  el.style.border = '1px solid rgba(16, 185, 129, 0.35)';
  el.style.background = 'rgba(16, 185, 129, 0.15)';
  el.style.color = 'rgba(209, 250, 229, 1)';
  el.style.fontSize = '12px';
  el.style.fontWeight = '600';
  el.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
  document.body.appendChild(el);
  window.setTimeout(() => {
    el.style.transition = 'opacity 220ms ease';
    el.style.opacity = '0';
    window.setTimeout(() => el.remove(), 240);
  }, 2600);
}

const PICKER_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PICKER_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromISODate(value) {
  if (!value) return null;
  const [y, m, d] = String(value).split('-').map(Number);
  if (![y, m, d].every((n) => Number.isFinite(n))) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  // guard against overflow like 2026-02-40
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function buildMonthGrid(year, monthIndex) {
  // monthIndex: 0-11
  const first = new Date(year, monthIndex, 1);
  const startDow = first.getDay(); // 0 (Sun) .. 6
  const gridStart = new Date(year, monthIndex, 1 - startDow);
  const out = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    out.push({
      date: d,
      inMonth: d.getMonth() === monthIndex,
      iso: toISODate(d),
      day: d.getDate(),
    });
  }
  return out;
}

function DateFieldButton({ id, label, value, onChange, popoverAlign = 'left' }) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);

  const selectedDate = useMemo(() => fromISODate(value), [value]);
  const base = selectedDate ?? new Date();
  const [viewYear, setViewYear] = useState(base.getFullYear());
  const [viewMonth, setViewMonth] = useState(base.getMonth());

  useEffect(() => {
    if (!open) return;
    const next = selectedDate ?? new Date();
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }, [open, selectedDate]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current) return;
      if (wrapRef.current.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewMonth, viewYear]);

  const goPrev = () => {
    const m = viewMonth - 1;
    if (m < 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth(m);
    }
  };

  const goNext = () => {
    const m = viewMonth + 1;
    if (m > 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth(m);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <FieldLabel>{label}</FieldLabel>
      <button
        id={id}
        type="button"
        className="relative flex h-10 w-full cursor-pointer items-center justify-between rounded-md border border-white/5 bg-[#0F2435] px-3 text-left text-xs text-white transition-colors hover:bg-[#132D44]"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={value ? 'text-white' : 'text-[#9FB3C8]'}>
          {value ? formatDate(value) : 'Select date'}
        </span>
        <CalendarDays className="pointer-events-none h-3.5 w-3.5 text-[#9FB3C8]" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={`${label} calendar`}
          className={`absolute top-[calc(100%+10px)] z-50 w-[280px] rounded-xl border border-white/10 bg-[#0B1724] p-3 shadow-2xl ${
            popoverAlign === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={goPrev}
              className="grid h-8 w-8 place-items-center rounded-md text-[#9FB3C8] hover:bg-white/5 hover:text-white"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>

            <div className="text-sm font-semibold text-white">
              {PICKER_MONTHS[viewMonth]} <span className="text-white/90">{viewYear}</span>
            </div>

            <button
              type="button"
              onClick={goNext}
              className="grid h-8 w-8 place-items-center rounded-md text-[#9FB3C8] hover:bg-white/5 hover:text-white"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 px-1 text-center text-[11px] font-medium text-[#9FB3C8]">
            {PICKER_WEEKDAYS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 px-1">
            {grid.map((cell) => {
              const isSelected = cell.iso === value;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => {
                    onChange(cell.iso);
                    setOpen(false);
                  }}
                  className={[
                    'grid h-9 w-9 place-items-center rounded-lg text-[12px] font-medium transition-colors',
                    cell.inMonth ? 'text-white/90 hover:bg-white/5' : 'text-white/25 hover:bg-white/5',
                    isSelected ? 'bg-[#2A3B55] text-white' : '',
                  ].join(' ')}
                  aria-pressed={isSelected}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function RequestLeaveDrawer({ isOpen, onClose, onRequestSuccess }) {
  const queryClient = useQueryClient();
  const { schedule, cancel: cancelDebounce } = useDebouncedSchedule(450);
  const abortRef = useRef(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationMode, setDurationMode] = useState('full');
  const [startSession, setStartSession] = useState('full');
  const [endSession, setEndSession] = useState('full');
  const [note, setNote] = useState('');
  const [notifyEmployeeIds, setNotifyEmployeeIds] = useState([]);
  const [notifyMessage, setNotifyMessage] = useState('');
  const [documentFile, setDocumentFile] = useState(null);

  const [validation, setValidation] = useState(null);
  const [validateError, setValidateError] = useState(null);
  const [validating, setValidating] = useState(false);

  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [startTouched, setStartTouched] = useState(false);
  const [endTouched, setEndTouched] = useState(false);
  const [leaveTypeTouched, setLeaveTypeTouched] = useState(false);
  const [noteTouched, setNoteTouched] = useState(false);
  const [leaveTypeBlockError, setLeaveTypeBlockError] = useState(null);

  const clearValidation = useCallback(() => {
    cancelDebounce();
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setValidation(null);
    setValidateError(null);
    setValidating(false);
    setLeaveTypeBlockError(null);
  }, [cancelDebounce]);

  const resetForm = useCallback(() => {
    clearValidation();
    setStartDate('');
    setEndDate('');
    setDurationMode('full');
    setStartSession('full');
    setEndSession('full');
    setNote('');
    setNotifyEmployeeIds([]);
    setNotifyMessage('');
    setDocumentFile(null);
    setSelectedLeaveTypeId('');
    setSubmitting(false);
    setSubmitError(null);
    setStartTouched(false);
    setEndTouched(false);
    setLeaveTypeTouched(false);
    setNoteTouched(false);
  }, [clearValidation]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const localCalendarDays = useMemo(
    () => computeCalendarDaysInclusive(startDate, endDate),
    [startDate, endDate]
  );

  const dateOrderInvalid = Boolean(startDate && endDate && localCalendarDays === 0);
  const isSingleDay = Boolean(startDate && endDate && !dateOrderInvalid && localCalendarDays === 1);

  const effectiveStartSession = durationMode === 'full' ? 'full' : startSession;
  const effectiveEndSession = durationMode === 'full' ? 'full' : isSingleDay ? startSession : endSession;

  const leaveOptions = useMemo(() => normalizeLeaveOptions(validation?.leave_options), [validation]);

  const selectedOption = useMemo(
    () => leaveOptions.find((o) => o.id === selectedLeaveTypeId),
    [leaveOptions, selectedLeaveTypeId]
  );

  const isSickLeaveSelected = useMemo(() => {
    const name = selectedOption?.shortName || selectedOption?.label || '';
    return /\bsick\b/i.test(String(name));
  }, [selectedOption]);

  const calendarDaysDisplay =
    validation?.calendar_days != null ? Number(validation.calendar_days) : localCalendarDays;

  const actualDeductedFromApi = useMemo(() => {
    if (validation == null || validation.actual_deducted_days == null) return null;
    const n = Number(validation.actual_deducted_days);
    return Number.isFinite(n) ? n : null;
  }, [validation]);

  const warningsList = useMemo(() => normalizeWarnings(validation?.warnings), [validation]);

  const runValidate = useCallback(async () => {
    if (!startDate || !endDate || dateOrderInvalid) {
      setValidation(null);
      setValidateError(null);
      setValidating(false);
      setLeaveTypeBlockError(null);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setValidating(true);
    setValidateError(null);
    setSubmitError(null);

    const body = {
      start_date: startDate,
      end_date: endDate,
      start_day_session: effectiveStartSession,
      end_day_session: effectiveEndSession,
    };

    try {
      const data = await postValidateLeave(body, ctrl.signal);
      if (abortRef.current !== ctrl) return;
      setValidation(data);
      setLeaveTypeBlockError(null);
    } catch (e) {
      if (axios.isCancel(e)) return;
      const data = e?.response?.data;
      if (data && typeof data === 'object' && (data.message != null || data.is_valid === false)) {
        setValidation(data);
        setValidateError(null);
        setLeaveTypeBlockError(null);
        return;
      }
      const fromErrorField =
        typeof data?.error === 'string'
          ? data.error
          : data?.error != null && typeof data.error === 'object'
            ? data.error?.message || data.error?.detail || JSON.stringify(data.error)
            : null;
      const msg =
        fromErrorField ||
        data?.detail ||
        data?.message ||
        e?.message ||
        'Validation failed';
      setValidation(null);
      setValidateError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      setLeaveTypeBlockError(null);
    } finally {
      if (abortRef.current === ctrl) {
        setValidating(false);
        abortRef.current = null;
      }
    }
  }, [dateOrderInvalid, effectiveEndSession, effectiveStartSession, endDate, startDate]);

  useEffect(() => {
    if (!isOpen) return undefined;
    // Reset dependent state immediately so stale validation can never be submitted.
    clearValidation();
    if (!startDate || !endDate || dateOrderInvalid) return undefined;
    schedule(() => {
      void runValidate();
    });
    return () => cancelDebounce();
  }, [
    isOpen,
    startDate,
    endDate,
    dateOrderInvalid,
    durationMode,
    startSession,
    endSession,
    schedule,
    cancelDebounce,
    runValidate,
    clearValidation,
  ]);

  const globalInvalidMessages = useMemo(() => {
    if (!validation || validation.is_valid !== false) return [];
    const v = validation;
    const fromArray = (a) => (Array.isArray(a) ? a.map(String).filter(Boolean) : []);
    const out = [];
    if (typeof v.message === 'string' && v.message.trim()) out.push(v.message.trim());
    if (typeof v.error === 'string' && v.error.trim()) out.push(v.error.trim());
    out.push(
      ...fromArray(v.non_field_errors),
      ...fromArray(v.errors),
      ...normalizeWarnings(v.warnings_if_invalid),
      ...(typeof v.detail === 'string' ? [v.detail] : [])
    );
    return [...new Set(out.filter(Boolean))];
  }, [validation]);

  const canSubmit = useMemo(() => {
    if (!startDate || !endDate || dateOrderInvalid) return false;
    if (!validation || validateError) return false;
    if (!leaveOptions.length) return false;
    if (!selectedLeaveTypeId || !selectedOption?.isAllowed) return false;
    if (actualDeductedFromApi == null) return false;
    if (!note.trim()) return false;
    return true;
  }, [
    actualDeductedFromApi,
    dateOrderInvalid,
    endDate,
    leaveOptions.length,
    note,
    selectedLeaveTypeId,
    selectedOption,
    startDate,
    validateError,
    validation,
  ]);

  const handleSubmit = async () => {
    setStartTouched(true);
    setEndTouched(true);
    setLeaveTypeTouched(true);
    setNoteTouched(true);
    setSubmitError(null);
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    try {
      if (actualDeductedFromApi == null) {
        setSubmitError('Please validate your dates before submitting.');
        return;
      }

      const leaveTypePayload = /^\d+$/.test(String(selectedLeaveTypeId))
        ? Number(selectedLeaveTypeId)
        : selectedLeaveTypeId;

      // Never send document for non-sick leaves; also clear any previously selected file.
      if (!isSickLeaveSelected && documentFile) setDocumentFile(null);

      const payload = {
        leave_type: leaveTypePayload,
        duration: durationMode,
        start_date: startDate,
        end_date: endDate,
        start_day_session: effectiveStartSession,
        end_day_session: effectiveEndSession,
        reason: note.trim(),
        total_days: actualDeductedFromApi,
      };

      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v == null) return;
        fd.append(k, String(v));
      });
      if (isSickLeaveSelected && documentFile) {
        fd.append('document', documentFile);
      }

      notifyEmployeeIds.forEach((id) => {
        fd.append('notify_employee_ids', String(id));
      });
      const trimmedNotify = notifyMessage.trim();
      if (trimmedNotify) {
        fd.append('notify_message', trimmedNotify);
      }

      await api.post('leave/employeeleaves/', fd);

      await queryClient.invalidateQueries({ queryKey: ['leave', 'employeeleaves'] });
      await queryClient.invalidateQueries({ queryKey: ['leave', 'employeeleaves', 'stats'] });
      await queryClient.invalidateQueries({ queryKey: ['leave', 'leave-balances'] });

      showToast('Leave request submitted successfully');
      resetForm();
      onClose();
      onRequestSuccess?.();
    } catch (e) {
      const status = e?.response?.status;
      const d = e?.response?.data;

      if (status === 401) {
        setSubmitError('Unauthorized - login again');
      } else if (status === 400) {
        const fieldErrors =
          d && typeof d === 'object'
            ? Object.entries(d)
                .flatMap(([k, v]) => {
                  if (Array.isArray(v)) return v.map((x) => `${k}: ${String(x)}`);
                  if (typeof v === 'string') return [`${k}: ${v}`];
                  return [];
                })
                .filter(Boolean)
            : [];
        setSubmitError(fieldErrors.length ? fieldErrors.join('\n') : 'Please check your inputs and try again.');
      } else if (status >= 500) {
        setSubmitError('Something went wrong');
      } else {
        const msg =
          (typeof d?.error === 'string' ? d.error : null) ||
          d?.detail ||
          d?.message ||
          (typeof d === 'object' ? JSON.stringify(d) : null) ||
          e?.message ||
          'Request failed';
        setSubmitError(typeof msg === 'string' ? msg : 'Request failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const middleDays = calendarDaysDisplay > 0 ? calendarDaysDisplay : '—';

  const requestLine = useMemo(() => {
    if (!startDate || !endDate || dateOrderInvalid) return 'Select dates to see leave duration';
    if (actualDeductedFromApi != null) {
      const display = formatDeductedDaysDisplay(actualDeductedFromApi);
      const dayWord = Math.abs(actualDeductedFromApi - 1) < 0.001 ? 'day' : 'days';
      return `You are requesting for ${display} ${dayWord} of leave`;
    }
    return `You are requesting for ${localCalendarDays} ${localCalendarDays === 1 ? 'day' : 'days'} of leave`;
  }, [actualDeductedFromApi, dateOrderInvalid, endDate, localCalendarDays, startDate]);

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ease-out ${
        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
        aria-label="Close request leave drawer"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Request Leave"
        className={`absolute right-0 top-0 flex h-screen w-full max-w-[420px] flex-col border-l border-white/5 bg-[#0A1D2C] transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between border-b border-white/5 p-4">
          <h2 className="text-base font-semibold text-white">Request Leave</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#9FB3C8] transition-colors hover:text-white"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <DateFieldButton
                id="leave-start"
                label="From Date"
                value={startDate}
                onChange={(v) => {
                  setStartTouched(true);
                  setStartDate(v);
                }}
              />
              {startTouched && !startDate ? (
                <p className="mt-1.5 text-xs text-[#EF4444]">Start date is required</p>
              ) : null}
            </div>
            <div>
              <FieldLabel>Total Days</FieldLabel>
              <div className="flex h-10 items-center justify-center rounded-md border border-white/5 bg-[#0F2435] text-sm font-semibold text-white">
                {validating ? '…' : middleDays}
              </div>
            </div>
            <div>
              <DateFieldButton
                id="leave-end"
                label="To Date"
                value={endDate}
                popoverAlign="right"
                onChange={(v) => {
                  setEndTouched(true);
                  setEndDate(v);
                }}
              />
              {endTouched && !endDate ? <p className="mt-1.5 text-xs text-[#EF4444]">End date is required</p> : null}
            </div>
          </div>

          {dateOrderInvalid ? (
            <p className="mt-2 text-xs text-[#EF4444]">End date must be on or after start date.</p>
          ) : null}

          {validateError ? (
            <div className="mt-3 rounded-md border border-[#EF4444] bg-transparent px-3 py-2 text-xs text-[#EF4444]">
              {validateError}
            </div>
          ) : null}

          {validation && validation.is_valid === false ? (
            <div className="mt-3 rounded-md border border-[#EF4444] bg-transparent px-3 py-2 text-xs text-[#EF4444]">
              {globalInvalidMessages.length > 0 ? (
                <ul className="list-disc pl-4">
                  {globalInvalidMessages.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              ) : (
                <p>This date range is not valid for leave.</p>
              )}
            </div>
          ) : null}

          {warningsList.length > 0 ? (
            <div className="mt-3 rounded-md border border-[#F59E0B]/40 bg-transparent px-3 py-2 text-xs text-[#F59E0B]">
              <ul className="list-disc pl-4">
                {warningsList.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {isSickLeaveSelected ? (
            <div className="mt-3">
              <FieldLabel>Upload document (optional)</FieldLabel>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
                className="w-full text-xs text-[#9FB3C8] file:mr-3 file:rounded-md file:border-0 file:bg-[#8B7CF6] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
              />
              {documentFile ? (
                <p className="mt-1 text-[11px] text-[#9FB3C8]">
                  Selected: <span className="text-white">{documentFile.name}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          {startDate && endDate && !dateOrderInvalid ? (
            <div className="mt-4">
              {validating ? (
                <div>
                  <p className="mb-1.5 text-xs text-[#9FB3C8]">Select type of leave you want to apply</p>
                  <div className="flex h-10 items-center rounded-md border border-white/5 bg-[#0F2435] px-3 text-xs text-[#9FB3C8]">
                    Checking availability…
                  </div>
                </div>
              ) : leaveOptions.length === 0 && !validateError ? (
                <div>
                  <p className="mb-1.5 text-xs text-[#9FB3C8]">Select type of leave you want to apply</p>
                  <div className="rounded-md border border-white/5 bg-[#0F2435] px-3 py-2 text-xs text-[#9FB3C8]">
                    No leave types returned. Adjust dates or try again.
                  </div>
                </div>
              ) : (
                <LeaveTypeDropdown
                  options={leaveOptions}
                  value={selectedLeaveTypeId}
                  onChange={(id) => {
                    setLeaveTypeTouched(true);
                    setLeaveTypeBlockError(null);
                    setSelectedLeaveTypeId(id);
                  }}
                  onNotAllowedAttempt={(opt) => {
                    setLeaveTypeTouched(true);
                    const list =
                      opt?.reasons_if_not_allowed?.length > 0
                        ? opt.reasons_if_not_allowed
                        : opt?.subtitle
                          ? [opt.subtitle]
                          : opt?.reason
                            ? [opt.reason]
                            : ['This leave type cannot be selected.'];
                    setLeaveTypeBlockError(list);
                  }}
                  disabled={validating}
                  label="Select type of leave you want to apply"
                  placeholder="Select"
                />
              )}

              {leaveTypeBlockError?.length ? (
                <div className="mt-2 rounded-md border border-[#EF4444] bg-transparent px-3 py-2 text-xs text-[#EF4444]">
                  <ul className="list-disc pl-4">
                    {leaveTypeBlockError.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {leaveTypeTouched && !selectedLeaveTypeId ? (
                <p className="mt-2 text-xs text-[#EF4444]">Leave type is required</p>
              ) : leaveTypeTouched && selectedLeaveTypeId && selectedOption && !selectedOption.isAllowed ? (
                <p className="mt-2 text-xs text-[#EF4444]">Selected leave type is not allowed</p>
              ) : null}
            </div>
          ) : (
            <div className="mt-4">
              <p className="mb-1.5 text-xs text-[#9FB3C8]">Select type of leave you want to apply</p>
              <div className="rounded-md border border-white/5 bg-[#0F2435] px-3 py-2 text-xs text-[#9FB3C8]">
                Select start and end dates first.
              </div>
            </div>
          )}

          <div className="mt-4">
            <div className="inline-flex rounded-md border border-white/5 bg-[#0F2435] p-1">
              <button
                type="button"
                onClick={() => {
                  setDurationMode('full');
                  setStartSession('full');
                  setEndSession('full');
                }}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  durationMode === 'full' ? 'bg-[#1E3A5F] text-white' : 'text-[#9FB3C8] hover:text-white'
                }`}
              >
                Full days
              </button>
              <button
                type="button"
                onClick={() => {
                  setDurationMode('custom');
                  // Custom mode must use half sessions (no "full" option in selector).
                  setStartSession((prev) => (prev === 'full' ? 'first_half' : prev));
                  setEndSession((prev) => (prev === 'full' ? (isSingleDay ? 'first_half' : 'second_half') : prev));
                }}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  durationMode === 'custom' ? 'bg-[#1E3A5F] text-white' : 'text-[#9FB3C8] hover:text-white'
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {durationMode === 'custom' ? (
            <div className={`mt-3 grid gap-3 ${isSingleDay ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <div className={isSingleDay ? '' : ''}>
                <FieldLabel>{isSingleDay ? 'Session' : 'Start session'}</FieldLabel>
                <select
                  value={startSession}
                  onChange={(e) => {
                    const v = e.target.value;
                    setStartSession(v);
                    if (isSingleDay) setEndSession(v);
                  }}
                  className="h-10 w-full rounded-md border border-white/5 bg-[#0F2435] px-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#8B7CF6]"
                >
                  <option value="first_half">First half</option>
                  <option value="second_half">Second half</option>
                </select>
              </div>

              {!isSingleDay ? (
                <div>
                  <FieldLabel>End session</FieldLabel>
                  <select
                    value={endSession}
                    onChange={(e) => setEndSession(e.target.value)}
                    className="h-10 w-full rounded-md border border-white/5 bg-[#0F2435] px-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#8B7CF6]"
                  >
                    <option value="first_half">First half</option>
                    <option value="second_half">Second half</option>
                  </select>
                </div>
              ) : null}
            </div>
          ) : null}

          <p className="mt-3 text-xs text-[#9FB3C8]">{requestLine}</p>

          <div className="mt-4">
            <FieldLabel>Reason *</FieldLabel>
            <p className="mb-2 text-[11px] text-[#9FB3C8]">For HR approval only — not sent to notified colleagues.</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => setNoteTouched(true)}
              placeholder="Explain why you need this leave"
              className="h-28 w-full resize-none rounded-md border border-white/5 bg-[#0F2435] px-3 py-2 text-sm text-white placeholder:text-[#9FB3C8] focus:outline-none focus:ring-1 focus:ring-[#8B7CF6]"
            />
            {noteTouched && !note.trim() ? <p className="mt-1.5 text-xs text-[#EF4444]">Reason is required</p> : null}
          </div>

          <LeaveNotifySection
            selectedIds={notifyEmployeeIds}
            onSelectedIdsChange={setNotifyEmployeeIds}
            notifyMessage={notifyMessage}
            onNotifyMessageChange={setNotifyMessage}
            disabled={submitting}
          />

          {submitError ? (
            <div className="mt-3 whitespace-pre-line rounded-md border border-[#EF4444] bg-transparent px-3 py-2 text-xs text-[#EF4444]">
              {submitError}
            </div>
          ) : null}
        </div>

        <footer className="border-t border-white/5 p-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-md border border-[#334155] bg-transparent text-sm font-semibold text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
              className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#8B7CF6] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Spinner />
                  Submitting…
                </>
              ) : (
                'Request'
              )}
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
