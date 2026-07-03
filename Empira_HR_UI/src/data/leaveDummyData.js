/** Static dummy data for Leave Summary UI (no backend). */

export const LEAVE_SIDEBAR_KEYS = ['paid', 'sick', 'unpaid'];

export const leaveTransactionsByType = {
  paid: [
    {
      id: 't1',
      date: '2026-04-18',
      change: 1,
      balance: 12,
      reason: 'Annual accrual for April',
      detailId: 'd1',
    },
    {
      id: 't2',
      date: '2026-04-10',
      change: -1,
      balance: 11,
      reason: 'Half-day personal errand',
      detailId: 'd2',
    },
    {
      id: 't3',
      date: '2026-03-22',
      change: -2,
      balance: 12,
      reason: 'Family event',
      detailId: 'd3',
    },
    {
      id: 't4',
      date: '2026-01-02',
      change: 10,
      balance: 14,
      reason: 'Year opening balance',
      detailId: 'd4',
    },
  ],
  sick: [
    {
      id: 's1',
      date: '2026-04-02',
      change: -1,
      balance: 4,
      reason: 'Medical appointment',
      detailId: 'sd1',
    },
    {
      id: 's2',
      date: '2026-02-14',
      change: 2,
      balance: 5,
      reason: 'Sick leave quota refresh',
      detailId: 'sd2',
    },
  ],
  unpaid: [
    {
      id: 'u1',
      date: '2026-03-30',
      change: -3,
      balance: 0,
      reason: 'Extended travel (unpaid)',
      detailId: 'ud1',
    },
  ],
};

export const leavePolicyByType = {
  paid: [
    {
      id: 'p1',
      title: 'Leave quota & requesting',
      bullets: [
        'You are allocated a total of 12 days of leave in a year beginning Jan 2026 till Dec 2026. You can consume this leave in the same year they are accrued/credited.',
        'You are allowed to have more than annual quota of leave, if you are granted additional leave manually by your management.',
        'While your annual quota is 12 days, you are not eligible to consume all of those leave right away. Leave accrue at regular intervals as defined below. Accrued leave balance are the leave available for you to consume at any time.',
        'As per your leave plan, Paid Leave accrues once every month on 1st. So your leave quota of 12 days of leave will be accrued once every month at the rate of 1 day.',
        'The accrual of leave credits for an accrual cycle does not happen if you take more than 15 days of all leave types within the once every month period.',
        'Paid Leave that got credited expire if not consumed within 30 days from date of accrual (or date of credit). When you apply for a leave, the system will automatically deduct from the most recently expiring leave.',
        'Paid Leave can be applied by self or on behalf by your manager.',
        'Paid Leave can be applied for both full day & half-day.',
      ],
    },
    {
      id: 'p2',
      title: 'Restrictions',
      bullets: [
        'For applying a leave duration of 1 or more days, you need to apply at least 5 calendar days before of which there have to be at least 3 working days.',
        'Paid Leave requires comment while applying leave.',
        'You cannot apply for more than 1 consecutive days of leave (excluding weekoffs & holidays).',
        'You cannot have more than 1 leave requests in a calendar month.',
        'You cannot have more than 12 leave requests in a leave calendar year.',
        'Paid Leave cannot be applied when in notice period.',
        'You can avail a maximum of 1 days of leave in a month.',
        'Paid Leave cannot be taken along with Sick Leave.',
        'Restrictions after joining: You are able to consume leave 0 days after joining date.',
        'Past dated leave restrictions: You are not allowed to apply past day leave. Your manager or HR manager can apply on your behalf.',
      ],
    },
    {
      id: 'p3',
      title: 'Leave balances at end of year',
      bullets: [
        'Leave balance at the end of the year (Dec 2026).',
        'At the end of leave calendar (Dec 2026), the following policies apply:',
        'All leave balances expire or get reset.',
        'Negative leave balances that may have accumulated for employees who have taken leave beyond their annual quota gets nullified and balance is reset to zero.',
      ],
    },
    {
      id: 'p4',
      title: 'Sandwich policy',
      bullets: [
        'Holidays during leave.',
        'Holiday accompanying leave is treated as leave when total number of leave exceed 0 calendar days and leave day is before or after or in-between a Holiday.',
      ],
    },
  ],
  sick: [
    {
      id: 's1',
      title: 'Leave quota & requesting',
      bullets: [
        'You are allocated a total of 6 days of leave in a year beginning Jan 2026 till Dec 2026. You can consume this leave in the same year they are accrued/credited.',
        'You are allowed to have more than annual quota of leave, if you are granted additional leave manually by your management.',
        'Sick Leave can be applied by self or on behalf by your manager.',
        'Sick Leave can be applied for both full day & half-day.',
      ],
    },
    {
      id: 's2',
      title: 'Restrictions',
      bullets: [
        'Restrictions for applying leave.',
        'Sick Leave requires comment while applying leave.',
        'Sick Leave requires document proof, if leave request exceeds 1 calendar days.',
        'Sick Leave cannot be applied when in notice period.',
        'Sick Leave cannot be taken along with Paid Leave.',
        'Restrictions after joining: You are able to consume leave 0 days after probation period. While you may not eligible to consume your leave during this period, your leave accrual happens as described in the previous section.',
        'Past dated leave restrictions.',
      ],
    },
    {
      id: 's3',
      title: 'Leave balances at end of year',
      bullets: [
        'Leave balance at the end of the year (Dec 2026).',
        'At the end of leave calendar (Dec 2026), the following policies apply:',
        'All leave balances expire or get reset.',
        'Negative leave balances that may have accumulated for employees who have taken leave beyond their annual quota gets nullified and balance is reset to zero.',
      ],
    },
    {
      id: 's4',
      title: 'Sandwich policy',
      bullets: [
        'Holidays during leave.',
        'Holiday accompanying leave is treated as leave when total number of leave exceed 1 calendar days and leave day is before or after or in-between a Holiday.',
      ],
    },
  ],
  unpaid: [
    {
      id: 'u1',
      title: 'Leave quota & requesting',
      bullets: [
        'You are allocated a total of 24 days of leave in a year beginning Jan 2026 till Dec 2026. You can consume this leave in the same year they are accrued/credited.',
        'You are allowed to have more than annual quota of leave, if you are granted additional leave manually by your management.',
        'While your annual quota is 24 days, you are not eligible to consume all of those leave right away. Leave accrue at regular intervals as defined below. Accrued leave balance are the leave available for you to consume at any time.',
        'As per your leave plan, Unpaid Leave accrues once every 6 months on 1st. So your leave quota of 24 days of leave will be accrued once every 6 months at the rate of 12 days.',
        'At any given time, you are limited to apply for those many leave that got accrued as of the date when a leave request is made and not on future day for which leave is applied. Ex:- If you are applying for a leave on March 01 for a leave on April 12th, leave accrued as of March 01 are considered.',
        'Unpaid Leave can be applied by self or on behalf by your manager.',
        'Unpaid Leave can be applied for both full day & half-day.',
      ],
    },
    {
      id: 'u2',
      title: 'Restrictions',
      bullets: [
        'Restrictions for applying leave.',
        'For applying a leave duration of 1 or more days, you need to apply at least 5 calendar days before of which there have to be at least 3 working days.',
        'Unpaid Leave requires comment while applying leave.',
        'You cannot apply for more than 15 consecutive days of leave (excluding weekoffs & holidays).',
        'You cannot have more than 5 leave requests in a calendar month.',
        'Restrictions after joining: You are able to consume leave 0 days after joining date.',
        'Past dated leave restrictions: You can apply leave for a past day, but not beyond than 5 calendar days back.',
      ],
    },
    {
      id: 'u3',
      title: 'Leave balances at end of year',
      bullets: [
        'Leave balances at the end of the year are subject to your organization policy.',
      ],
    },
    {
      id: 'u4',
      title: 'Sandwich policy',
      bullets: [
        'Holidays during leave.',
        'Holiday accompanying leave is treated as leave when total number of leave exceed 0 calendar days and leave day is before or after or in-between a Holiday.',
      ],
    },
  ],
};

export const leaveRequestDetails = {
  d1: {
    initials: 'JD',
    name: 'Jane Doe',
    meta: 'Submitted Apr 18, 2026 · Employee ID 10492',
    leaveDateLabel: 'APR 24',
    leaveType: 'Paid time off',
    comments: [
      { id: 'c1', author: 'Jane Doe', text: 'Using one day for family commitment.', at: 'Apr 18, 9:12 AM' },
      { id: 'c2', author: 'Alex Manager', text: 'Approved — enjoy your time off.', at: 'Apr 18, 11:40 AM' },
    ],
    timeline: [
      { id: 'tl1', label: 'Requested', status: 'done', at: 'Apr 18, 9:10 AM' },
      { id: 'tl2', label: 'Approved', status: 'done', at: 'Apr 18, 11:40 AM' },
    ],
  },
  d2: {
    initials: 'JD',
    name: 'Jane Doe',
    meta: 'Submitted Apr 10, 2026',
    leaveDateLabel: 'APR 10',
    leaveType: 'Paid leave (half day)',
    comments: [{ id: 'c1', author: 'Jane Doe', text: 'Morning appointment.', at: 'Apr 9, 4:00 PM' }],
    timeline: [
      { id: 'tl1', label: 'Requested', status: 'done', at: 'Apr 9, 4:00 PM' },
      { id: 'tl2', label: 'Approved', status: 'done', at: 'Apr 9, 5:12 PM' },
    ],
  },
  d3: {
    initials: 'JD',
    name: 'Jane Doe',
    meta: 'Submitted Mar 20, 2026',
    leaveDateLabel: 'MAR 22–23',
    leaveType: 'Paid leave',
    comments: [],
    timeline: [
      { id: 'tl1', label: 'Requested', status: 'done', at: 'Mar 20, 10:00 AM' },
      { id: 'tl2', label: 'Approved', status: 'done', at: 'Mar 20, 2:15 PM' },
    ],
  },
  d4: {
    initials: 'JD',
    name: 'Jane Doe',
    meta: 'System · Jan 2, 2026',
    leaveDateLabel: 'JAN 1',
    leaveType: 'Balance credit',
    comments: [],
    timeline: [{ id: 'tl1', label: 'Credited', status: 'done', at: 'Jan 2, 12:00 AM' }],
  },
  sd1: {
    initials: 'JD',
    name: 'Jane Doe',
    meta: 'Submitted Apr 1, 2026',
    leaveDateLabel: 'APR 2',
    leaveType: 'Sick leave',
    comments: [{ id: 'c1', author: 'Jane Doe', text: 'Doctor visit — certificate attached.', at: 'Apr 1, 8:00 PM' }],
    timeline: [
      { id: 'tl1', label: 'Requested', status: 'done', at: 'Apr 1, 8:00 PM' },
      { id: 'tl2', label: 'Approved', status: 'done', at: 'Apr 2, 9:05 AM' },
    ],
  },
  sd2: {
    initials: '—',
    name: 'Policy',
    meta: 'HR · Feb 14, 2026',
    leaveDateLabel: 'FEB 14',
    leaveType: 'Sick leave quota',
    comments: [],
    timeline: [{ id: 'tl1', label: 'Updated', status: 'done', at: 'Feb 14, 12:00 AM' }],
  },
  ud1: {
    initials: 'JD',
    name: 'Jane Doe',
    meta: 'Submitted Mar 28, 2026',
    leaveDateLabel: 'MAR 30 – APR 1',
    leaveType: 'Unpaid leave',
    comments: [{ id: 'c1', author: 'Jane Doe', text: 'Travel — discussed with manager.', at: 'Mar 28, 3:00 PM' }],
    timeline: [
      { id: 'tl1', label: 'Requested', status: 'done', at: 'Mar 28, 3:00 PM' },
      { id: 'tl2', label: 'Approved', status: 'done', at: 'Mar 29, 10:00 AM' },
    ],
  },
};

export function mapLeaveItemToSidebarKey(leaveTypeName) {
  const k = String(leaveTypeName ?? '').toLowerCase();
  if (k.includes('sick')) return 'sick';
  if (k.includes('unpaid')) return 'unpaid';
  return 'paid';
}
