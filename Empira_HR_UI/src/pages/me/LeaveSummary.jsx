import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import RequestLeaveDrawer from './RequestLeaveDrawer.jsx';
import MyLeaveStats from './MyLeaveStats.jsx';
import LeaveBalances from './LeaveBalances.jsx';
import PendingLeaveSection from './PendingLeaveSection.jsx';
import LeaveHistoryTable from './LeaveHistoryTable.jsx';
import LeaveDetailsDrawer from './LeaveDetailsDrawer.jsx';
import useLeaveData from './useLeaveData';

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-lg border border-white/5 bg-[#0F2435] p-4 ${className}`}>
      {children}
    </div>
  );
}

function formatYearRangeLabel(year) {
  const y = Number(year);
  if (!Number.isFinite(y)) return 'Select year';
  return `Jan ${y} - Dec ${y}`;
}

function YearSelect({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label = formatYearRangeLabel(value);

  return (
    <div className="relative w-full sm:w-auto" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group inline-flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0C2030] px-3 text-sm font-semibold text-white shadow-[0_12px_30px_-18px_rgba(0,0,0,0.65)] transition hover:border-white/20 hover:bg-[#102739] sm:w-[230px]"
        aria-expanded={open}
        aria-label="Select leave year"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 place-items-center text-[#9FB3C8] transition group-hover:text-white">
            <CalendarDays className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm text-white/90">{label}</span>
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#9FB3C8] transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="absolute right-0 top-[46px] z-50 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0F2435] shadow-[rgba(0,0,0,0.60)_-18px_18px_46px] sm:w-[260px]">
          <div className="max-h-[260px] overflow-auto py-1">
            {options.map((y) => {
              const active = String(y) === String(value);
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    onChange(y);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                    active ? 'bg-[#102739] text-white' : 'text-[#D6E4F0] hover:bg-[#102739]'
                  }`}
                >
                  <span className="font-semibold">{formatYearRangeLabel(y)}</span>
                  {active ? <span className="text-xs font-semibold text-[#8B7CF6]">Selected</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function LeaveSummary({ initialLeaveId = null }) {
  const [isRequestDrawerOpen, setIsRequestDrawerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLeave, setDetailsLeave] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const nowYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(nowYear);
  const { joiningYear } = useLeaveData(selectedYear);

  const yearOptions = useMemo(() => {
    const start = joiningYear && joiningYear > 1900 ? joiningYear : nowYear;
    const min = Math.min(start, nowYear);
    const max = Math.max(start, nowYear);
    const out = [];
    for (let y = max; y >= min; y -= 1) out.push(y);
    return out;
  }, [joiningYear, nowYear]);

  useEffect(() => {
    if (!yearOptions.length) return;
    if (yearOptions.includes(selectedYear)) return;
    setSelectedYear(yearOptions[0]);
  }, [selectedYear, yearOptions]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!initialLeaveId) return;
    const id = Number(initialLeaveId);
    if (!Number.isFinite(id)) return;
    setDetailsLeave({ id });
    setDetailsOpen(true);
  }, [initialLeaveId]);

  const showSuccessToast = () => {
    setToast('Leave request submitted successfully');
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2800);
  };

  return (
    <>
    <div className="space-y-5 rounded-b-xl bg-[#081A29] pb-5 pt-3 font-sans text-white sm:space-y-4">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Pending leave requests</h2>
          <YearSelect value={selectedYear} options={yearOptions} onChange={setSelectedYear} />
        </div>
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_220px]">
          <PendingLeaveSection
            year={selectedYear}
            onOpenDetails={(leave) => {
              setDetailsLeave(leave);
              setDetailsOpen(true);
            }}
          />
          <Card className="flex h-[132px] w-full shrink-0 flex-col justify-center gap-3 lg:w-[220px] lg:min-w-[220px] lg:max-w-[220px]">
            <button
              type="button"
              onClick={() => setIsRequestDrawerOpen(true)}
              className="rounded-md bg-[#8B7CF6] px-3 py-2 text-sm font-semibold text-white"
            >
              Request Leave
            </button>
            {/* <a href="#" onClick={(e) => e.preventDefault()} className="text-center text-xs font-medium text-[#8B7CF6]">
              Leave Policy Explanation
            </a> */}
            <span href="#" onClick={(e) => e.preventDefault()} className="text-center text-xs font-medium text-[#8B7CF6]">
              Click button to Apply leave
            </span>
          </Card>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-white">My Leave Stats</h3>
        <MyLeaveStats year={selectedYear} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Leave Balances</h3>
        <LeaveBalances year={selectedYear} />
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-white">Leave History</h3>
        <LeaveHistoryTable
          year={selectedYear}
          onOpenDetails={(leave) => {
            setDetailsLeave(leave);
            setDetailsOpen(true);
          }}
        />
      </section>
    </div>
    <RequestLeaveDrawer
      isOpen={isRequestDrawerOpen}
      onClose={() => setIsRequestDrawerOpen(false)}
      onRequestSuccess={showSuccessToast}
    />

    <LeaveDetailsDrawer
      isOpen={detailsOpen}
      onClose={() => setDetailsOpen(false)}
      leaveData={detailsLeave}
    />

    {toast ? (
      <div
        role="status"
        className="fixed bottom-6 left-1/2 z-[100] max-w-[min(92vw,420px)] -translate-x-1/2 rounded-lg border border-white/10 bg-[#0F2435] px-4 py-3 text-sm font-medium text-white shadow-xl"
      >
        {toast}
      </div>
    ) : null}
    </>
  );
}
