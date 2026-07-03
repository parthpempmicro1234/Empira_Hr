import React, { useState } from 'react';
import CreatePostCard from './CreatePostCard';
import CreatePollCard from './CreatePollCard';
import CreatePraiseCard from './CreatePraiseCard';
import { cx } from './feedUtils.js';

const MODES = [
  { key: 'post', label: 'Post' },
  { key: 'poll', label: 'Poll' },
  { key: 'praise', label: 'Praise' },
];

export default function PostComposer({ visibility }) {
  const [mode, setMode] = useState('post');
  const [expanded, setExpanded] = useState(false);

  const hint =
    mode === 'poll'
      ? 'Create a poll for your team.'
      : mode === 'praise'
        ? 'Recognize colleagues with praise.'
        : 'Share updates, announcements, or praise.';

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => {
                setMode(m.key);
                setExpanded(true);
              }}
              className={cx(
                'rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
                mode === m.key
                  ? 'bg-slate-900 text-slate-100'
                  : 'text-slate-300 hover:bg-slate-900/60 hover:text-slate-100'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        {!expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground hover:brightness-110"
          >
            Publish
          </button>
        ) : null}
      </div>

      {!expanded ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={cx(
              'w-full rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-left text-sm text-slate-400',
              'hover:border-slate-600 hover:text-slate-300'
            )}
          >
            {mode === 'post' ? 'Write your post here…' : mode === 'poll' ? 'Ask a poll question…' : 'Praise a colleague…'}
          </button>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <div>{hint}</div>
          </div>
        </div>
      ) : mode === 'post' ? (
        <CreatePostCard
          visibility={visibility}
          onSuccess={() => setExpanded(false)}
          onCancel={() => setExpanded(false)}
        />
      ) : mode === 'poll' ? (
        <CreatePollCard
          visibility={visibility}
          onSuccess={() => setExpanded(false)}
          onCancel={() => setExpanded(false)}
        />
      ) : (
        <CreatePraiseCard
          visibility={visibility}
          onSuccess={() => setExpanded(false)}
          onCancel={() => setExpanded(false)}
        />
      )}
    </div>
  );
}
