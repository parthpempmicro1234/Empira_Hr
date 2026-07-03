import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
import { forgotPassword, resetPassword } from '../services/auth';
import { normalizeApiError } from '../services/errors';

const STEPS = {
  email: 'email',
  otp: 'otp',
  reset: 'reset',
};

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get('token')?.trim() || '';

  const [step, setStep] = useState(urlToken ? STEPS.reset : STEPS.email);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const forgotMutation = useMutation({
    mutationFn: (body) => forgotPassword(body),
    onSuccess: () => {
      setFormError('');
      setFieldErrors({});
      setSuccessMessage('We sent a 6-digit code to your email. Enter it below to reset your password.');
      setStep(STEPS.otp);
    },
    onError: (err) => {
      const n = normalizeApiError(err);
      setFormError(n.message);
      setFieldErrors(normalizeEmailFieldErrors(n.fieldErrors || {}));
      setSuccessMessage('');
    },
  });

  const resetMutation = useMutation({
    mutationFn: (body) => resetPassword(body),
    onSuccess: () => {
      setFormError('');
      setFieldErrors({});
      setSuccessMessage('Password updated. You can sign in with your new password.');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    },
    onError: (err) => {
      const n = normalizeApiError(err);
      setFormError(n.message);
      setFieldErrors(normalizeEmailFieldErrors(n.fieldErrors || {}));
    },
  });

  const emailError = getFieldError(fieldErrors, 'email');
  const otpError = getFieldError(fieldErrors, 'otp');
  const passwordError =
    getFieldError(fieldErrors, 'new_password') || getFieldError(fieldErrors, 'password');

  const stepTitle = useMemo(() => {
    if (step === STEPS.email) return 'Forgot password';
    if (step === STEPS.otp) return 'Verify code';
    return 'Reset password';
  }, [step]);

  const stepSubtitle = useMemo(() => {
    if (step === STEPS.email) {
      return 'Enter your work email and we will send a recovery code.';
    }
    if (step === STEPS.otp) {
      return `Enter the 6-digit code sent to ${email || 'your email'}.`;
    }
    if (urlToken) {
      return 'Choose a new password for your account.';
    }
    return 'Enter your new password to complete recovery.';
  }, [step, email, urlToken]);

  const onSendCode = (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});
    setSuccessMessage('');

    const trimmed = String(email || '').trim();
    if (!trimmed) {
      setFieldErrors({ email: ['Email is required.'] });
      return;
    }
    if (!isValidEmail(trimmed)) {
      setFieldErrors({ email: ['Enter a valid email address.'] });
      return;
    }

    forgotMutation.mutate({ email: trimmed });
  };

  const onVerifyOtpContinue = (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});
    setSuccessMessage('');

    const code = String(otp || '').trim();
    if (!/^\d{6}$/.test(code)) {
      setFieldErrors({ otp: ['Enter the 6-digit code from your email.'] });
      return;
    }

    setStep(STEPS.reset);
  };

  const onResetPassword = (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});
    setSuccessMessage('');

    const pw = String(newPassword || '');
    const confirm = String(confirmPassword || '');

    const nextErrors = {};
    if (!pw) nextErrors.new_password = ['New password is required.'];
    else if (pw.length < 6) nextErrors.new_password = ['Password must be at least 6 characters.'];
    if (pw !== confirm) nextErrors.confirm_password = ['Passwords do not match.'];

    if (urlToken) {
      if (Object.keys(nextErrors).length) {
        setFieldErrors(nextErrors);
        return;
      }
      resetMutation.mutate({ token: urlToken, new_password: pw });
      return;
    }

    const trimmedEmail = String(email || '').trim();
    const code = String(otp || '').trim();
    if (!trimmedEmail) nextErrors.email = ['Email is required.'];
    if (!/^\d{6}$/.test(code)) nextErrors.otp = ['Enter the 6-digit code from your email.'];
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    resetMutation.mutate({
      email: trimmedEmail,
      otp: code,
      new_password: pw,
    });
  };

  return (
    <AuthShell
      title={stepTitle}
      subtitle={stepSubtitle}
      footer={
        <>
          <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {successMessage && !formError ? (
        <div
          role="status"
          className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100"
        >
          {successMessage}
        </div>
      ) : null}

      {formError ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          {formError}
        </div>
      ) : null}

      {step === STEPS.email ? (
        <form onSubmit={onSendCode} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="forgot-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="forgot-email"
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
          <button type="submit" disabled={forgotMutation.isPending} className={buttonPrimaryClassName}>
            {forgotMutation.isPending ? 'Sending code…' : 'Send recovery code'}
          </button>
        </form>
      ) : null}

      {step === STEPS.otp && !urlToken ? (
        <form onSubmit={onVerifyOtpContinue} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="forgot-otp" className="text-sm font-medium">
              Verification code
            </label>
            <input
              id="forgot-otp"
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
          <button type="submit" className={buttonPrimaryClassName}>
            Continue
          </button>
          <button
            type="button"
            disabled={forgotMutation.isPending}
            onClick={() => {
              const trimmed = String(email || '').trim();
              if (!isValidEmail(trimmed)) {
                setStep(STEPS.email);
                return;
              }
              forgotMutation.mutate({ email: trimmed });
            }}
            className="w-full text-center text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Resend code
          </button>
          <button
            type="button"
            onClick={() => setStep(STEPS.email)}
            className="w-full text-center text-sm text-muted-foreground transition hover:text-foreground"
          >
            Change email
          </button>
        </form>
      ) : null}

      {step === STEPS.reset ? (
        <form onSubmit={onResetPassword} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="new-password" className="text-sm font-medium">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClassName}
              aria-invalid={Boolean(passwordError) || undefined}
            />
            <div className="min-h-[18px] text-xs text-red-200">{passwordError}</div>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-medium">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClassName}
            />
            <div className="min-h-[18px] text-xs text-red-200">
              {getFieldError(fieldErrors, 'confirm_password')}
            </div>
          </div>

          <button type="submit" disabled={resetMutation.isPending} className={buttonPrimaryClassName}>
            {resetMutation.isPending ? 'Updating…' : 'Reset password'}
          </button>

          {!urlToken ? (
            <button
              type="button"
              onClick={() => setStep(STEPS.otp)}
              className="w-full text-center text-sm text-muted-foreground transition hover:text-foreground"
            >
              Back to verification
            </button>
          ) : null}
        </form>
      ) : null}
    </AuthShell>
  );
}
