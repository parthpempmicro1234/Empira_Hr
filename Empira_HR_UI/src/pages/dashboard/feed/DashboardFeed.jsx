import React, { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSocialFeed } from '../../../services/socialFeed';
import FeedPostCard from './FeedPostCard';
import EmptyState from './EmptyState';
import { FeedListSkeleton } from './LoadingSkeleton';
import { normalizeFeedPost } from './feedUtils.js';

export default function DashboardFeed({ visibility, onOpenProfile, highlightPostId }) {
  const feedQuery = useQuery({
    queryKey: ['social', 'feed', visibility],
    queryFn: () => getSocialFeed(visibility),
    staleTime: 30_000,
  });

  const posts = useMemo(() => {
    const raw = feedQuery.data ?? [];
    return raw.map(normalizeFeedPost);
  }, [feedQuery.data]);

  if (feedQuery.isLoading) {
    return <FeedListSkeleton count={3} />;
  }

  if (feedQuery.isError) {
    return (
      <EmptyState
        title="Unable to load feed"
        description="Please try again in a moment."
      />
    );
  }

  if (!posts.length) {
    return (
      <EmptyState
        title="No posts available"
        description={
          visibility === 'organization'
            ? 'Organization posts will appear here.'
            : 'Department posts will appear here.'
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <FeedPostCard
          key={post.id}
          post={post}
          visibility={visibility}
          onOpenProfile={onOpenProfile}
          highlighted={String(post.id) === String(highlightPostId)}
        />
      ))}
    </div>
  );
}
