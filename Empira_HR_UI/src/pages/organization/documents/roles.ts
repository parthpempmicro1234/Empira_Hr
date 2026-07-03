import { getStoredUser } from '../../../services/storage';

export type AppRole = 'admin' | 'hr' | 'employee';

export function getCurrentRole(): AppRole {
  const user = getStoredUser() as any;
  const role = String(user?.role ?? '').toLowerCase();
  if (role === 'admin' || role === 'hr' || role === 'employee') return role;
  return 'employee';
}

export function canManageOrgDocs(role: AppRole): boolean {
  return role === 'admin' || role === 'hr';
}

