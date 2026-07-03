import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import axios from 'axios';
import { createDocFolder, patchDocFolder, type OrgDocFolder } from '../../../services/orgDocuments';
import { getBusinessUnits } from '../../../services/employeeDirectory';
import type { AppRole } from './roles';
import { showToast } from './toast';

function cx(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

export default function CreateEditFolderModal({
  open,
  mode,
  role,
  folder,
  onClose,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  role: AppRole;
  folder?: OrgDocFolder | null;
  onClose: () => void;
}) {
  const isAdmin = role === 'admin';
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [bu, setBu] = useState<string>('');
  const [inlineError, setInlineError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setInlineError(null);
    if (mode === 'edit' && folder) {
      setTitle(folder.title ?? '');
      setBu(folder.business_unit != null ? String(folder.business_unit) : '');
    } else {
      setTitle('');
      setBu('');
    }
  }, [open, mode, folder]);

  const businessUnitsQuery = useQuery({
    queryKey: ['businessUnits'],
    queryFn: getBusinessUnits,
    enabled: open && isAdmin,
    staleTime: 5 * 60_000,
  });

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (mode === 'create' && isAdmin && !bu) return false;
    return true;
  }, [title, mode, isAdmin, bu]);

  const mutation = useMutation({
    mutationFn: async () => {
      setInlineError(null);
      if (mode === 'create') {
        const payload: any = { title: title.trim() };
        if (isAdmin) payload.business_unit = bu;
        return createDocFolder(payload);
      }
      if (!folder?.id) throw new Error('Missing folder id');
      const payload: any = { title: title.trim() };
      if (isAdmin) payload.business_unit = bu || null;
      return patchDocFolder(folder.id, payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['orgDocuments', 'folders'] });
      showToast(mode === 'create' ? 'Folder created' : 'Folder updated', 'success');
      onClose();
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      const data = err?.response?.data;
      if (status === 401) {
        window.location.assign('/login');
        return;
      }
      if (status === 400 && data?.title) {
        setInlineError(String(Array.isArray(data.title) ? data.title[0] : data.title));
        return;
      }
      if (status === 404 || status === 403) {
        showToast('Not allowed or item not found.', 'error');
        onClose();
        return;
      }
      if (axios.isAxiosError(err)) {
        showToast('Unable to save folder. Please try again.', 'error');
        return;
      }
      showToast('Unable to save folder.', 'error');
    },
  });

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[260]">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close modal"
        onClick={onClose}
      />

      <div className="absolute left-1/2 top-1/2 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-700 bg-slate-900 shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div className="text-sm font-semibold text-slate-100">
            {mode === 'create' ? 'New folder' : 'Edit folder'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={cx(
                'w-full rounded-lg border bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none',
                inlineError ? 'border-rose-500/60' : 'border-slate-700 focus:border-emerald-400/40'
              )}
              placeholder="e.g. Policies"
              autoFocus
            />
            {inlineError ? <div className="mt-1 text-xs font-semibold text-rose-300">{inlineError}</div> : null}
          </div>

          {isAdmin ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">Business unit</label>
              <select
                value={bu}
                onChange={(e) => setBu(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400/40"
              >
                <option value="">Select business unit</option>
                {(businessUnitsQuery.data ?? []).map((opt) => (
                  <option key={String(opt.id)} value={String(opt.id)}>
                    {opt.name}
                  </option>
                ))}
              </select>
              {mode === 'create' && !bu ? (
                <div className="mt-1 text-[11px] text-slate-400">Required for admin.</div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-700 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-transparent px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
            className={cx(
              'rounded-lg px-4 py-2 text-sm font-semibold',
              !canSubmit || mutation.isPending
                ? 'cursor-not-allowed bg-emerald-500/30 text-emerald-100/70'
                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
            )}
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

