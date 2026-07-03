import { resolveProfileImageUrl } from '../../team/utils/teamEmployeeUtils.js';
import { parseUserReaction } from './reactions.js';

export { parseUserReaction };

export function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function formatFeedTime(iso) {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return String(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-[#3b6ea8]',
  'bg-[#e07a3a]',
  'bg-[#2a9d8f]',
  'bg-[#52b788]',
  'bg-[#5b8def]',
];

export function avatarColorClass(id) {
  const key = String(id ?? '');
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash + key.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

export function normalizeAuthor(raw) {
  if (!raw) return { id: 0, displayName: '—', profileImage: null, initials: '—', avatarClass: AVATAR_COLORS[0] };
  const id = raw.id ?? raw.author ?? 0;
  const displayName = String(
    raw.display_name ?? raw.author_name ?? raw.name ?? '—'
  ).trim() || '—';
  return {
    id,
    displayName,
    profileImage: resolveProfileImageUrl(raw.profile_image ?? raw.author_profile_image),
    initials: getInitials(displayName),
    avatarClass: avatarColorClass(id),
  };
}

/** API returns author as id + author_name on the post object. */
export function resolvePostAuthor(raw) {
  if (raw?.author != null && typeof raw.author === 'object') {
    return normalizeAuthor({ ...raw.author, author_name: raw.author_name });
  }
  const id = raw?.author ?? raw?.author_id ?? 0;
  return normalizeAuthor({
    id,
    display_name: raw?.author_name,
    profile_image: raw?.author_profile_image,
  });
}

export function normalizeImages(post) {
  if (Array.isArray(post?.images) && post.images.length) {
    return post.images
      .map((item) => {
        if (typeof item === 'string') return resolveProfileImageUrl(item);
        if (item && typeof item === 'object') {
          const url = item.image ?? item.url ?? item.file;
          return url ? { id: item.id, url: resolveProfileImageUrl(url) } : null;
        }
        return null;
      })
      .filter((x) => x?.url);
  }
  if (Array.isArray(post?.image_urls)) {
    return post.image_urls
      .map((u) => {
        const url = resolveProfileImageUrl(u);
        return url ? { id: null, url } : null;
      })
      .filter(Boolean);
  }
  if (Array.isArray(post?.attachments)) {
    return post.attachments
      .map((a) => {
        const url = resolveProfileImageUrl(a?.url ?? a?.file ?? a?.image);
        return url ? { id: a?.id, url } : null;
      })
      .filter(Boolean);
  }
  return [];
}

export function normalizePollOptions(poll, raw) {
  if (!poll && !raw?.poll_options) return [];
  const opts = poll?.options ?? poll?.poll_options ?? raw?.poll_options ?? [];
  const mapped = opts.map((o) => ({
    id: o.id,
    label: String(o.label ?? o.text ?? o.option_text ?? '').trim(),
    votesCount: Number(o.votes_count ?? o.vote_count ?? 0) || 0,
    hasVoted: Boolean(o.has_voted),
    voters: (o.voters ?? []).map((v) => ({
      id: v.id,
      name: String(v.name ?? v.display_name ?? '').trim(),
    })),
    percentage: Number(o.percentage ?? o.vote_percentage ?? 0) || 0,
  }));
  const total = mapped.reduce((s, o) => s + o.votesCount, 0);
  return mapped.map((o) => ({
    ...o,
    percentage: o.percentage > 0 ? o.percentage : total > 0 ? (o.votesCount / total) * 100 : 0,
  }));
}

export function findVotedPollOptionId(options) {
  const voted = (options ?? []).find((o) => o.hasVoted);
  return voted?.id ?? null;
}

export function normalizeComment(raw) {
  if (raw?.id == null) return null;
  const author =
    raw.author != null && typeof raw.author === 'object'
      ? normalizeAuthor({ ...raw.author, author_name: raw.author_name })
      : normalizeAuthor({ id: raw.author, display_name: raw.author_name });
  return {
    id: raw.id,
    author,
    content: String(raw.content ?? raw.text ?? '').trim(),
    timeLabel: formatFeedTime(raw.created_at ?? raw.created),
  };
}

export function normalizeFeedPost(raw) {
  const author = resolvePostAuthor(raw);
  const typeRaw = String(raw.post_type ?? '').toLowerCase();
  const isPoll = typeRaw === 'poll';
  const pollRaw = raw.poll ?? (isPoll ? raw : null);
  const pollOptions = normalizePollOptions(pollRaw, raw);
  const totalVotes =
    pollRaw?.total_votes ?? pollOptions.reduce((s, o) => s + o.votesCount, 0);

  return {
    id: raw.id,
    postType: (() => {
      const t = String(raw.post_type ?? 'post').toLowerCase();
      if (t === 'standard') return 'post';
      return t;
    })(),
    author,
    content: String(raw.content ?? raw.body ?? '').trim(),
    createdAt: raw.created_at ?? raw.created ?? '',
    timeLabel: formatFeedTime(raw.created_at ?? raw.created),
    images: normalizeImages(raw),
    mentions: (raw.mentions ?? []).map(normalizeAuthor),
    praiseTargets: (raw.praised_employees ?? raw.praise_targets ?? []).map(normalizeAuthor),
    poll: pollRaw
      ? {
          id: pollRaw.id ?? raw.id,
          question: String(pollRaw.question ?? raw.content ?? '').trim(),
          options: pollOptions,
          totalVotes,
          expiryDate: pollRaw.expiry_date ?? pollRaw.expires_at ?? null,
          userVotedOptionId:
            pollRaw.user_voted_option_id ??
            pollRaw.voted_option_id ??
            findVotedPollOptionId(pollOptions),
        }
      : null,
    likesCount: Number(raw.likes_count ?? raw.like_count ?? 0) || 0,
    commentsCount: Number(raw.comments_count ?? raw.comment_count ?? 0) || 0,
    userReaction: parseUserReaction(raw),
    isLiked: Boolean(parseUserReaction(raw) ?? raw.is_liked ?? raw.liked),
    comments: (raw.comments ?? []).map(normalizeComment).filter(Boolean),
  };
}

export function departmentTabLabel(department, subDepartment) {
  const d = String(department ?? '').trim();
  const s = String(subDepartment ?? '').trim();
  if (d && s) return `${d} > ${s}`;
  if (d) return d;
  if (s) return s;
  return 'Department';
}

export const composerInputClass = cx(
  'w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100',
  'placeholder:text-slate-400',
  'focus:outline-none focus:ring-2 focus:ring-accent/35'
);
