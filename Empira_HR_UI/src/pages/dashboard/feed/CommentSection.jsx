import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getOrgFeedComments, postOrgFeedComment } from '../../../services/socialFeed';
import { normalizeApiError } from '../../../services/errors';
import { composerInputClass, cx, normalizeComment } from './feedUtils.js';
function CommentAvatar({ author }) {
  if (author.profileImage) {
    return (
      <img
        src={author.profileImage}
        alt=""
        className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-slate-700"
      />
    );
  }
  return (
    <div
      className={cx(
        'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white ring-1 ring-slate-700',
        author.avatarClass
      )}
    >
      {author.initials}
    </div>
  );
}

function CommentListSkeleton() {
  return (
    <ul className="mb-3 space-y-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <li key={i} className="flex gap-2 animate-pulse">
          <div className="h-7 w-7 rounded-full bg-slate-700/50" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 rounded bg-slate-700/40" />
            <div className="h-3 w-full rounded bg-slate-700/30" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function CommentSection({
  postId,
  visibility,
  open,
  commentsCount,
  onCommentsCountChange,
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const commentsQuery = useQuery({
    queryKey: ['social', 'feed', postId, 'comments'],
    queryFn: () => getOrgFeedComments(postId),
    enabled: open,
    staleTime: 15_000,
  });

  const comments = (commentsQuery.data ?? []).map(normalizeComment).filter(Boolean);

  const postMutation = useMutation({
    mutationFn: () => postOrgFeedComment(postId, text.trim()),
    onSuccess: (raw) => {
      setText('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['social', 'feed', postId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['social', 'feed', visibility] });
      const next = (commentsCount ?? 0) + 1;
      onCommentsCountChange?.(next);
    },
    onError: (e) => setError(normalizeApiError(e).message),
  });

  if (!open) return null;

  return (
    <div className="mt-3 border-t border-slate-700/80 pt-3">
      {commentsQuery.isLoading ? (
        <CommentListSkeleton />
      ) : commentsQuery.isError ? (
        <div className="mb-3 rounded-lg border border-dashed border-slate-700 px-3 py-4 text-center">
          <p className="text-xs text-slate-400">Could not load comments.</p>
          <button
            type="button"
            onClick={() => commentsQuery.refetch()}
            className="mt-1 text-xs font-semibold text-accent hover:underline"
          >
            Retry
          </button>
        </div>
      ) : comments.length === 0 ? (
        <p className="mb-2 text-xs text-slate-500">No comments yet. Start the conversation.</p>
      ) : (
        <ul className="mb-3 max-h-48 space-y-2 overflow-y-auto pr-1">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-2">
              <CommentAvatar author={c.author} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-xs font-semibold text-slate-200">{c.author.displayName}</span>
                  <span className="text-[10px] text-slate-500">{c.timeLabel}</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-300">{c.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          placeholder="Write a comment…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && text.trim() && !postMutation.isPending) {
              e.preventDefault();
              postMutation.mutate();
            }
          }}
          className={cx(composerInputClass, 'py-1.5 text-xs')}
          aria-label="Comment text"
        />
        <button
          type="button"
          disabled={!text.trim() || postMutation.isPending}
          onClick={() => postMutation.mutate()}
          className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-950 disabled:opacity-50"
        >
          {postMutation.isPending ? '…' : 'Reply'}
        </button>
      </div>
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
