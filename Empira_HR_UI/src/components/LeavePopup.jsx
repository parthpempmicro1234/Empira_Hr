import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import LeaveSidebar from './LeaveSidebar.jsx';
import LeaveTabs from './LeaveTabs.jsx';
import LeaveTable from './LeaveTable.jsx';
import LeavePolicy from './LeavePolicy.jsx';
import { leavePolicyByType, mapLeaveItemToSidebarKey } from '../data/leaveDummyData.js';
import {
  fetchMyLeavesSummary,
  getLeaveTypeName,
  getSummaryRowKey,
  normalizeSummaryList,
} from '../services/leaveSummary.js';

export default function LeavePopup({
  open,
  onClose,
  initialLeaveTypeId = null,
  initialLeaveTypeName = null,
  year,
}) {
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState(null);
  const [activeTab, setActiveTab] = useState('history');
  const selectionInitialized = useRef(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['leave', 'myleaves', 'summary', year ?? '__all__'],
    queryFn: () => fetchMyLeavesSummary(year),
    enabled: open,
    staleTime: 30_000,
  });

  const summaryData = useMemo(() => normalizeSummaryList(data), [data]);

  useEffect(() => {
    if (!open) {
      selectionInitialized.current = false;
      setSelectedLeaveTypeId(null);
      setActiveTab('history');
      return;
    }
    setActiveTab('history');
  }, [open]);

  useEffect(() => {
    if (!open || isLoading) return;
    if (summaryData.length === 0) return;
    if (selectionInitialized.current) return;

    selectionInitialized.current = true;
    const hasInitial =
      initialLeaveTypeId != null &&
      summaryData.some((i, idx) => String(getSummaryRowKey(i, idx)) === String(initialLeaveTypeId));
    if (hasInitial) {
      setSelectedLeaveTypeId(initialLeaveTypeId);
      return;
    }

    const initialName = String(initialLeaveTypeName ?? '').trim().toLowerCase();
    if (initialName) {
      const matchByName = summaryData.findIndex((i) => {
        const n = String(getLeaveTypeName(i) ?? '').trim().toLowerCase();
        return n === initialName;
      });
      if (matchByName >= 0) {
        setSelectedLeaveTypeId(getSummaryRowKey(summaryData[matchByName], matchByName));
        return;
      }
    }

    setSelectedLeaveTypeId(getSummaryRowKey(summaryData[0], 0));
  }, [open, isLoading, summaryData, initialLeaveTypeId, initialLeaveTypeName]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const sidebarItems = useMemo(
    () =>
      summaryData.map((item, idx) => ({
        id: getSummaryRowKey(item, idx),
        label: getLeaveTypeName(item),
      })),
    [summaryData]
  );

  const selected = useMemo(() => {
    if (selectedLeaveTypeId == null) return null;
    return (
      summaryData.find((i, idx) => String(getSummaryRowKey(i, idx)) === String(selectedLeaveTypeId)) ??
      null
    );
  }, [summaryData, selectedLeaveTypeId]);

  const historyRows = useMemo(() => {
    const raw = selected?.balance_history;
    if (!Array.isArray(raw)) return [];
    return [...raw].sort((a, b) => {
      const ta = new Date(a.transaction_date ?? a.date ?? '').getTime();
      const tb = new Date(b.transaction_date ?? b.date ?? '').getTime();
      if (Number.isFinite(ta) && Number.isFinite(tb)) return tb - ta;
      return String(b.transaction_date ?? b.date ?? '').localeCompare(
        String(a.transaction_date ?? a.date ?? '')
      );
    });
  }, [selected]);

  const policyKey = mapLeaveItemToSidebarKey(getLeaveTypeName(selected ?? {}));
  const policySections = leavePolicyByType[policyKey] ?? leavePolicyByType.paid;

  const errMessage =
    error?.response?.data?.detail ??
    error?.response?.data?.message ??
    error?.message ??
    'Something went wrong while loading your leave summary.';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="leave-summary-shell"
            className="fixed inset-0 z-50 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
              onClick={() => onClose?.()}
              aria-hidden
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Leave summary"
              className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-[#0b1e2d] via-[#0b1e2d] to-[#0f2a3d] font-sans shadow-[0_-20px_80px_rgba(0,0,0,0.5)]"
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={{ type: 'tween', duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            >
              <header className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-4 border-b border-slate-700/90 bg-[#0b1e2d]/95 px-4 py-4 backdrop-blur-md md:px-8">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Time off</p>
                  <h2 className="bg-gradient-to-r from-violet-300 via-blue-300 to-cyan-200 bg-clip-text text-xl font-bold text-transparent md:text-2xl">
                    Leave summary
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-11 w-11 place-items-center rounded-2xl text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  aria-label="Close leave summary"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {isLoading ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-violet-400" aria-hidden />
                    <p className="text-sm text-slate-400">Loading leave summary…</p>
                  </div>
                ) : isError ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                    <p className="max-w-md text-sm text-slate-300">{errMessage}</p>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-95"
                    >
                      Try again
                    </button>
                  </div>
                ) : summaryData.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
                    <p className="text-sm text-slate-400">No leave types returned for your account.</p>
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 md:flex-row md:gap-8 md:px-8 md:py-8">
                    <aside className="shrink-0 md:w-56 mt-5">
                      <LeaveSidebar
                        items={sidebarItems}
                        activeId={selectedLeaveTypeId}
                        onChange={setSelectedLeaveTypeId}
                      />
                    </aside>

                    <main className="min-h-0 min-w-0 flex-1">
                      <div className="bg-slate-900/30 p-4 shadow-lg md:p-6">
                        <LeaveTabs active={activeTab} onChange={setActiveTab} />

                        <div className="mt-6">
                          <AnimatePresence mode="wait">
                            {activeTab === 'history' ? (
                              <motion.div
                                key="history"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2 }}
                              >
                                <LeaveTable rows={historyRows} />
                              </motion.div>
                            ) : (
                              <motion.div
                                key="policy"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2 }}
                              >
                                <LeavePolicy sections={policySections} />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </main>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>,
    document.body
  );
}
