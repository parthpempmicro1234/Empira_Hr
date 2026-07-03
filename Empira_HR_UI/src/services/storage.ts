export type AuthUser = Record<string, unknown> & {
  id?: string | number;
  work_email?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
};

export type AuthTokens = {
  access: string;
  refresh: string;
};

export type AuthSession = AuthTokens & {
  user?: AuthUser;
};

const ACCESS_KEY = 'empira.auth.access';
const REFRESH_KEY = 'empira.auth.refresh';
const USER_KEY = 'empira.auth.user';

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function getAccessToken(): string | null {
  return safeGet(ACCESS_KEY) ?? safeGet('access_token') ?? safeGet('access');
}

export function getRefreshToken(): string | null {
  return safeGet(REFRESH_KEY);
}

export function getStoredUser(): AuthUser | undefined {
  const raw = safeGet(USER_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return undefined;
  }
}

export function setSession(session: AuthSession): void {
  safeSet(ACCESS_KEY, session.access);
  safeSet(REFRESH_KEY, session.refresh);
  if (session.user) safeSet(USER_KEY, JSON.stringify(session.user));
}

export function clearSession(): void {
  safeRemove(ACCESS_KEY);
  safeRemove(REFRESH_KEY);
  safeRemove(USER_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken() && getRefreshToken());
}

