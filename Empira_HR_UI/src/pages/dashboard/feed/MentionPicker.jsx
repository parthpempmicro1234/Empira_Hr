import React, { useEffect, useState } from 'react';
import { searchEmployeeSortProfile } from '../../../services/employeeSortProfile';
import { cx, normalizeAuthor } from './feedUtils.js';

export default function MentionPicker({ selected, onChange, placeholder = 'Mention peers…' }) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return undefined;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await searchEmployeeSortProfile(q);
        if (!cancelled) setHits(list);
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const add = (hit) => {
    const id = hit.id;
    if (selected.some((s) => String(s.id) === String(id))) return;
    onChange([...selected, normalizeAuthor({ id, display_name: hit.display_name, profile_image: hit.profile_image })]);
    setQuery('');
    setHits([]);
    setOpen(false);
  };

  const remove = (id) => onChange(selected.filter((s) => String(s.id) !== String(id)));

  return (
    <div className="relative">
      {selected.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-xs text-slate-200 ring-1 ring-slate-700"
            >
              {p.displayName}
              <button type="button" onClick={() => remove(p.id)} className="text-slate-400 hover:text-slate-100">
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={cx(
          'w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100',
          'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/35'
        )}
      />
      {open && (query.trim().length >= 2 || loading) ? (
        <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-lg">
          {loading ? (
            <li className="px-3 py-2 text-xs text-slate-400">Searching…</li>
          ) : hits.length ? (
            hits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => add(h)}
                  className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
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
