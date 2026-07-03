import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { voteOrgFeedPost } from '../../../services/socialFeed';
import { normalizeApiError } from '../../../services/errors';
import PollOption from './PollOption';
import { cx, findVotedPollOptionId } from './feedUtils.js';

export default function PollCard({ post, poll, visibility, onVoteSuccess }) {
  const queryClient = useQueryClient();
  const [localPoll, setLocalPoll] = useState(poll);
  const [voteError, setVoteError] = useState('');
  const [voteSuccess, setVoteSuccess] = useState('');

  useEffect(() => {
    setLocalPoll(poll);
    setVoteError('');
    setVoteSuccess('');
  }, [poll]);

  const votedId = localPoll?.userVotedOptionId ?? findVotedPollOptionId(localPoll?.options);
  const hasVoted = votedId != null && votedId !== '';

  const totalVotes = useMemo(() => {
    const opts = localPoll?.options ?? [];
    const sum = opts.reduce((s, o) => s + (o.votesCount || 0), 0);
    return sum;
  }, [localPoll]);

  const mutation = useMutation({
    mutationFn: (optionId) => voteOrgFeedPost(post.id, optionId),
    onSuccess: (data) => {
      if (data?.error) {
        setVoteError(data.error);
        setVoteSuccess('');
        return;
      }
      setVoteError('');
      setVoteSuccess(data?.message || 'Vote recorded successfully.');
      queryClient.invalidateQueries({ queryKey: ['social', 'feed', visibility] });
      onVoteSuccess?.();
    },
    onError: (e) => {
      setVoteSuccess('');
      setVoteError(normalizeApiError(e).message);
    },
  });

  if (!localPoll) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-100">{localPoll.question}</p>
      <div className="space-y-1.5">
        {localPoll.options.map((opt) => (
          <PollOption
            key={opt.id}
            label={opt.label}
            percentage={opt.percentage}
            votesCount={opt.votesCount}
            voters={opt.voters}
            selected={String(votedId) === String(opt.id) || opt.hasVoted}
            disabled={hasVoted}
            voting={mutation.isPending}
            onVote={() => {
              if (hasVoted) return;
              mutation.mutate(opt.id);
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-400">
          {totalVotes} total vote{totalVotes === 1 ? '' : 's'}
        </p>
        {hasVoted ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-accent/90">
            You voted
          </span>
        ) : null}
      </div>
      {voteSuccess ? (
        <p className={cx('rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300')}>
          {voteSuccess}
        </p>
      ) : null}
      {voteError ? (
        <p className={cx('rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200')}>
          {voteError}
        </p>
      ) : null}
    </div>
  );
}
