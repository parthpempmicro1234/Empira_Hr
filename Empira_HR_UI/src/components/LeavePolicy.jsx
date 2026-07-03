import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function LeavePolicy({ sections }) {
  const [openId, setOpenId] = useState(sections?.[0]?.id ?? null);

  return (
    <div className="space-y-2">
      {sections?.map((sec) => {
        const open = openId === sec.id;
        return (
          <div
            key={sec.id}
            className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/40 shadow-lg"
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : sec.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-800/40"
              aria-expanded={open}
            >
              <span className="text-sm font-semibold text-slate-200">{sec.title}</span>
              <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden border-t border-slate-700/80"
                >
                  <ul className="list-disc space-y-2 px-4 py-4 pl-8 text-sm text-slate-400 marker:text-violet-400/80">
                    {sec.bullets?.map((b, i) => (
                      <li key={i} className="leading-relaxed">
                        {b}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
