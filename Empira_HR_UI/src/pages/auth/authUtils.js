export function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function isValidEmail(value) {
  const v = String(value || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function normalizeEmailFieldErrors(fieldErrors) {
  if (!fieldErrors || typeof fieldErrors !== 'object') return {};
  const out = { ...fieldErrors };
  if (out.work_email && !out.email) {
    out.email = out.work_email;
  }
  return out;
}

export function getFieldError(fieldErrors, key) {
  const errs = fieldErrors?.[key];
  return Array.isArray(errs) ? errs[0] : '';
}

export const inputClassName = cx(
  'h-11 w-full rounded-xl border border-input/70 bg-background/50 px-3 text-sm outline-none',
  'placeholder:text-muted-foreground/70',
  'shadow-sm shadow-black/5',
  'focus:border-accent/70 focus:ring-2 focus:ring-accent/35 focus:ring-offset-0'
);

export const otpInputClassName = cx(
  inputClassName,
  'text-center text-lg font-semibold tracking-[0.35em] tabular-nums'
);

export const buttonPrimaryClassName = cx(
  'mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl',
  'bg-accent text-accent-foreground',
  'font-semibold tracking-tight',
  'shadow-[0_10px_30px_-15px_rgba(0,0,0,0.7)]',
  'transition',
  'hover:brightness-110 active:brightness-95',
  'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-0',
  'disabled:cursor-not-allowed disabled:opacity-60'
);
