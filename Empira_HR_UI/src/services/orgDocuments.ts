import { api } from './api';

export type OrgDocFolder = {
  id: number;
  title: string;
  business_unit: number | string | null;
  created_at?: string | null;
};

export type OrgDocument = {
  id: number;
  folder: number;
  title: string;
  file_url: string;
  description: string | null;
  expiry_date: string | null;
  size_display?: string | null;
  size?: number | null;
  last_updated?: string | null;
};

export type CreateFolderPayload = {
  title: string;
  business_unit?: number | string | null;
};

export type PatchFolderPayload = Partial<CreateFolderPayload>;

export type CreateDocumentPayload = {
  folder: number;
  title: string;
  description?: string;
  expiry_date?: string;
  file: File;
};

export type PatchDocumentMetadataPayload = {
  folder?: number;
  title?: string;
  description?: string | null;
  expiry_date?: string | null;
};

export async function getDocFolders(): Promise<OrgDocFolder[]> {
  const res = await api.get<OrgDocFolder[]>('documents/folders/');
  return res.data ?? [];
}

export async function createDocFolder(payload: CreateFolderPayload): Promise<OrgDocFolder> {
  const res = await api.post<OrgDocFolder>('documents/folders/', payload);
  return res.data;
}

export async function patchDocFolder(id: number, payload: PatchFolderPayload): Promise<OrgDocFolder> {
  const res = await api.patch<OrgDocFolder>(`documents/folders/${id}/`, payload);
  return res.data;
}

export async function deleteDocFolder(id: number): Promise<void> {
  await api.delete(`documents/folders/${id}/`);
}

export async function getDocuments(folderId: number): Promise<OrgDocument[]> {
  const res = await api.get<OrgDocument[]>('documents/documents/', { params: { folder: folderId } });
  return res.data ?? [];
}

export async function createDocument(payload: CreateDocumentPayload): Promise<OrgDocument> {
  const fd = new FormData();
  fd.append('folder', String(payload.folder));
  fd.append('title', payload.title);
  if (payload.description) fd.append('description', payload.description);
  if (payload.expiry_date) fd.append('expiry_date', payload.expiry_date);
  fd.append('file', payload.file);

  const res = await api.post<OrgDocument>('documents/documents/', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function patchDocumentMetadata(id: number, payload: PatchDocumentMetadataPayload): Promise<OrgDocument> {
  const res = await api.patch<OrgDocument>(`documents/documents/${id}/`, payload);
  return res.data;
}

export async function patchDocumentMultipart(
  id: number,
  payload: PatchDocumentMetadataPayload & { file?: File | null }
): Promise<OrgDocument> {
  const fd = new FormData();
  if (payload.folder != null) fd.append('folder', String(payload.folder));
  if (payload.title != null) fd.append('title', payload.title);
  if (payload.description != null) fd.append('description', payload.description);
  if (payload.expiry_date != null) fd.append('expiry_date', payload.expiry_date);
  if (payload.file) fd.append('file', payload.file);

  const res = await api.patch<OrgDocument>(`documents/documents/${id}/`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function deleteDocument(id: number): Promise<void> {
  await api.delete(`documents/documents/${id}/`);
}

