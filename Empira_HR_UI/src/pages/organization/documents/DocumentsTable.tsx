import React, { useMemo, useState } from 'react';
import { Pencil, Search, Trash2, Upload } from 'lucide-react';
import type { OrgDocument } from '../../../services/orgDocuments';
import type { AppRole } from './roles';
import { canManageOrgDocs } from './roles';

function cx(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

function formatLastUpdated(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function openOrDownload(fileUrl: string) {
  const url = String(fileUrl || '');
  const lower = url.toLowerCase();
  const isViewable = /\.(pdf|png|jpg|jpeg|gif|webp)(\?.*)?$/.test(lower);
  if (isViewable) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function DocumentsTable({
  role,
  folderName,
  docs,
  loading,
  docSearch,
  onDocSearch,
  onUpload,
  onEdit,
  onDelete,
}: {
  role: AppRole;
  folderName: string;
  docs: OrgDocument[];
  loading: boolean;
  docSearch: string;
  onDocSearch: (value: string) => void;
  onUpload: () => void;
  onEdit: (doc: OrgDocument) => void;
  onDelete: (doc: OrgDocument) => void;
}) {
  const canManage = canManageOrgDocs(role);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => {
      const t = String(d.title ?? '').toLowerCase();
      const desc = String(d.description ?? '').toLowerCase();
      return t.includes(q) || desc.includes(q);
    });
  }, [docs, docSearch]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const startIdx = (safePage - 1) * pageSize;
  const pageItems = filtered.slice(startIdx, startIdx + pageSize);
  const rangeText = total === 0 ? '0 to 0 of 0' : `${startIdx + 1} to ${Math.min(startIdx + pageItems.length, total)} of ${total}`;

  return (
    <div className="min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-900/60">
      <div className="border-b border-slate-700 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-100">{folderName || 'Documents'}</div>
            <div className="mt-0.5 text-xs text-slate-400">Organization documents</div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={docSearch}
                onChange={(e) => {
                  setPage(1);
                  onDocSearch(e.target.value);
                }}
                placeholder="Search documents"
                className="w-[220px] max-w-[60vw] bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
            </div>

            {canManage ? (
              <button
                type="button"
                onClick={onUpload}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                <Upload className="h-4 w-4" />
                Upload document
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-950/30 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Document title</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Expiration date</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Last updated</th>
              {canManage ? <th className="px-4 py-3 text-right">Actions</th> : null}
            </tr>
          </thead>

          <tbody className="text-slate-200">
            {loading ? (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="px-4 py-10 text-center text-sm text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : pageItems.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="px-4 py-12 text-center">
                  <div className="text-sm font-semibold text-slate-200">No documents found</div>
                  {canManage ? (
                    <button
                      type="button"
                      onClick={onUpload}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
                    >
                      <Upload className="h-4 w-4" />
                      Upload document
                    </button>
                  ) : null}
                </td>
              </tr>
            ) : (
              pageItems.map((d) => (
                <tr key={String(d.id)} className="border-t border-slate-800 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => openOrDownload(d.file_url)}
                      className="font-semibold text-emerald-300 hover:text-emerald-200"
                    >
                      {d.title}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{d.description || '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{d.expiry_date ? String(d.expiry_date).slice(0, 10) : '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{d.size_display || (d.size != null ? String(d.size) : '—')}</td>
                  <td className="px-4 py-3 text-slate-300">{formatLastUpdated(d.last_updated)}</td>
                  {canManage ? (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(d)}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-700 bg-slate-950/20 text-slate-200 hover:bg-white/5"
                          aria-label="Edit document"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(d)}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-700 bg-slate-950/20 text-rose-200 hover:bg-rose-500/10"
                          aria-label="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-700 px-4 py-3 text-xs text-slate-400">
        <div>{rangeText}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className={cx(
              'rounded-lg border px-3 py-1.5 font-semibold',
              safePage <= 1 ? 'cursor-not-allowed border-slate-800 text-slate-600' : 'border-slate-700 text-slate-200 hover:bg-white/5'
            )}
          >
            Prev
          </button>
          <div className="text-slate-300">
            Page {safePage} / {pageCount}
          </div>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={safePage >= pageCount}
            className={cx(
              'rounded-lg border px-3 py-1.5 font-semibold',
              safePage >= pageCount
                ? 'cursor-not-allowed border-slate-800 text-slate-600'
                : 'border-slate-700 text-slate-200 hover:bg-white/5'
            )}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

