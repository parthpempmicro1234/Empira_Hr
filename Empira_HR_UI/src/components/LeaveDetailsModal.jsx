import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import AvatarBadge from './AvatarBadge.jsx';
import StatusBadge from './StatusBadge.jsx';

export default function LeaveDetailsModal({ open, onClose, detail }) {
  const [draft, setDraft] = useState('');
  const [localComments, setLocalComments] = useState([]);

  useEffect(() => {
    if (!open) {
      setDraft('');
      setLocalComments([]);
      return;
    }
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open && detail) setLocalComments([]);
  }, [open, detail?.name, detail?.leaveDateLabel]);

  if (typeof document === 'undefined') return null;

  const baseComments = detail?.comments ?? [];
  const allComments = [...baseComments, ...localComments];

  const handleAddComment = (e) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t) return;
    setLocalComments((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        author: 'You',
        text: t,
        at: new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
      },
    ]);
    setDraft('');
  };

  return createPortal(
    <AnimatePresence>
      {open && detail ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Leave request details"
            className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-700 bg-gradient-to-b from-[#0f2a3d] to-[#0b1e2d] shadow-2xl sm:max-h-[85dvh] sm:rounded-3xl"
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-700 px-5 py-4">
              <div className="flex gap-3">
                <AvatarBadge initials={detail.initials} size="lg" />
                <div>
                  <p className="font-semibold text-slate-100">{detail.name}</p>
                  <p className="text-xs text-slate-400">{detail.meta}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-slate-600 bg-slate-900/60 px-5 py-3 text-center shadow-inner">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Leave date</p>
                  <p className="bg-gradient-to-r from-violet-300 to-blue-300 bg-clip-text text-xl font-bold text-transparent">
                    {detail.leaveDateLabel}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Type</p>
                  <p className="text-sm font-medium text-slate-200">{detail.leaveType}</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Comments</p>
                <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
                  {allComments.length ? (
                    allComments.map((c) => (
                      <div key={c.id} className="rounded-xl bg-slate-800/40 px-3 py-2">
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-medium text-violet-300">{c.author}</span>
                          <span className="text-[10px] text-slate-500">{c.at}</span>
                        </div>
                        <p className="text-sm text-slate-300">{c.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No comments yet.</p>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Approval timeline</p>
                <ul className="relative space-y-4 border-l border-slate-600 pl-5">
                  {detail.timeline?.map((step, i) => (
                    <li key={step.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 ring-4 ring-[#0f2a3d]" />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-200">{step.label}</span>
                        <StatusBadge status={step.status} />
                      </div>
                      <p className="text-xs text-slate-500">{step.at}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <form
              onSubmit={handleAddComment}
              className="border-t border-slate-700 bg-[#0b1e2d]/95 p-4 backdrop-blur"
            >
              <label htmlFor="leave-detail-comment" className="sr-only">
                Add comment
              </label>
              <div className="flex gap-2">
                <input
                  id="leave-detail-comment"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Add a comment…"
                  className="min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-95"
                >
                  Send
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
