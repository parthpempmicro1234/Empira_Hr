import React from 'react';
import { cx } from './cx.js';

export default function DashboardCard({ children, className, as: Tag = 'div', ...props }) {
  return (
    <Tag
      className={cx(
        'rounded-lg border border-white/[0.06] bg-[#1b2333] font-sans',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
