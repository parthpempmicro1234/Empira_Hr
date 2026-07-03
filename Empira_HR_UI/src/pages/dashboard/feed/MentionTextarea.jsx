import React, { useEffect, useRef, useState } from 'react';
import { searchEmployeeSortProfile } from '../../../services/employeeSortProfile';
import { composerInputClass, cx } from './feedUtils.js';

function getActiveMention(text, cursor) {
  const before = text.slice(0, cursor);
  const at = before.lastIndexOf('@');
  if (at === -1) return null;
  const fragment = before.slice(at + 1);
  if (!fragment.length && before.length > at + 1) return null;
  if (/\s/.test(fragment)) return null;
  return { start: at, query: fragment };
}

export default function MentionTextarea({
  value,
  onChange,
  onMentionIdsChange,
  maxLength = 500,
  rows = 4,
  placeholder = 'Write your post here… Type @ to mention someone',
  disabled = false,
  className,
}) {
  const textareaRef = useRef(null);
  const [hits, setHits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mentionIds, setMentionIds] = useState([]);
  const [activeMention, setActiveMention] = useState(null);
  const [highlightIndex, setHighlightIndex] = useState(0);

  useEffect(() => {
    onMentionIdsChange?.(mentionIds);
  }, [mentionIds, onMentionIdsChange]);

  useEffect(() => {
    const q = activeMention?.query?.trim() ?? '';
    if (!activeMention || q.length < 1) {
      setHits([]);
      return undefined;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await searchEmployeeSortProfile(q);
        if (!cancelled) {
          setHits(list);
          setHighlightIndex(0);
        }
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [activeMention?.query]);

  const syncMentionState = (text, cursor) => {
    const active = getActiveMention(text, cursor);
    setActiveMention(active);
    if (!active) setHits([]);
  };

  const handleChange = (e) => {
    const next = e.target.value;
    if (maxLength && next.length > maxLength) return;
    onChange(next);
    syncMentionState(next, e.target.selectionStart ?? next.length);
  };

  const insertMention = (hit) => {
    const el = textareaRef.current;
    const cursor = el?.selectionStart ?? value.length;
    const active = getActiveMention(value, cursor) ?? activeMention;
    if (!active) return;

    const name = String(hit.display_name ?? '').trim();
    const insertText = `@${name} `;
    const before = value.slice(0, active.start);
    const after = value.slice(cursor);
    const next = `${before}${insertText}${after}`;
    const nextCursor = before.length + insertText.length;

    onChange(next);
    setMentionIds((prev) => {
      const id = String(hit.id);
      return prev.includes(id) ? prev : [...prev, id];
    });
    setActiveMention(null);
    setHits([]);

    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleKeyDown = (e) => {
    if (!activeMention || (!hits.length && !loading)) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % Math.max(hits.length, 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + hits.length) % Math.max(hits.length, 1));
      return;
    }
    if (e.key === 'Enter' && hits.length) {
      e.preventDefault();
      insertMention(hits[highlightIndex]);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setActiveMention(null);
      setHits([]);
    }
  };

  const showMenu = Boolean(activeMention && (loading || hits.length > 0 || activeMention.query.length >= 1));

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(e) => syncMentionState(value, e.target.selectionStart)}
        onKeyUp={(e) => syncMentionState(value, e.target.selectionStart)}
        className={cx(composerInputClass, 'resize-none', className)}
      />

      {showMenu ? (
        <ul
          className="absolute z-30 mt-1 max-h-44 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-lg"
          role="listbox"
        >
          {loading ? (
            <li className="px-3 py-2 text-xs text-slate-400">Searching employees…</li>
          ) : hits.length ? (
            hits.map((h, idx) => (
              <li key={h.id} role="option" aria-selected={idx === highlightIndex}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertMention(h)}
                  className={cx(
                    'w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800',
                    idx === highlightIndex && 'bg-slate-800'
                  )}
                >
                  {h.display_name}
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-xs text-slate-400">No employees found</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
