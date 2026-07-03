import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checkIn, checkOut, getAttendanceTimeline } from '../../../services/attendance.api';
import {
  getDetailsForSessionsFromDay,
  getEffectiveGrossDisplayFromDay,
  getTimelineDayIsoKey,
  mergeAttendanceDayIntoTimeline,
  shouldShowCheckOutForToday,
  toISODate,
} from '../../me/attendanceLogHelpers.js';
import { getLiveRunningTime } from '../../me/liveAttendanceTime.js';
import { extractAttendanceDayFromResponse, normalizeAttendanceDayPatch } from '../../me/attendanceDayResponse.js';

/**
 * Live today attendance + clock actions. Query keys match Me → Attendance for cache sharing.
 */
export function useTodayAttendanceClock() {
  const [now, setNow] = useState(() => new Date());
  const queryClient = useQueryClient();

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  const todayIso = useMemo(
    () => toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate())),
    [now.getFullYear(), now.getMonth(), now.getDate()]
  );

  const todayQuery = useQuery({
    queryKey: ['attendance', 'employee', 'today', todayIso],
    queryFn: () => getAttendanceTimeline(todayIso, todayIso),
    staleTime: 30_000,
  });

  const attendanceData = useMemo(() => {
    const list = todayQuery.data?.timeline ?? [];
    return list.find((d) => getTimelineDayIsoKey(d) === todayIso) ?? null;
  }, [todayQuery.data, todayQuery.dataUpdatedAt, todayIso]);

  const isCheckedIn = shouldShowCheckOutForToday(attendanceData);
  const todayDetails = getDetailsForSessionsFromDay(attendanceData);
  const staticHours = useMemo(() => getEffectiveGrossDisplayFromDay(attendanceData), [attendanceData]);

  const liveRunning = useMemo(
    () => getLiveRunningTime(now, todayDetails, isCheckedIn),
    [now, todayDetails, isCheckedIn]
  );

  const effectiveLabel = liveRunning?.effective ?? staticHours.effective;
  const grossLabel = liveRunning?.gross ?? staticHours.gross;

  const applyAttendanceDayToCaches = useCallback(
    async (apiResponse) => {
      const raw = extractAttendanceDayFromResponse(apiResponse);
      const patch = normalizeAttendanceDayPatch(raw);

      if (patch && Object.keys(patch).length > 0) {
        queryClient.setQueryData(['attendance', 'employee', 'today', todayIso], (old) => ({
          timeline: mergeAttendanceDayIntoTimeline(old?.timeline ?? [], todayIso, patch),
        }));

        const timelineCaches = queryClient.getQueriesData({
          queryKey: ['attendance', 'employee', 'timeline'],
          exact: false,
        });
        for (const [queryKey, cached] of timelineCaches) {
          if (!Array.isArray(queryKey) || queryKey.length < 5) continue;
          const fromDate = queryKey[3];
          const toDate = queryKey[4];
          if (typeof fromDate !== 'string' || typeof toDate !== 'string') continue;
          if (todayIso < fromDate || todayIso > toDate) continue;
          if (!cached?.timeline) continue;
          queryClient.setQueryData(queryKey, {
            timeline: mergeAttendanceDayIntoTimeline(cached.timeline, todayIso, patch),
          });
        }
      }

      await queryClient.refetchQueries({
        queryKey: ['attendance', 'employee'],
        type: 'active',
      });
    },
    [queryClient, todayIso]
  );

  const checkInMutation = useMutation({
    mutationFn: checkIn,
    onSuccess: (res) => {
      void applyAttendanceDayToCaches(res);
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: checkOut,
    onSuccess: (res) => {
      void applyAttendanceDayToCaches(res);
    },
  });

  const clockLoading = checkInMutation.isPending || checkOutMutation.isPending;
  const timelineLoading = todayQuery.isLoading;
  const buttonDisabled = clockLoading || timelineLoading;

  const handleClockClick = useCallback(() => {
    if (buttonDisabled) return;
    if (isCheckedIn) {
      checkOutMutation.mutate();
    } else {
      checkInMutation.mutate();
    }
  }, [buttonDisabled, isCheckedIn, checkInMutation, checkOutMutation]);

  const dateStr = useMemo(
    () =>
      now.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    [now]
  );

  const timeStr = useMemo(
    () =>
      now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }),
    [now]
  );

  const hasWorkedOrOpen = Boolean(
    isCheckedIn ||
      (effectiveLabel && effectiveLabel !== '0h 0m' && String(effectiveLabel).trim() !== '')
  );

  const statusLine = isCheckedIn
    ? "You're currently clocked in."
    : hasWorkedOrOpen
      ? 'Your session is complete for today.'
      : 'No active attendance session.';

  return {
    now,
    todayIso,
    isCheckedIn,
    effectiveLabel,
    grossLabel,
    dateStr,
    timelineLoading,
    clockLoading,
    buttonDisabled,
    handleClockClick,
    refetchTimeline: todayQuery.refetch,
    timelineError: todayQuery.isError,
    hasWorkedOrOpen,
    statusLine,
    timeStr,
  };
}
