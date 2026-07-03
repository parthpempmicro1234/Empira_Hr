import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import AboutSummary from './AboutSummary';
import AboutTimeline from './AboutTimeline';
import AboutWallActivity from './AboutWallActivity.jsx';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function SecondaryTabs({ value, onChange, viewMode = false }) {
  const tabs = useMemo(() => (viewMode ? ['Summary', 'Timeline'] : ['Summary', 'Timeline', 'Wall Activity']), [viewMode]);
  return (
    <div className="mb-6 flex items-center gap-2">
      <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900/60 p-1">
        {tabs.map((t) => {
          const active = t === value;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onChange(t)}
              className={cx(
                'rounded-md px-4 py-2 text-sm font-semibold transition',
                active
                  ? 'bg-slate-950 text-slate-50 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-950/40 hover:text-slate-50'
              )}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AboutSection({ profile, openEdit, viewMode = false, employeeId = null }) {
  const [aboutTab, setAboutTab] = useState('Summary');

  return (
    <div>
      <SecondaryTabs value={aboutTab} onChange={setAboutTab} viewMode={viewMode} />

      <AnimatePresence mode="wait">
        {aboutTab === 'Summary' ? (
          <motion.div
            key="about-summary"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <AboutSummary profile={profile} openEdit={openEdit} employeeId={employeeId} />
          </motion.div>
        ) : aboutTab === 'Timeline' ? (
          <motion.div
            key="about-timeline"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <AboutTimeline employeeId={employeeId} />
          </motion.div>
        ) : (
          <motion.div
            key="about-wall"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <AboutWallActivity />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

