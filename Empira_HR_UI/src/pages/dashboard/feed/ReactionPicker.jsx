import React, { useEffect, useRef, useState } from 'react';
import { ThumbsUp } from 'lucide-react';
import { REACTION_STYLES, REACTION_TYPES, getReactionMeta, reactionEmoji } from './reactions.js';
import { cx } from './feedUtils.js';

const CLOSE_DELAY_MS = 280;

export default function ReactionPicker({
  userReaction,
  likesCount,
  disabled,
  onReact,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const closeTimerRef = useRef(null);
  const meta = getReactionMeta(userReaction);
  const styleClass = userReaction ? REACTION_STYLES[userReaction] : 'text-slate-400';

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  const openPicker = () => {
    cancelClose();
    if (!disabled) setOpen(true);
  };

  useEffect(() => () => cancelClose(), []);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', onDoc, true);
    return () => document.removeEventListener('click', onDoc, true);
  }, [open]);

  const handlePick = (type) => {
    cancelClose();
    onReact(type);
    setOpen(false);
  };

  return (
    <div
      ref={wrapRef}
      className="relative inline-flex"
      onMouseEnter={openPicker}
      onMouseLeave={scheduleClose}
    >
      {/* Hover bridge + reaction menu (padding-bottom connects to trigger) */}
      <div
        className={cx(
          'absolute bottom-full left-0 z-30 pb-2',
          open ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        onMouseEnter={openPicker}
        onMouseLeave={scheduleClose}
      >
        <div
          role="menu"
          aria-hidden={!open}
          className={cx(
            'flex items-center gap-0.5 rounded-full border border-slate-600',
            'bg-slate-900 px-1.5 py-1 shadow-xl shadow-black/40',
            'transition-all duration-200 ease-out',
            open
              ? 'translate-y-0 scale-100 opacity-100'
              : 'translate-y-1 scale-95 opacity-0'
          )}
        >
          {REACTION_TYPES.map((r) => {
            const active = userReaction === r.type;
            return (
              <button
                key={r.type}
                type="button"
                role="menuitem"
                title={r.label}
                disabled={disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePick(r.type);
                }}
                className={cx(
                  'grid h-9 w-9 place-items-center rounded-full text-lg transition-transform',
                  'hover:scale-110 hover:bg-slate-800',
                  active && 'scale-110 bg-slate-800 ring-2 ring-accent/50',
                  disabled && 'cursor-not-allowed opacity-50'
                )}
                aria-label={r.label}
                aria-pressed={active}
              >
                <span role="img" aria-hidden>
                  {r.emoji}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        disabled={disabled}
        onMouseEnter={openPicker}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cx(
          'inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 text-xs font-semibold transition-colors',
          styleClass,
          !userReaction && 'hover:text-rose-300',
          disabled && 'opacity-60'
        )}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={meta ? `You reacted with ${meta.label}. Change reaction` : 'Add reaction'}
      >
        {reactionEmoji(userReaction) ? (
          <span className="text-base leading-none" role="img" aria-hidden>
            {reactionEmoji(userReaction)}
          </span>
        ) : (
          <ThumbsUp className="h-4 w-4" strokeWidth={2} />
        )}
        <span className="tabular-nums text-slate-300">{likesCount}</span>
      </button>
    </div>
  );
}
