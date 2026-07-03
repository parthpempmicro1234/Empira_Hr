import { api } from './api';

const API_ORIGIN = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://127.0.0.1:8000/').replace(
  /\/+$/,
  ''
);

function resolveProfileImageUrl(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw !== 'string') return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/')) return `${API_ORIGIN}${raw}`;
  return `${API_ORIGIN}/${raw}`;
}

export type SortProfileHit = {
  id: string;
  display_name: string;
  job_title_primary?: string | null;
  profile_image?: string | null;
};

type Loose = Record<string, unknown>;

function normalizeHit(raw: Loose): SortProfileHit | null {
  const id = raw.id;
  if (id === undefined || id === null) return null;
  const img = raw.profile_image ?? raw.profileImage;
  return {
    id: String(id),
    display_name: String(raw.display_name ?? raw.displayName ?? ''),
    job_title_primary: (raw.job_title_primary ?? raw.jobTitlePrimary) as string | null | undefined,
    profile_image: resolveProfileImageUrl(img),
  };
}

function extractList(data: unknown): SortProfileHit[] {
  if (Array.isArray(data)) {
    return data.map((x) => normalizeHit(x as Loose)).filter(Boolean) as SortProfileHit[];
  }
  if (data && typeof data === 'object') {
    const o = data as Loose;
    if (Array.isArray(o.results)) {
      return o.results.map((x) => normalizeHit(x as Loose)).filter(Boolean) as SortProfileHit[];
    }
    if (Array.isArray(o.data)) {
      return o.data.map((x) => normalizeHit(x as Loose)).filter(Boolean) as SortProfileHit[];
    }
  }
  return [];
}

export async function searchEmployeeSortProfile(query: string): Promise<SortProfileHit[]> {
  const q = query.trim();
  if (!q) return [];
  const res = await api.get<unknown>('/accounts/employee/sortprofile/', {
    params: { search: q },
  });
  return extractList(res.data);
}
