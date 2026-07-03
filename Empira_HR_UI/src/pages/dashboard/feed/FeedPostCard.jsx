import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { postOrgFeedReaction } from '../../../services/socialFeed';
import { normalizeApiError } from '../../../services/errors';
import PollCard from './PollCard';
import CommentSection from './CommentSection';
import ReactionPicker from './ReactionPicker';
import { parseUserReaction } from './reactions.js';
import { cx } from './feedUtils.js';

const TYPE_LABELS = {
  post: 'Post',
  poll: 'Poll',
  praise: 'Praise',
};

function PostAvatar({ author }) {
  if (author.profileImage) {
    return (
      <img
        src={author.profileImage}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-slate-700"
      />
    );
  }
  return (
    <div
      className={cx(
        'grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-semibold text-white ring-1 ring-slate-700',
        author.avatarClass
      )}
    >
      {author.initials}
    </div>
  );
}

function ExpandableText({ text }) {
  const [expanded, setExpanded] = useState(false);
  const limit = 220;
  if (!text) return null;
  const long = text.length > limit;
  const shown = expanded || !long ? text : `${text.slice(0, limit)}…`;

  return (
    <div className="text-sm text-slate-200">
      <p className="whitespace-pre-wrap">{shown}</p>
      {long ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-semibold text-accent hover:underline"
        >
          {expanded ? 'Show less' : 'See more'}
        </button>
      ) : null}
    </div>
  );
}

export default function FeedPostCard({ post, visibility, onOpenProfile, highlighted = false }) {
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [reactionOverride, setReactionOverride] = useState(undefined);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [reactionError, setReactionError] = useState('');

  const userReaction =
    reactionOverride !== undefined ? reactionOverride : post.userReaction;

  useEffect(() => {
    setReactionOverride(undefined);
    setLikesCount(post.likesCount);
    setCommentsCount(post.commentsCount);
  }, [post.id, post.userReaction, post.likesCount, post.commentsCount]);

  const reactionMutation = useMutation({
    mutationFn: (reactionType) => postOrgFeedReaction(post.id, reactionType),
    onMutate: (reactionType) => {
      setReactionError('');
      const prev = userReaction;
      const removing = prev === reactionType;
      const next = removing ? null : reactionType;
      setReactionOverride(next);
      if (!prev && next) setLikesCount((c) => c + 1);
      else if (prev && removing) setLikesCount((c) => Math.max(0, c - 1));
    },
    onSuccess: (data) => {
      if (data?.error) {
        setReactionError(data.error);
        setReactionOverride(undefined);
        setLikesCount(post.likesCount);
        return;
      }
      if (data?.likes_count != null || data?.like_count != null) {
        setLikesCount(Number(data.likes_count ?? data.like_count));
      }
      const next = parseUserReaction(data) ?? (data?.user_reaction === null ? null : userReaction);
      if (data?.user_reaction !== undefined) {
        setReactionOverride(data.user_reaction ? String(data.user_reaction).toLowerCase() : null);
      }
      queryClient.invalidateQueries({ queryKey: ['social', 'feed', visibility] });
    },
    onError: (e) => {
      setReactionOverride(undefined);
      setLikesCount(post.likesCount);
      setReactionError(normalizeApiError(e).message);
    },
  });

  const typeLabel = TYPE_LABELS[post.postType] || 'Post';

  return (
    <article
      id={`feed-post-${post.id}`}
      className={cx(
        'rounded-lg border border-slate-700 bg-slate-800 p-4 transition-shadow',
        highlighted && 'ring-2 ring-violet-400/70 ring-offset-2 ring-offset-slate-900'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          <button type="button" onClick={() => onOpenProfile?.(post.author.id)} className="shrink-0">
            <PostAvatar author={post.author} />
          </button>
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onOpenProfile?.(post.author.id)}
              className="truncate text-sm font-semibold text-slate-50 hover:underline"
            >
              {post.author.displayName}
            </button>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>{post.timeLabel}</span>
              <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                {typeLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3">
        {post.postType === 'poll' && post.poll ? (
          <PollCard post={post} poll={post.poll} visibility={visibility} />
        ) : (
          <>
            {post.postType === 'praise' && post.praiseTargets?.length > 0 ? (
              <p className="mb-2 text-xs text-slate-400">
                Praising{' '}
                <span className="font-semibold text-slate-200">
                  {post.praiseTargets.map((p) => p.displayName).join(', ')}
                </span>
              </p>
            ) : null}
            <ExpandableText text={post.content} />
          </>
        )}

        {post.images?.length > 0 ? (
          <div
            className={cx(
              'mt-3 grid gap-2',
              post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'
            )}
          >
            {post.images.map((img, i) => (
              <a
                key={img.id ?? i}
                href={img.url}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-lg ring-1 ring-slate-700 transition hover:ring-slate-500"
              >
                <img
                  src={img.url}
                  alt={post.content ? `Attachment for ${post.author.displayName}` : 'Post image'}
                  className="max-h-56 w-full object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-700/80 pt-3">
        <ReactionPicker
          userReaction={userReaction}
          likesCount={likesCount}
          disabled={reactionMutation.isPending}
          onReact={(type) => reactionMutation.mutate(type)}
        />
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className={cx(
            'inline-flex items-center gap-1.5 text-xs font-semibold transition-colors',
            showComments ? 'text-slate-200' : 'text-slate-400 hover:text-slate-200'
          )}
          aria-expanded={showComments}
        >
          <MessageCircle className="h-4 w-4" />
          <span>{commentsCount}</span>
        </button>
      </div>
      {reactionError ? <p className="mt-1 text-xs text-amber-300">{reactionError}</p> : null}

      <CommentSection
        postId={post.id}
        visibility={visibility}
        open={showComments}
        commentsCount={commentsCount}
        onCommentsCountChange={setCommentsCount}
      />
    </article>
  );
}
