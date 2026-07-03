import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { searchEmployeeSortProfile } from '../../services/employeeSortProfile';
import { getProfileHeader } from '../../services/profileHeader';
import MentionTextarea from '../dashboard/feed/MentionTextarea';

const MAX_NOTIFY = 20;
const MAX_MESSAGE = 500;

function FieldLabel({ children }) {
  return <label className="mb-1.5 block text-xs font-medium text-[#9FB3C8]">{children}</label>;
}

const inputClass =
  'w-full rounded-md border border-white/5 bg-[#0F2435] px-3 py-2 text-sm text-white placeholder:text-[#9FB3C8] focus:outline-none focus:ring-1 focus:ring-[#8B7CF6]';

const mentionTextareaClass =
  'border-white/5 bg-[#0F2435] text-white placeholder:text-[#9FB3C8] focus:ring-[#8B7CF6]';

export default function LeaveNotifySection({
  selectedIds,
  onSelectedIdsChange,
  notifyMessage,
  onNotifyMessageChange,
  disabled = false,
}) {
  const wrapRef = useRef(null);
  const [search, setSearch] = useState('');
  const [hits, setHits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState({});

  const { data: profile } = useQuery({
    queryKey: ['profileHeader', 'me'],
    queryFn: () => getProfileHeader('me'),
    staleTime: 5 * 60_000,
  });
  const currentEmployeeId = profile?.id != null ? Number(profile.id) : null;

  useEffect(() => {
    const q = search.trim();
    if (q.length < 1) {
      setHits([]);
      return undefined;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await searchEmployeeSortProfile(q);
        if (!cancelled) {
          setHits(
            list.filter((h) => {
              const id = Number(h.id);
              if (!Number.isFinite(id)) return false;
              if (currentEmployeeId != null && id === currentEmployeeId) return false;
              return !selectedIds.includes(id);
            })
          );
        }
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 240);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search, selectedIds, currentEmployeeId]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const atMax = selectedIds.length >= MAX_NOTIFY;

  const addEmployee = (hit) => {
    const id = Number(hit.id);
    if (!Number.isFinite(id) || atMax) return;
    if (currentEmployeeId != null && id === currentEmployeeId) return;
    if (selectedIds.includes(id)) return;
    onSelectedIdsChange([...selectedIds, id]);
    setSelectedLabels((prev) => ({
      ...prev,
      [id]: String(hit.display_name ?? '').trim() || `Employee ${id}`,
    }));
    setSearch('');
    setHits([]);
    setOpen(false);
  };

  const removeEmployee = (id) => {
    onSelectedIdsChange(selectedIds.filter((x) => x !== id));
    setSelectedLabels((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <div className="mt-4 space-y-3">
      <div>
        <FieldLabel>Notify colleagues (optional)</FieldLabel>
        <p className="mb-2 text-[11px] leading-relaxed text-[#9FB3C8]">
          Selected colleagues receive an in-app notification. This is separate from your approval
          reason below.
        </p>

        {selectedIds.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {selectedIds.map((id) => (
              <span
                key={id}
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#1E3A5F] px-2 py-0.5 text-xs text-white ring-1 ring-white/10"
              >
                <span className="truncate">{selectedLabels[id] ?? `ID ${id}`}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeEmployee(id)}
                  className="text-[#9FB3C8] hover:text-white"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className="relative" ref={wrapRef}>
          <label
            className={`flex h-10 items-center gap-2 rounded-md border border-white/5 bg-[#0F2435] px-3 ${
              atMax ? 'opacity-50' : ''
            }`}
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-[#9FB3C8]" />
            <input
              type="text"
              value={search}
              disabled={disabled || atMax}
              placeholder={
                atMax
                  ? `Maximum ${MAX_NOTIFY} colleagues selected`
                  : 'Search employees to notify…'
              }
              onChange={(e) => {
                setSearch(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              className="w-full bg-transparent text-xs text-white placeholder:text-[#9FB3C8] focus:outline-none"
            />
          </label>

          {open && !atMax && (loading || hits.length > 0 || search.trim().length > 0) ? (
            <ul className="absolute z-30 mt-1 max-h-40 w-full overflow-auto rounded-md border border-white/10 bg-[#0F2435] py-1 shadow-lg">
              {loading ? (
                <li className="px-3 py-2 text-xs text-[#9FB3C8]">Searching…</li>
              ) : hits.length ? (
                hits.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addEmployee(h)}
                      className="w-full px-3 py-2 text-left text-xs text-white hover:bg-[#1E3A5F]"
                    >
                      {h.display_name}
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-xs text-[#9FB3C8]">No employees found</li>
              )}
            </ul>
          ) : null}
        </div>

        <p className="mt-1.5 text-[10px] text-[#9FB3C8]">
          {selectedIds.length}/{MAX_NOTIFY} selected
        </p>
      </div>

      <div>
        <FieldLabel>Optional message</FieldLabel>
        <MentionTextarea
          value={notifyMessage}
          onChange={onNotifyMessageChange}
          maxLength={MAX_MESSAGE}
          rows={3}
          disabled={disabled}
          placeholder="Add a note for notified colleagues… Type @ to mention someone"
          className={mentionTextareaClass}
        />
        <p className="mt-1.5 text-[10px] text-[#9FB3C8]">
          Tip: use @Display Name in your message for additional mentions.
        </p>
      </div>
    </div>
  );
}
