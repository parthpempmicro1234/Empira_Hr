import { api } from './api';
import type { AuthSession, AuthUser } from './storage';

export type LoginRequest = {
  work_email: string;
  password: string;
};

export type LoginResponse = {
  access: string;
  refresh: string;
  user: AuthUser;
};

export type EmailPayload = {
  email: string;
};

export type VerifyOtpPayload = EmailPayload & {
  otp: string;
};

export type ResetPasswordOtpPayload = EmailPayload & {
  otp: string;
  new_password: string;
};

export type ResetPasswordTokenPayload = {
  token: string;
  new_password: string;
};

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login/', body);
  return res.data;
}

export async function requestLoginOtp(body: EmailPayload): Promise<unknown> {
  const res = await api.post('/auth/login/request-otp/', body);
  return res.data;
}

export async function verifyLoginOtp(body: VerifyOtpPayload): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login/verify-otp/', body);
  return res.data;
}

export async function forgotPassword(body: EmailPayload): Promise<unknown> {
  const res = await api.post('/auth/password/forgot/', body);
  return res.data;
}

export async function resetPassword(
  body: ResetPasswordOtpPayload | ResetPasswordTokenPayload
): Promise<unknown> {
  const res = await api.post('/auth/password/reset/', body);
  return res.data;
}

export async function refresh(body: { refresh: string }): Promise<{ access: string }> {
  const res = await api.post<{ access: string }>('/auth/refresh/', body);
  return res.data;
}

export function toSession(r: LoginResponse): AuthSession {
  return { access: r.access, refresh: r.refresh, user: r.user };
}
