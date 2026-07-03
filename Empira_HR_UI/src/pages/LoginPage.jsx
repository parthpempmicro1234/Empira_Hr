import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import AuthShell from './auth/AuthShell.jsx';
import {
  buttonPrimaryClassName,
  cx,
  getFieldError,
  inputClassName,
  isValidEmail,
  normalizeEmailFieldErrors,
  otpInputClassName,
} from './auth/authUtils.js';
import { login, requestLoginOtp, toSession, verifyLoginOtp } from '../services/auth';
import { setSession } from '../services/storage';
import { normalizeApiError } from '../services/errors';

function completeLogin(data, remember, navigate, from) {
  setSession(toSession(data));
  try {
    window.localStorage.setItem('empira.remember', remember ? '1' : '0');
  } catch {
    // ignore
  }
  navigate(from, { replace: true });
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const from = useMemo(() => {
    const state = location.state;
    if (state && typeof state === 'object' && 'from' in state) return state.from;
    return '/';
  }, [location.state]);

  const [signInMode, setSignInMode] = useState('password');
  const [otpStep, setOtpStep] = useState('request');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [remember, setRemember] = useState(true);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [otpInfo, setOtpInfo] = useState('');

  const loginMutation = useMutation({
    mutationFn: (body) => login(body),
    onSuccess: (data) => {
      setFormError('');
      setFieldErrors({});
      completeLogin(data, remember, navigate, from);
    },
    onError: (err) => {
      const n = normalizeApiError(err);
      setFormError(n.message);
      setFieldErrors(normalizeEmailFieldErrors(n.fieldErrors || {}));
    },
  });

  const requestOtpMutation = useMutation({
    mutationFn: (body) => requestLoginOtp(body),
    onSuccess: () => {
      setFormError('');
      setFieldErrors({});
      setOtpInfo('A 6-digit code was sent to your email. Enter it below to sign in.');
      setOtpStep('verify');
    },
    onError: (err) => {
      const n = normalizeApiError(err);
      setFormError(n.message);
      setFieldErrors(normalizeEmailFieldErrors(n.fieldErrors || {}));
      setOtpInfo('');
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (body) => verifyLoginOtp(body),
    onSuccess: (data) => {
      setFormError('');
      setFieldErrors({});
      setOtpInfo('');
      completeLogin(data, remember, navigate, from);
    },
    onError: (err) => {
      const n = normalizeApiError(err);
      setFormError(n.message);
      setFieldErrors(normalizeEmailFieldErrors(n.fieldErrors || {}));
    },
  });

  const emailError =
    getFieldError(fieldErrors, 'email') || getFieldError(fieldErrors, 'work_email');
  const passwordError = getFieldError(fieldErrors, 'password');
  const otpError = getFieldError(fieldErrors, 'otp');

  const isPending =
    loginMutation.isPending || requestOtpMutation.isPending || verifyOtpMutation.isPending;

  const switchMode = (mode) => {
    setSignInMode(mode);
    setOtpStep('request');
    setFormError('');
    setFieldErrors({});
    setOtpInfo('');
    setOtp('');
  };

  const validateEmail = () => {
    const trimmed = String(email || '').trim();
    if (!trimmed) {
      setFieldErrors({ email: ['Email is required.'] });
      return null;
    }
    if (!isValidEmail(trimmed)) {
      setFieldErrors({ email: ['Enter a valid email address.'] });
      return null;
    }
    return trimmed;
  };

  const onPasswordSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    const work_email = validateEmail();
    if (!work_email) return;

    const pw = String(password || '');
    const nextFieldErrors = {};
    if (!pw) nextFieldErrors.password = ['Password is required.'];
    else if (pw.length < 6) nextFieldErrors.password = ['Password must be at least 6 characters.'];

    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    loginMutation.mutate({ work_email, password: pw });
  };

  const onRequestOtp = (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});
    setOtpInfo('');

    const trimmed = validateEmail();
    if (!trimmed) return;

    requestOtpMutation.mutate({ email: trimmed });
  };

  const onVerifyOtp = (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    const trimmed = validateEmail();
    if (!trimmed) return;

    const code = String(otp || '').trim();
    if (!/^\d{6}$/.test(code)) {
      setFieldErrors({ otp: ['Enter the 6-digit code from your email.'] });
      return;
    }

    verifyOtpMutation.mutate({ email: trimmed, otp: code });
  };

  const title = signInMode === 'password' ? 'Welcome Back' : otpStep === 'request' ? 'Sign in with OTP' : 'Enter verification code';

  const subtitle =
    signInMode === 'password'
      ? 'Sign in to continue to your workspace.'
      : otpStep === 'request'
        ? 'We will email you a one-time sign-in code.'
        : `Enter the code sent to ${email || 'your email'}.`;

  return (
    <AuthShell
      title={title}
      subtitle={subtitle}
      footer={
        <>
          By signing in, you agree to our{' '}
          <a className="underline underline-offset-4 hover:text-foreground" href="#">
            Terms
          </a>{' '}
          and{' '}
          <a className="underline underline-offset-4 hover:text-foreground" href="#">
            Privacy Policy
          </a>
          .
        </>
      }
    >
      <div className="mb-4 flex rounded-xl border border-input/50 bg-background/40 p-1">
        <button
          type="button"
          onClick={() => switchMode('password')}
          className={cx(
            'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition',
            signInMode === 'password'
              ? 'bg-accent text-accent-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => switchMode('otp')}
          className={cx(
            'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition',
            signInMode === 'otp'
              ? 'bg-accent text-accent-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          OTP
        </button>
      </div>

      {formError ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          {formError}
        </div>
      ) : null}

      {otpInfo ? (
        <div
          role="status"
          className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100"
        >
          {otpInfo}
        </div>
      ) : null}

      {signInMode === 'password' ? (
        <form onSubmit={onPasswordSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className={inputClassName}
              aria-invalid={Boolean(emailError) || undefined}
            />
            <div className="min-h-[18px] text-xs text-red-200">{emailError}</div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClassName}
              aria-invalid={Boolean(passwordError) || undefined}
            />
            <div className="min-h-[18px] text-xs text-red-200">{passwordError}</div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-input bg-background accent-accent"
              />
              Remember me
            </label>
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Forgot Password?
            </Link>
          </div>

          <button type="submit" disabled={isPending} className={buttonPrimaryClassName}>
            {loginMutation.isPending ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      ) : null}

      {signInMode === 'otp' && otpStep === 'request' ? (
        <form onSubmit={onRequestOtp} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="otp-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="otp-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className={inputClassName}
              aria-invalid={Boolean(emailError) || undefined}
            />
            <div className="min-h-[18px] text-xs text-red-200">{emailError}</div>
          </div>

          <button type="submit" disabled={isPending} className={buttonPrimaryClassName}>
            {requestOtpMutation.isPending ? 'Sending code…' : 'Send OTP'}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            <Link to="/forgot-password" className="font-medium hover:text-foreground">
              Forgot Password?
            </Link>
          </p>
        </form>
      ) : null}

      {signInMode === 'otp' && otpStep === 'verify' ? (
        <form onSubmit={onVerifyOtp} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="login-otp" className="text-sm font-medium">
              Verification code
            </label>
            <input
              id="login-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className={otpInputClassName}
              aria-invalid={Boolean(otpError) || undefined}
            />
            <div className="min-h-[18px] text-xs text-red-200">{otpError}</div>
          </div>

          <button type="submit" disabled={isPending} className={buttonPrimaryClassName}>
            {verifyOtpMutation.isPending ? 'Verifying…' : 'Verify & Sign In'}
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              const trimmed = validateEmail();
              if (trimmed) requestOtpMutation.mutate({ email: trimmed });
            }}
            className="w-full text-center text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Resend code
          </button>
          <button
            type="button"
            onClick={() => {
              setOtpStep('request');
              setOtp('');
              setOtpInfo('');
              setFormError('');
              setFieldErrors({});
            }}
            className="w-full text-center text-sm text-muted-foreground transition hover:text-foreground"
          >
            Change email
          </button>
        </form>
      ) : null}
    </AuthShell>
  );
}
