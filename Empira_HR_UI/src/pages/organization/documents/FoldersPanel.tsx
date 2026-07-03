import React, { useMemo } from 'react';
import { Folder, Plus, Search } from 'lucide-react';
import type { OrgDocFolder } from '../../../services/orgDocuments';
import type { AppRole } from './roles';
import { canManageOrgDocs } from './roles';

function cx(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

export default function FoldersPanel({
  role,
  folders,
  selectedFolderId,
  search,
  onSearch,
  onSelectFolder,
  onNewFolder,
}: {
  role: AppRole;
  folders: OrgDocFolder[];
  selectedFolderId: number | null;
  search: string;
  onSearch: (value: string) => void;
  onSelectFolder: (id: number) => void;
  onNewFolder: () => void;
}) {
  const canManage = canManageOrgDocs(role);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return folders;
    return folders.filter((f) => String(f.title ?? '').toLowerCase().includes(q));
  }, [folders, search]);

  return (
    <div className="w-[280px] shrink-0 rounded-2xl border border-slate-700 bg-slate-900/60">
      <div className="border-b border-slate-700 p-4">
        <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
          />
        </div>

        {canManage ? (
          <button
            type="button"
            onClick={onNewFolder}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4" />
            New Folder
          </button>
        ) : null}
      </div>

      <div className="max-h-[calc(100vh-320px)] overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-slate-400">No folders found.</div>
        ) : (
          <div className="space-y-1">
            {filtered.map((f) => {
              const selected = selectedFolderId === f.id;
              return (
                <button
                  key={String(f.id)}
                  type="button"
                  onClick={() => onSelectFolder(f.id)}
                  className={cx(
                    'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition',
                    selected ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25' : 'text-slate-200 hover:bg-white/5'
                  )}
                >
                  <Folder className={cx('h-4 w-4', selected ? 'text-emerald-300' : 'text-slate-400')} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

