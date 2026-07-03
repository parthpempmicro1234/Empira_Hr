import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSocialPraise } from '../../../services/socialFeed';
import { normalizeApiError } from '../../../services/errors';
import MentionPicker from './MentionPicker';
import EmojiPicker from './EmojiPicker';
import { composerInputClass, cx } from './feedUtils.js';

const MAX_LEN = 500;

export default function CreatePraiseCard({ visibility, onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [targets, setTargets] = useState([]);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      if (!targets.length) throw new Error('Select at least one employee to praise.');
      const fd = new FormData();
      fd.append('content', content.trim());
      fd.append('visibility', visibility);
      targets.forEach((t, i) => fd.append(`praised_employee_ids[${i}]`, String(t.id)));
      return createSocialPraise(fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social', 'feed', visibility] });
      setContent('');
      setTargets([]);
      setError('');
      onSuccess?.();
    },
    onError: (e) => {
      if (e instanceof Error && e.message && !e.isAxiosError) {
        setError(e.message);
      } else {
        setError(normalizeApiError(e).message);
      }
    },
  });

  const visibilityLabel = visibility === 'organization' ? 'Organization' : 'Department';

  return (
    <div className="mt-3 space-y-3">
      <MentionPicker
        selected={targets}
        onChange={setTargets}
        placeholder="Mention employees to praise…"
      />
      <textarea
        rows={3}
        value={content}
        maxLength={MAX_LEN}
        placeholder="Write your appreciation message…"
        onChange={(e) => setContent(e.target.value)}
        className={cx(composerInputClass, 'resize-none')}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <EmojiPicker onPick={(e) => setContent((c) => `${c}${e}`)} />
          <span className="rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1 text-xs text-slate-300">
            {visibilityLabel}
          </span>
        </div>
        <span className="text-xs text-slate-400">{content.length}/{MAX_LEN}</span>
      </div>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-900/60">
          Cancel
        </button>
        <button
          type="button"
          disabled={!content.trim() || !targets.length || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50"
        >
          {mutation.isPending ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </div>
  );
}
