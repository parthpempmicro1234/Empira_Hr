import React from 'react';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Keka-style horizontal tab bar for the Me section.
 * Solid #0A1D2C bar, muted inactive tabs, white active + purple caret (rotated 180°).
 */
export default function MeSectionTabBar({
  tabs,
  activeId,
  onChange,
  className,
  ariaLabel = 'Section',
}) {
  return (
    <nav
      className={cx(
        'w-full border-b border-[#132f48] bg-[#0A1D2C] mb-5 shadow-none',
        'overflow-x-auto overflow-y-visible',
        className
      )}
      aria-label={ariaLabel}
    >
      <div className="flex min-w-max items-end gap-6 px-4 pb-0 sm:gap-8 md:px-6 lg:px-8">
        {tabs.map((t) => {
          const active = activeId === t.id;
          return (
            <div key={t.id} className="relative flex shrink-0 flex-col items-center pb-[6px]">
              <button
                type="button"
                onClick={() => onChange(t.id)}
                className={cx(
                  'whitespace-nowrap pb-2 pt-2.5 text-left text-[15px] font-semibold uppercase tracking-wide transition-colors duration-200 ease-out',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5746AF]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1D2C]',
                  active
                    ? 'text-white'
                    : 'text-[#9FB3C8] hover:text-[#D6E4F0]'
                )}
              >
                {t.label}
              </button>
              <span
                aria-hidden
                className={cx(
                  'pointer-events-none absolute bottom-0 left-1/2 h-0 w-0 -translate-x-1/2 rotate-180 border-x-[6px] border-t-[6px] border-x-transparent border-solid border-t-[#5746AF]',
                  'origin-center transition-[opacity,transform] duration-300 ease-out',
                  active ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                )}
              />
            </div>
          );
        })}
      </div>
    </nav>
  );
}
