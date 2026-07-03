import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import PolicyTabs from './PolicyTabs.jsx';
import PenalisationPolicyContent from './PenalisationPolicyContent.jsx';
import TimeTrackingPolicyContent from './TimeTrackingPolicyContent.jsx';

const POLICY_TABS = [
  { id: 'penalisation', label: 'Penalisation Policy' },
  { id: 'time-tracking', label: 'Time tracking policy' },
];

export default function AttendancePolicyModal({ open, onClose }) {
  const [activeTab, setActiveTab] = useState('penalisation');
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return undefined;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setActiveTab('penalisation');
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] flex flex-col bg-[#0a1018] transition-opacity duration-300 ease-out ${
        entered ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Attendance Policy"
    >
      <header
        className={`sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-[#243044] bg-[#0a1018] px-4 py-4 transition-transform duration-300 ease-out sm:px-6 ${
          entered ? 'translate-y-0' : '-translate-y-2'
        }`}
      >
        <h1 className="text-lg font-semibold text-white sm:text-xl">Attendance Policy</h1>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          aria-label="Close attendance policy"
        >
          <X className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>
      </header>

      <div
        className={`flex min-h-0 flex-1 flex-col transition-all duration-300 ease-out ${
          entered ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        <div className="shrink-0 bg-[#0d1520] px-4 sm:px-6">
          <PolicyTabs tabs={POLICY_TABS} activeId={activeTab} onChange={setActiveTab} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 sm:py-8">
          <div
            role="tabpanel"
            id={`policy-panel-${activeTab}`}
            aria-labelledby={`policy-tab-${activeTab}`}
            key={activeTab}
          >
            {activeTab === 'penalisation' ? <PenalisationPolicyContent /> : <TimeTrackingPolicyContent />}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
