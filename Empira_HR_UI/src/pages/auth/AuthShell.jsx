import React from 'react';
import { cx } from './authUtils.js';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        aria-hidden="true"
        className={cx(
          'pointer-events-none fixed inset-0 -z-10',
          'bg-[radial-gradient(900px_circle_at_20%_10%,hsl(var(--accent-soft)),transparent_55%),radial-gradient(700px_circle_at_80%_20%,hsl(var(--accent-soft)),transparent_60%)]'
        )}
      />

      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-10">
        <div className="w-full">
          <div className="rounded-2xl border border-border/60 bg-card/70 p-7 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft ring-1 ring-accent/25">
                <div className="h-5 w-5 rounded-md bg-accent" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-medium text-muted-foreground">EMPIRA</div>
                <div className="text-base font-semibold tracking-tight">HR Suite</div>
              </div>
            </div>

            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>

            {children}
          </div>

          {footer ? (
            <p className="mt-6 text-center text-xs text-muted-foreground">{footer}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
