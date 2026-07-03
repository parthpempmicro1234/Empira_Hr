import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const TeamSummaryViewContext = createContext(null);

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function TeamSummaryViewProvider({ children, showPeersTab = false }) {
  const now = useMemo(() => new Date(), []);
  const [innerView, setInnerView] = useState('summary');
  const [yearMonth, setYearMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  const { year, month } = yearMonth;

  const calendarView = showPeersTab && innerView === 'peers' ? 'peers' : undefined;

  const monthLabel = useMemo(() => {
    const name = MONTH_NAMES[month - 1] ?? '';
    return `${name} ${year}`;
  }, [month, year]);

  const monthParam = useMemo(() => String(month).padStart(2, '0'), [month]);

  const goPrevMonth = useCallback(() => {
    setYearMonth((prev) => {
      if (prev.month <= 1) return { year: prev.year - 1, month: 12 };
      return { year: prev.year, month: prev.month - 1 };
    });
  }, []);

  const goNextMonth = useCallback(() => {
    setYearMonth((prev) => {
      if (prev.month >= 12) return { year: prev.year + 1, month: 1 };
      return { year: prev.year, month: prev.month + 1 };
    });
  }, []);

  const value = useMemo(
    () => ({
      innerView,
      setInnerView,
      showPeersTab,
      calendarView,
      year,
      month,
      monthParam,
      monthLabel,
      goPrevMonth,
      goNextMonth,
    }),
    [
      innerView,
      showPeersTab,
      calendarView,
      year,
      month,
      monthParam,
      monthLabel,
      goPrevMonth,
      goNextMonth,
    ]
  );

  return (
    <TeamSummaryViewContext.Provider value={value}>{children}</TeamSummaryViewContext.Provider>
  );
}

export function useTeamSummaryView() {
  const ctx = useContext(TeamSummaryViewContext);
  if (!ctx) {
    throw new Error('useTeamSummaryView must be used within TeamSummaryViewProvider');
  }
  return ctx;
}
