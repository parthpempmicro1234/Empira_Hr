import { api } from './api';

/** Feed list query ?target= */
export type FeedVisibility = 'organization' | 'department';

/** Create body visibility field */
export type OrgFeedCreateVisibility = 'business_unit' | 'department';

export type OrgFeedPollOptionInput = { option_text: string };

export interface CreateOrgFeedPayload {
  post_type: 'standard' | 'poll';
  content: string;
  visibility: OrgFeedCreateVisibility;
  poll_options?: OrgFeedPollOptionInput[];
  mention_ids?: Array<number | string>;
  expiry_date?: string;
  notify_employees?: boolean;
  is_anonymous?: boolean;
}

function appendPollOptionsToFormData(fd: FormData, pollOptions: OrgFeedPollOptionInput[]) {
  pollOptions.forEach((opt, i) => {
    fd.append(`poll_options[${i}][option_text]`, opt.option_text);
  });
}

function appendPayloadToFormData(fd: FormData, payload: CreateOrgFeedPayload) {
  fd.append('post_type', payload.post_type);
  fd.append('content', payload.content);
  fd.append('visibility', payload.visibility);
  if (payload.poll_options?.length) {
    appendPollOptionsToFormData(fd, payload.poll_options);
  }
  if (payload.expiry_date) fd.append('expiry_date', payload.expiry_date);
  if (payload.notify_employees) fd.append('notify_employees', 'true');
  if (payload.is_anonymous) fd.append('is_anonymous', 'true');
  payload.mention_ids?.forEach((id, i) => fd.append(`mention_ids[${i}]`, String(id)));
}

export interface FeedAuthor {
  id: number | string;
  display_name?: string | null;
  profile_image?: string | null;
}

export interface FeedPollOption {
  id: number | string;
  label?: string;
  text?: string;
  votes_count?: number;
  vote_count?: number;
  percentage?: number;
  vote_percentage?: number;
}

export interface FeedComment {
  id: number | string;
  author?: FeedAuthor;
  content?: string;
  text?: string;
  created_at?: string;
  created?: string;
}

export interface FeedPoll {
  id?: number | string;
  question: string;
  options: FeedPollOption[];
  total_votes?: number;
  expiry_date?: string | null;
  expires_at?: string | null;
  notify_employees?: boolean;
  is_anonymous?: boolean;
  user_voted_option_id?: number | string | null;
  voted_option_id?: number | string | null;
}

export interface FeedPost {
  id: number | string;
  post_type: 'post' | 'poll' | 'praise' | string;
  author: FeedAuthor;
  content?: string | null;
  body?: string | null;
  created_at?: string;
  created?: string;
  images?: string[];
  image_urls?: string[];
  attachments?: Array<{ url?: string; file?: string }>;
  mentions?: FeedAuthor[];
  praised_employees?: FeedAuthor[];
  praise_targets?: FeedAuthor[];
  poll?: FeedPoll | null;
  likes_count?: number;
  like_count?: number;
  comments_count?: number;
  comment_count?: number;
  is_liked?: boolean;
  liked?: boolean;
  user_reaction?: string | null;
  comments?: FeedComment[];
}

export type ReactionType = 'like' | 'haha' | 'heart' | 'clap' | 'curious';

export async function getSocialFeed(target: FeedVisibility): Promise<FeedPost[]> {
  const res = await api.get<FeedPost[] | { results?: FeedPost[]; posts?: FeedPost[] }>(
    'org/feed/',
    { params: { target } }
  );
  const data = res.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.posts)) return data.posts;
  return [];
}

export async function createOrgFeedEntry(
  payload: CreateOrgFeedPayload,
  imageFiles: File[] = []
): Promise<FeedPost> {
  const files = imageFiles.filter((f) => f?.type?.startsWith('image/'));

  if (files.length > 0) {
    const fd = new FormData();
    appendPayloadToFormData(fd, payload);
    files.forEach((file) => fd.append('images', file));
    const res = await api.post<FeedPost>('org/feed/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  }

  const res = await api.post<FeedPost>('org/feed/', payload);
  return res.data;
}

export async function createSocialPraise(formData: FormData): Promise<FeedPost> {
  const res = await api.post<FeedPost>('social/praise/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export type ReactFeedResponse = {
  likes_count?: number;
  like_count?: number;
  user_reaction?: string | null;
  is_liked?: boolean;
  message?: string;
  error?: string;
};

export async function postOrgFeedReaction(
  postId: number | string,
  reactionType: ReactionType | string
): Promise<ReactFeedResponse> {
  const res = await api.post<ReactFeedResponse>(`org/feed/${postId}/react/`, {
    reaction_type: reactionType,
  });
  return res.data;
}

function extractCommentList(data: unknown): FeedComment[] {
  if (Array.isArray(data)) return data as FeedComment[];
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.results)) return o.results as FeedComment[];
    if (Array.isArray(o.comments)) return o.comments as FeedComment[];
  }
  return [];
}

export async function getOrgFeedComments(postId: number | string): Promise<FeedComment[]> {
  const res = await api.get<unknown>(`org/feed/${postId}/comments/`);
  return extractCommentList(res.data);
}

export async function postOrgFeedComment(
  postId: number | string,
  content: string
): Promise<FeedComment> {
  const res = await api.post<FeedComment>(`org/feed/${postId}/comments/`, { content });
  return res.data;
}

export type VoteFeedResponse = {
  message?: string;
  error?: string;
};

export async function voteOrgFeedPost(
  postId: number | string,
  optionId: number | string
): Promise<VoteFeedResponse> {
  const res = await api.post<VoteFeedResponse>(`org/feed/${postId}/vote/`, {
    option_id: optionId,
  });
  return res.data;
}

/** @deprecated Use voteOrgFeedPost */
export async function voteSocialPoll(
  postId: number | string,
  optionId: number | string
): Promise<VoteFeedResponse> {
  return voteOrgFeedPost(postId, optionId);
}
