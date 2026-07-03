import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Trash2 } from 'lucide-react';
import {
  deleteDocFolder,
  deleteDocument,
  getDocFolders,
  getDocuments,
  type OrgDocFolder,
  type OrgDocument,
} from '../../../services/orgDocuments';
import { getCurrentRole, canManageOrgDocs } from './roles';
import { showToast } from './toast';
import FoldersPanel from './FoldersPanel';
import DocumentsTable from './DocumentsTable';
import UploadDocumentModal from './UploadDocumentModal';
import CreateEditFolderModal from './CreateEditFolderModal';

function cx(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

function isAuthError(err: any) {
  const status = err?.response?.status;
  return status === 401;
}

export default function OrganizationDocumentsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const role = getCurrentRole();
  const canManage = canManageOrgDocs(role);

  const [folderSearch, setFolderSearch] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);

  const [folderModal, setFolderModal] = useState<{ open: boolean; mode: 'create' | 'edit'; folder?: OrgDocFolder | null }>({
    open: false,
    mode: 'create',
    folder: null,
  });

  const [uploadModal, setUploadModal] = useState<{ open: boolean; mode: 'create' | 'edit'; doc?: OrgDocument | null }>({
    open: false,
    mode: 'create',
    doc: null,
  });

  const [confirmDelete, setConfirmDelete] = useState<
    | { type: 'folder'; folder: OrgDocFolder }
    | { type: 'doc'; doc: OrgDocument }
    | null
  >(null);

  const foldersQuery = useQuery({
    queryKey: ['orgDocuments', 'folders'],
    queryFn: getDocFolders,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (foldersQuery.isError && isAuthError(foldersQuery.error)) {
      navigate('/login', { replace: true });
    }
  }, [foldersQuery.isError, foldersQuery.error, navigate]);

  const folders = foldersQuery.data ?? [];

  useEffect(() => {
    if (selectedFolderId != null) return;
    if (!folders.length) return;
    setSelectedFolderId(folders[0].id);
  }, [folders, selectedFolderId]);

  const selectedFolder = useMemo(
    () => folders.find((f) => f.id === selectedFolderId) ?? null,
    [folders, selectedFolderId]
  );

  const documentsQuery = useQuery({
    queryKey: ['orgDocuments', 'documents', selectedFolderId],
    queryFn: () => getDocuments(selectedFolderId as number),
    enabled: selectedFolderId != null,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (documentsQuery.isError && isAuthError(documentsQuery.error)) {
      navigate('/login', { replace: true });
    }
  }, [documentsQuery.isError, documentsQuery.error, navigate]);

  const deleteFolderMutation = useMutation({
    mutationFn: async (folder: OrgDocFolder) => {
      await deleteDocFolder(folder.id);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['orgDocuments', 'folders'] });
      showToast('Folder deleted', 'success');
      setConfirmDelete(null);
      setSelectedFolderId(null);
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      if (status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      if (status === 404 || status === 403) {
        showToast('Not allowed or item not found.', 'error');
        setConfirmDelete(null);
        return;
      }
      showToast('Unable to delete folder.', 'error');
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (doc: OrgDocument) => {
      await deleteDocument(doc.id);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['orgDocuments', 'documents'] });
      showToast('Document deleted', 'success');
      setConfirmDelete(null);
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      if (status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      if (status === 404 || status === 403) {
        showToast('Not allowed or item not found.', 'error');
        setConfirmDelete(null);
        return;
      }
      showToast('Unable to delete document.', 'error');
    },
  });

  const folderHasDocsWarning = useMemo(() => {
    if (!confirmDelete || confirmDelete.type !== 'folder') return null;
    const docs = documentsQuery.data ?? [];
    if (selectedFolderId === confirmDelete.folder.id && docs.length > 0) return docs.length;
    return null;
  }, [confirmDelete, documentsQuery.data, selectedFolderId]);

  const pageTitle = 'Organization documents';

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-100">{pageTitle}</div>
          <div className="mt-1 text-sm text-slate-400">Manage and access organization documents.</div>
        </div>

        {canManage && selectedFolder ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFolderModal({ open: true, mode: 'edit', folder: selectedFolder })}
              className="rounded-xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              Edit folder
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete({ type: 'folder', folder: selectedFolder })}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete folder
            </button>
          </div>
        ) : null}
      </div>

      {foldersQuery.isError ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4" />
            Unable to load folders
          </div>
          <div className="mt-1 text-xs text-rose-200/80">
            {(foldersQuery.error as any)?.message ? String((foldersQuery.error as any).message) : 'Please try again.'}
          </div>
        </div>
      ) : null}

      <div className="flex gap-4">
        <FoldersPanel
          role={role}
          folders={folders}
          selectedFolderId={selectedFolderId}
          search={folderSearch}
          onSearch={setFolderSearch}
          onSelectFolder={(id) => {
            setSelectedFolderId(id);
            setDocSearch('');
          }}
          onNewFolder={() => setFolderModal({ open: true, mode: 'create', folder: null })}
        />

        <DocumentsTable
          role={role}
          folderName={selectedFolder?.title ?? 'Documents'}
          docs={documentsQuery.data ?? []}
          loading={documentsQuery.isLoading}
          docSearch={docSearch}
          onDocSearch={setDocSearch}
          onUpload={() => setUploadModal({ open: true, mode: 'create', doc: null })}
          onEdit={(doc) => setUploadModal({ open: true, mode: 'edit', doc })}
          onDelete={(doc) => setConfirmDelete({ type: 'doc', doc })}
        />
      </div>

      <CreateEditFolderModal
        open={folderModal.open}
        mode={folderModal.mode}
        role={role}
        folder={folderModal.folder}
        onClose={() => setFolderModal({ open: false, mode: 'create', folder: null })}
      />

      <UploadDocumentModal
        open={uploadModal.open}
        mode={uploadModal.mode}
        folders={folders}
        folderId={selectedFolderId}
        doc={uploadModal.doc}
        onClose={() => setUploadModal({ open: false, mode: 'create', doc: null })}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['orgDocuments', 'documents'] });
        }}
      />

      {confirmDelete ? (
        <ConfirmDeleteDialog
          role={role}
          target={confirmDelete}
          folderDocsWarningCount={folderHasDocsWarning}
          loading={deleteFolderMutation.isPending || deleteDocMutation.isPending}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            if (confirmDelete.type === 'folder') deleteFolderMutation.mutate(confirmDelete.folder);
            else deleteDocMutation.mutate(confirmDelete.doc);
          }}
        />
      ) : null}
    </div>
  );
}

function ConfirmDeleteDialog({
  role,
  target,
  folderDocsWarningCount,
  loading,
  onClose,
  onConfirm,
}: {
  role: ReturnType<typeof getCurrentRole>;
  target: { type: 'folder'; folder: OrgDocFolder } | { type: 'doc'; doc: OrgDocument };
  folderDocsWarningCount: number | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const canManage = canManageOrgDocs(role);
  const title =
    target.type === 'folder' ? `Delete folder “${target.folder.title}”?` : `Delete document “${target.doc.title}”?`;

  if (!canManage) return null;

  return (
    <div className="fixed inset-0 z-[260]">
      <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close dialog" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-700 bg-slate-900 shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
        <div className="border-b border-slate-700 px-5 py-4">
          <div className="text-sm font-semibold text-slate-100">{title}</div>
          <div className="mt-1 text-xs text-slate-400">This action cannot be undone.</div>
        </div>

        <div className="px-5 py-5">
          {target.type === 'folder' && folderDocsWarningCount ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-100">
              This folder currently shows {folderDocsWarningCount} document(s). Deleting may fail if the server blocks
              non-empty folders.
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
            disabled={loading}
            onClick={onConfirm}
            className={cx(
              'rounded-lg px-4 py-2 text-sm font-semibold',
              loading ? 'cursor-not-allowed bg-rose-500/30 text-rose-100/70' : 'bg-rose-500 text-white hover:bg-rose-400'
            )}
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

