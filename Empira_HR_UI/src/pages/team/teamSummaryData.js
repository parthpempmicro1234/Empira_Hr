/** May 2026 — full month team calendar (matches reference UI) */
export const CALENDAR_MONTH_LABEL = 'May 2026';

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** All Sat–Sun pairs in May 2026 */
export const MAY_WEEKLY_OFF_RUNS = [
  [2, 3],
  [9, 10],
  [16, 17],
  [23, 24],
  [30, 31],
];

/** @typedef {'on-leave'|'multiple-leave'|'wfh-od'} HeaderFlag */

function buildMay2026Days() {
  const days = [];
  for (let date = 1; date <= 31; date += 1) {
    const dow = DOW[new Date(2026, 4, date).getDay()];
    /** @type {HeaderFlag | undefined} */
    let headerFlag;
    if (date === 8 || date === 11) headerFlag = 'on-leave';
    else if (date === 14) headerFlag = 'multiple-leave';
    days.push({ date, dow, ...(headerFlag ? { headerFlag } : {}) });
  }
  return days;
}

export const CALENDAR_DAYS = buildMay2026Days();

/**
 * @typedef {Object} CalendarEmployee
 * @property {string} id
 * @property {string} initials
 * @property {string} name
 * @property {string} avatarClass
 * @property {Record<number, string>} [singles]
 * @property {Array<[number, number]>} [weeklyOffRuns]
 * @property {Array<{ start: number; end: number; segments: Array<{ through: number; type: string }> }>} [bands]
 */

/** @type {CalendarEmployee[]} */
export const CALENDAR_EMPLOYEES = [
  {
    id: 'hs',
    initials: 'HS',
    name: 'Himanshu Shukla',
    avatarClass: 'bg-[#3b6ea8]',
    weeklyOffRuns: MAY_WEEKLY_OFF_RUNS,
    singles: { 14: 'paid-leave' },
  },
  {
    id: 'mp',
    initials: 'MP',
    name: 'Mihir Patel',
    avatarClass: 'bg-[#52b788]',
    weeklyOffRuns: MAY_WEEKLY_OFF_RUNS,
    singles: { 14: 'unpaid-leave' },
  },
  {
    id: 'tk',
    initials: 'TK',
    name: 'Tanvi Kulkarni',
    avatarClass: 'bg-[#e07a3a]',
    weeklyOffRuns: MAY_WEEKLY_OFF_RUNS,
    singles: { 8: 'paid-leave' },
    bands: [
      {
        start: 9,
        end: 16,
        segments: [
          { through: 13, type: 'leave-span-a' },
          { through: 16, type: 'leave-span-b' },
        ],
      },
    ],
  },
];

export const CALENDAR_LEGEND = [
  { id: 'wfh', label: 'Work from home', swatch: 'circle', color: '#a855f7' },
  { id: 'on-duty', label: 'On duty', swatch: 'circle', color: '#ec4899' },
  { id: 'paid-leave', label: 'Paid Leave', swatch: 'circle', color: '#4fd1c5' },
  { id: 'unpaid-leave', label: 'Unpaid Leave', swatch: 'circle', color: '#c4b5a2' },
  { id: 'no-attendance', label: 'Leave due to No Attendance', swatch: 'circle', color: '#f87171' },
  { id: 'weekly-off', label: 'Weekly off', swatch: 'circle', color: '#f9bc15' },
  { id: 'holiday', label: 'Holiday', swatch: 'circle', color: '#4ade80' },
  { id: 'on-leave', label: 'Someone on Leave', swatch: 'dot', color: '#60a5fa' },
  { id: 'multiple-leave', label: 'Multiple Leave on a day', swatch: 'dot', color: '#ef4444' },
  { id: 'wfh-od', label: 'Someone on WFH/OD', swatch: 'dot', color: '#a855f7' },
];

/** Stat card layout; values come from `myteam/summary/` */
export const STAT_CARD_DEFINITIONS = [
  {
    id: 'on-time',
    apiKey: 'Employees On Time today',
    title: 'Employees On Time today',
    accentClass: 'bg-[#22d3ee]',
    linkLabel: 'View Employees',
  },
  {
    id: 'late',
    apiKey: 'Late Arrivals today',
    title: 'Late Arrivals today',
    accentClass: 'bg-[#e879f9]',
  },
  {
    id: 'wfh',
    apiKey: 'Work from Home / On Duty today',
    title: 'Work from Home / On Duty today',
    accentClass: 'bg-[#a3e635]',
  },
  {
    id: 'remote',
    apiKey: 'Remote Clock-ins today',
    title: 'Remote Clock-ins today',
    accentClass: 'bg-[#fbbf24]',
  },
];
