import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getMyTeamCalendar } from '../../services/myteam.api';
import ApiErrorPanel from './components/ApiErrorPanel.jsx';
import CalendarLoadingSkeleton from './components/CalendarLoadingSkeleton.jsx';
import EmptyState from './components/EmptyState.jsx';
import CalendarEmployeeRow from './CalendarEmployeeRow.jsx';
import CalendarLegend from './CalendarLegend.jsx';
import { useTeamSummaryView } from './context/TeamSummaryViewContext.jsx';
import { parseTeamCalendarResponse } from './utils/parseTeamCalendar.js';
import {
  CALENDAR_GAP_PX,
  CELL_PX,
  PANEL_BG,
  calendarGridTemplate,
  calendarTrackWidth,
} from './calendarStatusStyles.js';

function HeaderFlagDot({ flag }) {
  if (!flag) return <span className="mb-0.5 h-1 w-1 shrink-0" aria-hidden />;
  const color =
    flag === 'on-leave' ? '#60a5fa' : flag === 'multiple-leave' ? '#ef4444' : '#a855f7';
  return (
    <span
      className="mb-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

export default function TeamCalendar() {
  const { year, monthParam, monthLabel, calendarView, goPrevMonth, goNextMonth } =
    useTeamSummaryView();

  const calendarQuery = useQuery({
    queryKey: ['myteam', 'teamcalander', year, monthParam, calendarView ?? 'default'],
    queryFn: () => getMyTeamCalendar(year, monthParam, calendarView),
    staleTime: 30_000,
  });

  const parsed = useMemo(
    () => parseTeamCalendarResponse(calendarQuery.data),
    [calendarQuery.data]
  );

  const { days, team } = parsed;
  const dayCount = days.length || parsed.daysInMonth || 31;
  const gridTemplate = useMemo(() => calendarGridTemplate(dayCount), [dayCount]);
  const trackWidth = useMemo(() => calendarTrackWidth(dayCount), [dayCount]);
  const dateCols = useMemo(() => `repeat(${dayCount}, ${CELL_PX}px)`, [dayCount]);
  const employeeRowStart = 3;
  const isLoading = calendarQuery.isLoading || calendarQuery.isFetching;
  const isError = calendarQuery.isError;

  return (
    <section aria-labelledby="team-calendar-heading" className="font-sans">
      <h2 id="team-calendar-heading" className="text-xs font-medium text-gray-400">
        Team calendar
      </h2>

      <div className="mt-2 rounded-md border border-white/[0.06] bg-[#111d2b] transition-opacity duration-300">
        {isError && !isLoading ? (
          <div className="p-4">
            <ApiErrorPanel
              message="Unable to load team calendar."
              onRetry={() => calendarQuery.refetch()}
            />
          </div>
        ) : null}

        {!isError ? (
          <div className="overflow-x-auto overflow-y-visible custom-scrollbar">
            {isLoading ? (
              <CalendarLoadingSkeleton dayCount={dayCount} rowCount={4} />
            ) : team.length === 0 ? (
              <div className="p-6">
                <EmptyState message="No team members available." />
              </div>
            ) : (
              <div
                className="inline-grid w-max min-w-full px-1 pb-4 pt-1.5 transition-opacity duration-300 sm:px-2"
                style={{ gridTemplateColumns: gridTemplate, opacity: isLoading ? 0.6 : 1 }}
                role="grid"
                aria-label="Team attendance calendar"
              >
                <div
                  className="sticky left-0 z-30 flex items-center py-1 pr-2"
                  style={{ gridColumn: 1, gridRow: 1, backgroundColor: PANEL_BG }}
                >
                  <div className="flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-md border border-violet-500/30 bg-violet-600/20 px-1 py-0.5">
                    <button
                      type="button"
                      onClick={goPrevMonth}
                      disabled={isLoading}
                      className="grid h-5 w-5 shrink-0 place-items-center rounded text-violet-200 transition-colors hover:bg-violet-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 disabled:opacity-50"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-3 w-3" strokeWidth={2.5} />
                    </button>
                    <span className="min-w-[5.5rem] px-1 text-center text-[11px] font-semibold text-gray-100">
                      {monthLabel}
                    </span>
                    <button
                      type="button"
                      onClick={goNextMonth}
                      disabled={isLoading}
                      className="grid h-5 w-5 shrink-0 place-items-center rounded text-violet-200 transition-colors hover:bg-violet-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 disabled:opacity-50"
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                <div
                  className="sticky top-0 z-20 flex items-end justify-center pb-1"
                  style={{ gridColumn: 2, gridRow: 1, backgroundColor: PANEL_BG }}
                >
                  <span className="text-[9px] font-medium uppercase tracking-wide text-gray-600">
                    Dates
                  </span>
                </div>

                <div
                  className="sticky top-0 z-20 grid items-end"
                  style={{
                    gridColumn: '3 / -1',
                    gridRow: 1,
                    gridTemplateColumns: dateCols,
                    width: trackWidth,
                    minWidth: trackWidth,
                    backgroundColor: PANEL_BG,
                  }}
                >
                  {days.map((d) => (
                    <div
                      key={`dow-${d.iso}`}
                      className="flex flex-col items-center justify-end pb-0.5"
                      style={{ width: CELL_PX, minWidth: CELL_PX }}
                      role="columnheader"
                    >
                      <HeaderFlagDot flag={d.headerFlag} />
                      <span
                        className={`whitespace-nowrap text-[9px] font-medium uppercase tracking-wide ${d.isWeekend ? 'text-gray-600' : 'text-gray-500'}`}
                      >
                        {d.dow}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ gridColumn: 1, gridRow: 2, backgroundColor: PANEL_BG }} aria-hidden />

                <div
                  style={{
                    gridColumn: 2,
                    gridRow: 2,
                    width: CALENDAR_GAP_PX,
                    backgroundColor: PANEL_BG,
                  }}
                  aria-hidden
                />

                <div
                  className="sticky top-0 z-20 grid border-b border-white/[0.06] pb-1"
                  style={{
                    gridColumn: '3 / -1',
                    gridRow: 2,
                    gridTemplateColumns: dateCols,
                    width: trackWidth,
                    minWidth: trackWidth,
                    backgroundColor: PANEL_BG,
                  }}
                >
                  {days.map((d) => (
                    <div
                      key={`num-${d.iso}`}
                      className="flex items-center justify-center"
                      style={{ width: CELL_PX, minWidth: CELL_PX }}
                    >
                      <span
                        className={`whitespace-nowrap text-[10px] font-semibold tabular-nums ${d.isToday ? 'text-violet-300' : 'text-gray-200'}`}
                      >
                        {d.date}
                      </span>
                    </div>
                  ))}
                </div>

                {team.map((emp, index) => (
                  <CalendarEmployeeRow
                    key={emp.id}
                    employee={emp}
                    days={days}
                    gridColumnStart={employeeRowStart + index}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {!isLoading && !isError && team.length > 0 ? <CalendarLegend /> : null}
      </div>
    </section>
  );
}
