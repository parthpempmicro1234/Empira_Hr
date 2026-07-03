import React from 'react';

export default function JobTabApiError({ message, onRetry }) {
  return (
    <div className="rounded-lg border border-red-500/25 bg-red-950/20 p-4 sm:p-5">
      <div className="text-sm font-semibold text-red-200">Unable to load job profile</div>
      <p className="mt-1 text-sm text-red-200/80">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md border border-red-400/40 bg-red-950/30 px-3 py-1.5 text-xs font-semibold text-red-100 transition hover:bg-red-950/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
