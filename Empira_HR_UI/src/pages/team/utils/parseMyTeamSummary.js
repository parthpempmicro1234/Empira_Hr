import { STAT_CARD_DEFINITIONS } from '../teamSummaryData.js';
import { normalizeTeamEmployeeList } from './teamEmployeeUtils.js';

/**
 * @param {import('../../../services/myteam.api').MyTeamSummaryResponse | undefined} data
 * @param {string} apiKey
 */
function readSummaryStatValue(data, apiKey) {
  if (!data || typeof data !== 'object') return 0;
  const raw = data[apiKey];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

/**
 * @param {import('../../../services/myteam.api').MyTeamSummaryResponse | undefined} data
 */
export function buildStatCards(data) {
  return STAT_CARD_DEFINITIONS.map((def) => ({
    id: def.id,
    title: def.title,
    value: readSummaryStatValue(data, def.apiKey),
    accentClass: def.accentClass,
    linkLabel: def.linkLabel,
  }));
}

/**
 * @param {import('../../../services/myteam.api').MyTeamSummaryResponse | undefined} data
 */
export function parseMyTeamSummary(data) {
  const empty = {
    showPeersTab: false,
    teamSectionTitle: 'Team',
    teamMembers: [],
    onLeaveToday: [],
    notInYetToday: [],
    statCards: buildStatCards(undefined),
  };

  if (!data || typeof data !== 'object') return empty;

  const onLeaveToday = normalizeTeamEmployeeList(data.on_leave_today);
  const notInYetToday = normalizeTeamEmployeeList(data.not_in_yet_today);
  const hasDirectReport = Object.prototype.hasOwnProperty.call(data, 'Direct Report');
  const hasPeers = Object.prototype.hasOwnProperty.call(data, 'Peers');

  const statCards = buildStatCards(data);

  if (hasDirectReport) {
    return {
      showPeersTab: true,
      teamSectionTitle: 'Direct Report',
      teamMembers: normalizeTeamEmployeeList(data['Direct Report']),
      onLeaveToday,
      notInYetToday,
      statCards,
    };
  }

  if (hasPeers) {
    return {
      showPeersTab: false,
      teamSectionTitle: 'Peers',
      teamMembers: normalizeTeamEmployeeList(data.Peers),
      onLeaveToday,
      notInYetToday,
      statCards,
    };
  }

  return { ...empty, onLeaveToday, notInYetToday, statCards };
}
