import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Modal({ open, title, children, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          <div className="absolute inset-0 overflow-y-auto">
            <div className="mx-auto flex min-h-full max-w-3xl items-end px-5 py-10 sm:items-center sm:px-6">
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={cx(
                  'relative w-full overflow-hidden rounded-2xl border border-border bg-card shadow-[0_40px_120px_-60px_rgba(0,0,0,0.85)]',
                  'will-change-transform'
                )}
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              >
                {open && title !== '__HIDE_HEADER__' ? (
                  <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                    <div className="text-sm font-semibold text-foreground">{title}</div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted/60 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent/35"
                      aria-label="Close modal"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}

                <div className="px-5 py-5">{children}</div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

