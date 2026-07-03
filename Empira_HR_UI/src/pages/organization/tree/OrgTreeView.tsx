import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Loader2, Search } from 'lucide-react';

import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import {
  getOrgTreeDepartment,
  getOrgTreeForEmployee,
  getOrgTreeFull,
  getOrgTreeMyContext,
} from '../../../services/orgTree';
import { searchEmployeeSortProfile } from '../../../services/employeeSortProfile';
import type { SortProfileHit } from '../../../services/employeeSortProfile';

import { getInitials } from './buildTree';
import OrgTreeCanvas from './OrgTreeCanvas';
import OrgTabs, { type OrgTreeTab } from './OrgTabs';
import type { OrgBasis } from './orgTreeTypes';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function OrgTreeView() {
  const [basis, setBasis] = useState<OrgBasis>('org');
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [groupByDepartment, setGroupByDepartment] = useState(false);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(searchInput, 350);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const treeQuery = useQuery({
    queryKey: ['orgTree', basis, employeeId, groupByDepartment] as const,
    queryFn: async () => {
      if (basis === 'my') return getOrgTreeMyContext();
      if (basis === 'employee') {
        if (!employeeId) return [];
        return getOrgTreeForEmployee(employeeId);
      }
      if (groupByDepartment) return getOrgTreeDepartment();
      return getOrgTreeFull();
    },
    enabled: basis !== 'employee' || !!employeeId,
    retry: 1,
  });

  const roots = useMemo(() => treeQuery.data ?? [], [treeQuery.data]);

  const searchQuery = useQuery({
    queryKey: ['employeeSortProfile', debouncedSearch],
    queryFn: () => searchEmployeeSortProfile(debouncedSearch),
    enabled: debouncedSearch.trim().length >= 2,
  });

  const hits = searchQuery.data ?? [];

  const onTabSelect = useCallback((tab: OrgTreeTab) => {
    setEmployeeId(null);
    setHighlightedId(null);
    if (tab === 'organization') {
      setBasis('org');
      setGroupByDepartment(false);
    } else if (tab === 'department') {
      setBasis('org');
      setGroupByDepartment(true);
    } else {
      setBasis('my');
      setGroupByDepartment(false);
    }
  }, []);

  const onSearchPick = useCallback((hit: SortProfileHit) => {
    setBasis('employee');
    setEmployeeId(hit.id);
    setGroupByDepartment(false);
    setHighlightedId(hit.id);
    setSearchInput('');
    setSearchOpen(false);
  }, []);

  useEffect(() => {
    if (basis !== 'employee' || !employeeId || !treeQuery.isSuccess) return;
    const t = window.setTimeout(() => {
      const nodeEl = document.getElementById(`org-node-${employeeId}`);
      const container = containerRef.current;
      if (!nodeEl || !container) return;
      const nodeRect = nodeEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const cx = containerRect.left + containerRect.width / 2;
      const cy = containerRect.top + containerRect.height / 2;
      const nx = nodeRect.left + nodeRect.width / 2;
      const ny = nodeRect.top + nodeRect.height / 2;

      // Move the canvas so the target node approaches the viewport center.
      setPosition((p) => ({
        x: p.x + (cx - nx),
        y: p.y + (cy - ny),
      }));
    }, 120);
    return () => window.clearTimeout(t);
  }, [basis, employeeId, treeQuery.isSuccess, treeQuery.dataUpdatedAt]);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest('button') || t.closest('input') || t.closest('[role="listbox"]')) return;
    setDragging(true);
    dragRef.current = { x: e.clientX, y: e.clientY, px: position.x, py: position.y };
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!dragging || !d) return;
    setPosition({
      x: d.px + (e.clientX - d.x),
      y: d.py + (e.clientY - d.y),
    });
  };

  const endDrag = () => {
    setDragging(false);
    dragRef.current = null;
  };

  useEffect(() => {
    const onWheelNative = (e: WheelEvent) => {
      // Only override browser zoom when the gesture happens over the org viewport.
      if (!e.ctrlKey && !e.metaKey) return;
      const viewport = containerRef.current;
      if (!viewport) return;
      if (!(e.target instanceof Node) || !viewport.contains(e.target)) return;

      // Important: prevent browser zoom (requires passive:false + capture).
      e.preventDefault();
      setScale((s) => clamp(s - e.deltaY * 0.0018, 0.2, 3));
    };

    window.addEventListener('wheel', onWheelNative, { passive: false, capture: true });
    return () => window.removeEventListener('wheel', onWheelNative as EventListener, true);
  }, []);

  const errMsg = (() => {
    const e = treeQuery.error;
    if (!e) return '';
    if (isAxiosError(e)) {
      const st = e.response?.status;
      const url = e.config?.url;
      const detail =
        e.response?.data && typeof e.response.data === 'object' && 'detail' in e.response.data
          ? String((e.response.data as { detail: unknown }).detail)
          : '';
      return [st && `HTTP ${st}`, url && `${url}`, detail || e.message].filter(Boolean).join(' · ');
    }
    return e instanceof Error ? e.message : String(e);
  })();

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col rounded-xl border border-border bg-card">
      <header className="sticky top-0 z-30 flex flex-col gap-4 border-b border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-1">
          <OrgTabs
            basis={basis}
            groupByDepartment={groupByDepartment}
            isLoading={treeQuery.isFetching}
            onSelect={onTabSelect}
          />
        </div>

        <div className="relative min-w-[200px] max-w-md flex-1 sm:max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => window.setTimeout(() => setSearchOpen(false), 160)}
            placeholder="Search people…"
            className="h-10 w-full rounded-md border border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/35"
            aria-label="Search employees"
          />
          {searchOpen && debouncedSearch.trim().length >= 2 ? (
            <div
              className="absolute z-40 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-card py-1 shadow-xl"
              role="listbox"
            >
              {searchQuery.isFetching ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching…
                </div>
              ) : hits.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
              ) : (
                hits.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    role="option"
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-foreground hover:bg-muted/50"
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => onSearchPick(h)}
                  >
                    {h.profile_image ? (
                      <img
                        src={h.profile_image}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border"
                      />
                    ) : (
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-500 text-[11px] font-extrabold text-slate-950 ring-1 ring-border">
                        {getInitials(h.display_name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-foreground">{h.display_name}</div>
                      <div className="truncate text-xs text-muted-foreground">{h.job_title_primary ?? '—'}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </header>

      <div className="relative min-h-[480px] flex-1 overflow-hidden bg-background">
        {treeQuery.isPending ? (
          <div className="flex h-80 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            Loading org tree…
          </div>
        ) : treeQuery.isError ? (
          <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <p className="max-w-md text-sm text-red-400">
              Could not load the organization tree from the server. Check <code className="text-muted-foreground">VITE_API_URL</code> and paths (
              <code className="text-muted-foreground">VITE_ORG_TREE_ROOT</code> defaults to <code className="text-muted-foreground">/org/orgtree</code>).
            </p>
            {errMsg ? <p className="max-w-lg text-xs text-muted-foreground">{errMsg}</p> : null}
            <button
              type="button"
              onClick={() => void treeQuery.refetch()}
              className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/50"
            >
              Retry
            </button>
          </div>
        ) : roots.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <p>No employees were returned for this view.</p>
            <p className="max-w-md text-xs text-muted-foreground">
              The API must return either a JSON array of people (with <code className="text-muted-foreground">id</code> and{' '}
              <code className="text-muted-foreground">reporting_to</code>) or an object with{' '}
              <code className="text-muted-foreground">employee</code>, <code className="text-muted-foreground">peers</code>,{' '}
              <code className="text-muted-foreground">reportees</code>, and <code className="text-muted-foreground">reportingManager</code> (or snake_case
              equivalents).
            </p>
          </div>
        ) : (
          <div
            ref={containerRef}
            data-org-viewport
            title="Drag to pan · Ctrl or ⌘ + scroll wheel to zoom"
            className={[
              'relative h-[min(70vh,720px)] w-full overflow-hidden',
              dragging ? 'cursor-grabbing' : 'cursor-grab',
            ].join(' ')}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
          >
            <div
              data-org-canvas
              className="flex min-h-full min-w-full justify-center px-10 pb-24 pt-10"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: 'center top',
                transition: dragging ? 'none' : 'transform 180ms ease-out',
              }}
            >
              <OrgTreeCanvas
                roots={roots}
                highlightedId={highlightedId}
                // Don't show the visual grouping overlay in the Department section.
                isGroupedByDept={false}
                dataEpoch={treeQuery.dataUpdatedAt}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
