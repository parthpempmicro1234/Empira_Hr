import { useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useOutsideClick } from '../../../hooks/useOutsideClick';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function normId(id) {
  return String(id);
}

/**
 * Reusable multi-select dropdown with internal search.
 *
 * Props:
 * - label: string
 * - items: [{ id, name }]
 * - selected: array of ids
 * - onChange: (nextSelectedIds) => void
 * - renderList: optional (helpers) => ReactNode to render a custom list (e.g. nested)
 */
export default function FilterDropdown({ label, items, selected, onChange, renderList }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useOutsideClick(ref, () => setOpen(false), open);

  const selectedSet = useMemo(() => new Set(selected.map(normId)), [selected]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => String(x?.name ?? '').toLowerCase().includes(s));
  }, [items, q]);

  const toggle = (id) => {
    const key = normId(id);
    const next = new Set(selected.map(normId));
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(Array.from(next));
  };

  const helpers = {
    filtered,
    q,
    setQ,
    open,
    setOpen,
    selectedSet,
    toggle,
    icons: { ChevronRight },
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cx(
          'inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm text-foreground',
          'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-accent/35'
        )}
        aria-expanded={open}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {selected.length ? (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
            {selected.length}
          </span>
        ) : null}
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open ? (
        <div className="absolute left-0 z-50 mt-2 w-64 rounded-md border border-border bg-card p-2 shadow-xl">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="h-8 w-full rounded border border-border bg-background pl-7 pr-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/35"
              aria-label={`${label} search`}
            />
          </div>

          <div className="max-h-60 overflow-y-auto pr-1">
            {renderList ? (
              renderList(helpers)
            ) : filtered.length ? (
              filtered.map((x) => {
                const checked = selectedSet.has(normId(x.id));
                return (
                  <label
                    key={String(x.id)}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-foreground hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(x.id)}
                      className="h-3.5 w-3.5 rounded border-border bg-background text-accent focus:ring-accent/35"
                    />
                    <span className="min-w-0 truncate">{x.name}</span>
                  </label>
                );
              })
            ) : (
              <div className="px-2 py-2 text-xs text-muted-foreground">No options</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

