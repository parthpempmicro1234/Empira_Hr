import React from 'react';

export default function ApiErrorPanel({ message = 'Unable to load data.', onRetry }) {
  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-4 py-5 text-center">
      <p className="text-sm text-red-300/90">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center rounded-md border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/15"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
