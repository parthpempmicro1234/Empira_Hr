const API_ORIGIN = ((import.meta.env.VITE_API_URL) ?? 'http://127.0.0.1:8000/').replace(/\/+$/, '');

const AVATAR_COLORS = [
  'bg-[#3b6ea8]',
  'bg-[#e07a3a]',
  'bg-[#2a9d8f]',
  'bg-[#52b788]',
  'bg-[#5b8def]',
  'bg-[#9b6bb8]',
  'bg-[#4a7ab5]',
];

export function resolveProfileImageUrl(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw !== 'string') return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/')) return `${API_ORIGIN}${raw}`;
  return `${API_ORIGIN}/${raw}`;
}

export function getInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (a + b).toUpperCase() || '?';
}

export function avatarColorClass(idOrName) {
  const key = String(idOrName ?? '');
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash + key.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

/** @param {import('../../../services/myteam.api').MyTeamEmployeeRaw} raw */
export function normalizeTeamEmployee(raw) {
  if (!raw || raw.id === undefined || raw.id === null) return null;
  return {
    id: raw.id,
    displayName: String(raw.display_name ?? '').trim() || '—',
    profileImage: resolveProfileImageUrl(raw.profile_image),
    jobTitle: raw.job_title_primary?.trim() || null,
    workEmail: raw.work_email?.trim() || null,
    mobileNumber: raw.mobile_number?.trim() || null,
    personalEmail: raw.personal_email?.trim() || null,
    reportingTo: raw.reporting_to ?? null,
    initials: getInitials(raw.display_name),
    avatarClass: avatarColorClass(raw.id),
  };
}

/** @param {unknown} list */
export function normalizeTeamEmployeeList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeTeamEmployee).filter(Boolean);
}
