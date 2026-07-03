import React, { useRef, useState } from 'react';
import { Smile } from 'lucide-react';
import { cx } from './feedUtils.js';

const EMOJIS = ['👍', '🎉', '❤️', '🙌', '💪', '✨', '😊', '🔥', '👏', '🌟', '💯', '🤝'];

export default function EmojiPicker({ onPick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
        aria-label="Insert emoji"
      >
        <Smile className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute bottom-full left-0 z-20 mb-1 grid grid-cols-6 gap-0.5 rounded-lg border border-slate-700 bg-slate-900 p-1.5 shadow-lg">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className={cx('rounded p-1 text-base hover:bg-slate-800')}
              onClick={() => {
                onPick(e);
                setOpen(false);
              }}
            >
              {e}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
