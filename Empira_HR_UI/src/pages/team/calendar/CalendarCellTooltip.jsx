import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CALENDAR_TOOLTIP_WIDTH,
  computeCalendarTooltipPosition,
  refineCalendarTooltipPosition,
} from './calendarTooltipPosition.js';

const HOVER_CLOSE_MS = 80;

function usePrefersCoarsePointer() {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return coarse;
}

function TooltipCard({ content, position, placement, open, tooltipId, onEnter, onLeave, tooltipRef }) {
  if (!content?.rows?.length) return null;

  const motionY = placement === 'top' ? 6 : -6;

  return (
    <motion.div
      ref={tooltipRef}
      id={tooltipId}
      role="tooltip"
      style={{
        top: position.top,
        left: position.left,
        width: CALENDAR_TOOLTIP_WIDTH,
      }}
      className="pointer-events-auto fixed z-[200] max-w-[calc(100vw-16px)] rounded-lg border border-white/[0.08] bg-[#151d2b]/95 px-2.5 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm"
      initial={{ opacity: 0, y: motionY }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: motionY * 0.5 }}
      transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <motion.div
        className="absolute left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-x-transparent"
        style={
          placement === 'top'
            ? {
                bottom: -5,
                borderTopWidth: 5,
                borderTopColor: 'rgba(255,255,255,0.08)',
              }
            : {
                top: -5,
                borderBottomWidth: 5,
                borderBottomColor: 'rgba(255,255,255,0.08)',
              }
        }
        aria-hidden
      />
      <div className="space-y-1">
        {content.rows.map((row, i) => {
          if (row.kind === 'label') {
            return (
              <p
                key={`${row.kind}-${i}`}
                className="truncate text-[9px] font-medium uppercase tracking-wide text-gray-500"
              >
                {row.text}
              </p>
            );
          }
          if (row.kind === 'date') {
            return (
              <p key={`${row.kind}-${i}`} className="text-[11px] font-semibold leading-tight text-gray-100">
                {row.text}
              </p>
            );
          }
          if (row.kind === 'status') {
            return (
              <div key={`${row.kind}-${i}`} className="flex items-center gap-1.5 pt-0.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/10"
                  style={{ backgroundColor: row.color ?? '#64748b' }}
                  aria-hidden
                />
                <span className="text-[11px] font-medium leading-tight text-gray-50">{row.text}</span>
              </div>
            );
          }
          if (row.kind === 'meta') {
            return (
              <div key={`${row.kind}-${i}`} className="flex items-baseline gap-1 text-[10px] leading-tight">
                <span className="shrink-0 text-gray-500">{row.label}</span>
                <span className="text-gray-300">{row.text}</span>
              </div>
            );
          }
          return null;
        })}
      </div>
    </motion.div>
  );
}

export default function CalendarCellTooltip({ content, children, className = '' }) {
  const tooltipId = useId();
  const anchorRef = useRef(null);
  const tooltipRef = useRef(null);
  const closeTimerRef = useRef(null);
  const isCoarse = usePrefersCoarsePointer();

  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'top' });
  const [pinned, setPinned] = useState(false);

  const hasContent = Boolean(content?.rows?.length);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    if (pinned && isCoarse) return;
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), HOVER_CLOSE_MS);
  }, [clearCloseTimer, pinned, isCoarse]);

  const updatePosition = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = computeCalendarTooltipPosition(rect);
    setPosition(next);
    requestAnimationFrame(() => {
      const el = tooltipRef.current;
      const anchor = anchorRef.current?.getBoundingClientRect();
      if (el && anchor) {
        setPosition(refineCalendarTooltipPosition(anchor, el));
      }
    });
  }, []);

  const show = useCallback(() => {
    if (!hasContent) return;
    clearCloseTimer();
    updatePosition();
    setOpen(true);
  }, [hasContent, clearCloseTimer, updatePosition]);

  const hide = useCallback(() => {
    if (pinned && isCoarse) return;
    scheduleClose();
  }, [pinned, isCoarse, scheduleClose]);

  useEffect(() => {
    if (!open) return undefined;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!isCoarse || !pinned) return undefined;
    const onDocClick = (e) => {
      if (
        anchorRef.current?.contains(e.target) ||
        tooltipRef.current?.contains(e.target)
      ) {
        return;
      }
      setPinned(false);
      setOpen(false);
    };
    document.addEventListener('pointerdown', onDocClick);
    return () => document.removeEventListener('pointerdown', onDocClick);
  }, [isCoarse, pinned]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  if (!hasContent) {
    return <div className={className}>{children}</div>;
  }

  const handlePointerEnter = () => {
    if (isCoarse) return;
    show();
  };

  const handlePointerLeave = () => {
    if (isCoarse) return;
    hide();
  };

  const handleClick = (e) => {
    if (!isCoarse) return;
    e.stopPropagation();
    if (open && pinned) {
      setPinned(false);
      setOpen(false);
    } else {
      updatePosition();
      setOpen(true);
      setPinned(true);
    }
  };

  return (
    <>
      <div
        ref={anchorRef}
        className={`${className} ${isCoarse ? 'cursor-pointer' : 'cursor-default'}`}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={handlePointerEnter}
        onMouseLeave={handlePointerLeave}
        onFocus={show}
        onBlur={hide}
        onClick={handleClick}
      >
        {children}
      </div>
      {createPortal(
        <AnimatePresence>
          {open ? (
            <TooltipCard
              content={content}
              position={position}
              placement={position.placement ?? 'top'}
              open={open}
              tooltipId={tooltipId}
              tooltipRef={tooltipRef}
              onEnter={clearCloseTimer}
              onLeave={scheduleClose}
            />
          ) : null}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
