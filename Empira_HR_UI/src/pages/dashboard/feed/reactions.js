/** Backend reaction_type values */
export const REACTION_TYPES = [
  { type: 'like', label: 'Like', emoji: '👍' },
  { type: 'haha', label: 'Haha', emoji: '😂' },
  { type: 'heart', label: 'Heart', emoji: '❤️' },
  { type: 'clap', label: 'Clap', emoji: '👏' },
  { type: 'curious', label: 'Curious', emoji: '🤔' },
];

const REACTION_MAP = Object.fromEntries(REACTION_TYPES.map((r) => [r.type, r]));

export function getReactionMeta(type) {
  if (!type) return null;
  return REACTION_MAP[String(type).toLowerCase()] ?? null;
}

export function parseUserReaction(raw) {
  const r = raw?.user_reaction ?? raw?.userReaction ?? null;
  if (r == null || r === '' || r === false) return null;
  const key = String(r).toLowerCase();
  return REACTION_MAP[key] ? key : null;
}

export function reactionEmoji(type) {
  return getReactionMeta(type)?.emoji ?? null;
}

/** Accent styles per reaction for the trigger button */
export const REACTION_STYLES = {
  like: 'text-blue-400',
  haha: 'text-amber-400',
  heart: 'text-rose-400',
  clap: 'text-emerald-400',
  curious: 'text-violet-400',
};
