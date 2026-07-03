import React from 'react';
import { motion } from 'framer-motion';

function cx(...c) {
  return c.filter(Boolean).join(' ');
}

export default function JobProfileCard({ title, children, className = '' }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={cx(
        'rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm sm:p-5',
        'transition-colors duration-200 hover:border-slate-700/90',
        className
      )}
    >
      <div className="mb-3 border-b border-slate-800 pb-2.5">
        <h2 className="text-sm font-semibold tracking-tight text-slate-100">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}
