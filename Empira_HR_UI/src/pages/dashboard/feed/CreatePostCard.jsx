import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { normalizeApiError } from '../../../services/errors';
import ImageUploader from './ImageUploader';
import EmojiPicker from './EmojiPicker';
import MentionTextarea from './MentionTextarea';
import { buildStandardPayload, createOrgFeedEntry } from './feedPayload.js';
import { cx } from './feedUtils.js';

const MAX_LEN = 500;

export default function CreatePostCard({ visibility, onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [mentionIds, setMentionIds] = useState([]);
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = buildStandardPayload({
        content,
        visibilityTab: visibility,
        mentionIds,
      });
      return createOrgFeedEntry(payload, images);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social', 'feed', visibility] });
      setContent('');
      setMentionIds([]);
      setImages([]);
      setError('');
      onSuccess?.();
    },
    onError: (e) => setError(normalizeApiError(e).message),
  });

  const visibilityLabel = visibility === 'organization' ? 'Organization' : 'Department';

  return (
    <div className="mt-3 space-y-3">
      <MentionTextarea
        value={content}
        onChange={setContent}
        onMentionIdsChange={setMentionIds}
        maxLength={MAX_LEN}
        disabled={mutation.isPending}
        placeholder="Write your post here… Type @ to mention someone"
      />
      <ImageUploader files={images} onChange={setImages} disabled={mutation.isPending} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <EmojiPicker onPick={(e) => setContent((c) => `${c}${e}`)} />
          <span className="rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1 text-xs text-slate-300">
            {visibilityLabel}
          </span>
        </div>
        <div className="text-xs text-slate-400">
          {content.length}/{MAX_LEN}
        </div>
      </div>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setContent('');
            setMentionIds([]);
            setImages([]);
            onCancel?.();
          }}
          className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!content.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50"
        >
          {mutation.isPending ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  );
}
