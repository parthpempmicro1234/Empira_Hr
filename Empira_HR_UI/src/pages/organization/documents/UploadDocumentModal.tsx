import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { X } from 'lucide-react';
import {
  createDocument,
  patchDocumentMetadata,
  patchDocumentMultipart,
  type OrgDocFolder,
  type OrgDocument,
} from '../../../services/orgDocuments';
import { showToast } from './toast';

function cx(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

function toDateInputValue(iso: string | null | undefined) {
  if (!iso) return '';
  return String(iso).slice(0, 10);
}

export default function UploadDocumentModal({
  open,
  mode,
  folders,
  folderId,
  doc,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  folders: OrgDocFolder[];
  folderId: number | null;
  doc?: OrgDocument | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const qc = useQueryClient();
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setInlineError(null);
    if (mode === 'edit' && doc) {
      setSelectedFolder(String(doc.folder));
      setTitle(doc.title ?? '');
      setDescription(doc.description ?? '');
      setExpiryDate(toDateInputValue(doc.expiry_date));
      setFile(null);
    } else {
      setSelectedFolder(folderId != null ? String(folderId) : '');
      setTitle('');
      setDescription('');
      setExpiryDate('');
      setFile(null);
    }
  }, [open, mode, doc, folderId]);

  const canSubmit = useMemo(() => {
    if (!selectedFolder) return false;
    if (!title.trim()) return false;
    if (mode === 'create' && !file) return false;
    return true;
  }, [selectedFolder, title, file, mode]);

  const mutation = useMutation({
    mutationFn: async () => {
      setInlineError(null);
      const folder = Number(selectedFolder);
      if (!Number.isFinite(folder)) throw new Error('Invalid folder');

      if (mode === 'create') {
        if (!file) throw new Error('File required');
        return createDocument({
          folder,
          title: title.trim(),
          description: description.trim() || undefined,
          expiry_date: expiryDate || undefined,
          file,
        });
      }

      if (!doc?.id) throw new Error('Missing document id');

      const payload = {
        folder,
        title: title.trim(),
        description: description.trim() || null,
        expiry_date: expiryDate || null,
      };

      if (file) {
        return patchDocumentMultipart(doc.id, { ...payload, file });
      }
      return patchDocumentMetadata(doc.id, payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['orgDocuments', 'documents'] });
      showToast(mode === 'create' ? 'Document uploaded' : 'Document updated', 'success');
      onSuccess();
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
        showToast('Unable to save document. Please try again.', 'error');
        return;
      }
      showToast('Unable to save document.', 'error');
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
      <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close modal" onClick={onClose} />

      <div className="absolute left-1/2 top-1/2 w-[min(92vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-700 bg-slate-900 shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div className="text-sm font-semibold text-slate-100">
            {mode === 'create' ? 'Upload document' : 'Edit document'}
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

        <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-slate-300">Folder</label>
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400/40"
            >
              <option value="">Select folder</option>
              {folders.map((f) => (
                <option key={String(f.id)} value={String(f.id)}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-slate-300">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={cx(
                'w-full rounded-lg border bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none',
                inlineError ? 'border-rose-500/60' : 'border-slate-700 focus:border-emerald-400/40'
              )}
              placeholder="Document title"
              autoFocus
            />
            {inlineError ? <div className="mt-1 text-xs font-semibold text-rose-300">{inlineError}</div> : null}
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-slate-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[86px] w-full resize-y rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400/40"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">Expiration date</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400/40"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">
              File {mode === 'edit' ? '(optional replace)' : ''}
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-100 hover:file:bg-slate-700"
            />
            {mode === 'create' && !file ? <div className="mt-1 text-[11px] text-slate-400">Required.</div> : null}
          </div>
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
            {mutation.isPending ? 'Saving…' : mode === 'create' ? 'Upload' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

