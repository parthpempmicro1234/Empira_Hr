import { useQuery } from '@tanstack/react-query';
import { getProfileHeader } from '../../../services/profileHeader';
import { createOrgFeedEntry } from '../../../services/socialFeed';

/** UI tab → API visibility for POST org/feed/ */
export function toApiVisibility(tab) {
  return tab === 'organization' ? 'business_unit' : 'department';
}

export function buildStandardPayload({ content, visibilityTab, mentionIds = [] }) {
  const payload = {
    post_type: 'standard',
    content: content.trim(),
    visibility: toApiVisibility(visibilityTab),
  };
  if (mentionIds.length) {
    payload.mention_ids = mentionIds;
  }
  return payload;
}

export function buildPollPayload({
  content,
  visibilityTab,
  optionTexts,
  expiryDate,
  notifyEmployees,
  isAnonymous,
}) {
  const payload = {
    post_type: 'poll',
    content: content.trim(),
    visibility: toApiVisibility(visibilityTab),
    poll_options: optionTexts.map((text) => ({ option_text: text })),
  };
  if (expiryDate) payload.expiry_date = expiryDate;
  if (notifyEmployees) payload.notify_employees = true;
  if (isAnonymous) payload.is_anonymous = true;
  return payload;
}

export function useDepartmentProfile() {
  return useQuery({
    queryKey: ['profileHeader', 'me'],
    queryFn: () => getProfileHeader('me'),
    staleTime: 5 * 60_000,
  });
}

export { createOrgFeedEntry };
