import { api } from './api';

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'half_day'
  | 'week_off'
  | 'holiday'
  | 'on_leave'
  | (string & {});

export type ArrivalStatus = 'on_time' | 'late' | null | (string & {});

export interface AttendanceSession {
  id?: number;
  check_in?: string;
  check_out?: string;
  duration?: string | null;
  work_mode?: string;
  is_within_geofence?: boolean;
  clock_in_lat?: number | string | null;
  clock_in_lng?: number | string | null;
  location?: string | null;
  check_in_source?: string;
  check_out_source?: string;
  clock_in_mode?: string;
  clock_out_mode?: string;
}

export interface AttendanceDayDetails {
  id?: number;
  employee?: number;
  date?: string;
  status?: AttendanceStatus;
  arrival_status?: ArrivalStatus;
  total_work_time?: string;
  total_gross_time?: string;
  effective_work_time?: string;
  evaluated_effective_time?: string;
  effective_time?: string;
  gross_time?: string;
  overtime_minutes?: number;
  penalty_flags?: Record<string, unknown>;
  evaluation_notes?: string;
  is_locked?: boolean;
  effective_hours?: string;
  effective_time?: string;
  gross_hours?: string;
  gross_time?: string;
  arrival?: string;
  arrival_status?: string;
  sessions?: AttendanceSession[];
  shift_name?: string;
  shift_start?: string;
  shift_end?: string;
  leave_type?: string;
  status?: string;
  duration?: string;
}

export interface AttendanceTimelineDay {
  date?: string;
  work_date?: string;
  attendance_date?: string;
  type: 'attendance' | 'absent' | 'week_off' | 'leave' | (string & {});
  status?: AttendanceStatus | string;
  arrival_status?: ArrivalStatus | string;
  overtime_minutes?: number;
  details?: AttendanceDayDetails;
  /** Present when leave day also has clock-in data (API field name) */
  Attandace_data?: AttendanceDayDetails;
  Attandace_Data?: AttendanceDayDetails;
  Attendance_data?: AttendanceDayDetails;
  attendance_data?: AttendanceDayDetails;
}

export interface AttendanceTimelineResponse {
  timeline: AttendanceTimelineDay[];
}

export interface AttendanceCheckActionResponse {
  message?: string;
  /** API typo: "AttandanceDay" */
  AttandanceDay?: AttendanceDayDetails;
  AttandaceDay?: AttendanceDayDetails;
  AttendanceDay?: AttendanceDayDetails;
  attendance_day?: AttendanceDayDetails;
  warnings?: string[];
}

export interface PunchCheckInBody {
  lat?: number;
  lng?: number;
  device?: string;
  browser?: string;
  work_mode?: string;
}

export interface PunchCheckOutBody {
  lat?: number;
  lng?: number;
}

export async function checkIn(body: PunchCheckInBody = {}): Promise<AttendanceCheckActionResponse> {
  const res = await api.post<AttendanceCheckActionResponse>('attendance/employee/check-in/', body);
  return res.data;
}

export async function checkOut(body: PunchCheckOutBody = {}): Promise<AttendanceCheckActionResponse> {
  const res = await api.post<AttendanceCheckActionResponse>('attendance/employee/check-out/', body);
  return res.data;
}

/**
 * GET /attendance/employee/timeline/
 * @param fromDate — YYYY-MM-DD
 * @param toDate — YYYY-MM-DD
 */
export async function getAttendanceTimeline(
  fromDate?: string,
  toDate?: string
): Promise<AttendanceTimelineResponse> {
  const params: Record<string, string> = {};
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;

  const res = await api.get<AttendanceTimelineResponse>('attendance/employee/timeline/', {
    params,
  });
  return res.data;
}

/**
 * GET /attendance/employee/
 * @param fromDate — YYYY-MM-DD
 * @param toDate — YYYY-MM-DD
 */
export async function getAttendanceDays(
  fromDate?: string,
  toDate?: string
): Promise<AttendanceDayDetails[]> {
  const params: Record<string, string> = {};
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;

  const res = await api.get<AttendanceDayDetails[]>('attendance/employee/', { params });
  const data = res.data;
  return Array.isArray(data) ? data : [];
}

export type PolicyGeofenceMode = 'warn' | 'block' | (string & {});

export interface AttendancePolicy {
  id: number;
  name: string;
  full_day_minutes: number;
  half_day_minutes: number;
  include_breaks_in_work_time: boolean;
  require_gps: boolean;
  geofence_mode: PolicyGeofenceMode;
  block_punch_on_leave: boolean;
  block_punch_on_holiday: boolean;
  block_punch_on_week_off: boolean;
  ot_enabled: boolean;
  ot_requires_approval: boolean;
  ot_daily_cap_minutes: number;
}

export interface AttendancePolicyResponse {
  policy: AttendancePolicy | null;
}

export interface ShiftBreakRule {
  start: string;
  end: string;
}

export interface AttendanceShift {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  is_flexible: boolean;
  flex_check_in_start: string | null;
  flex_check_in_end: string | null;
  min_effective_minutes: number;
  break_rules: ShiftBreakRule[];
  break_min_minutes: number;
  break_max_minutes: number;
}

export interface AttendanceShiftResponse {
  shift: AttendanceShift | null;
}

export interface WeeklyOffPolicy {
  id: number;
  name: string;
  policy_rules: unknown;
  is_active: boolean;
}

export async function getMyAttendancePolicy(): Promise<AttendancePolicyResponse> {
  const res = await api.get<AttendancePolicyResponse>('attendance/my-policy/');
  return res.data;
}

export async function getMyAttendanceShift(): Promise<AttendanceShiftResponse> {
  const res = await api.get<AttendanceShiftResponse>('attendance/my-shift/');
  return res.data;
}

export async function getMyWeekOff(): Promise<WeeklyOffPolicy[]> {
  const res = await api.get<WeeklyOffPolicy[]>('attendance/myweekoff/');
  const data = res.data;
  return Array.isArray(data) ? data : [];
}

export interface AttendanceStatsSlice {
  avg_time: string;
  percentage: number;
}

export interface AttendanceStatsResponse {
  team: AttendanceStatsSlice;
  my_stats: AttendanceStatsSlice;
  peers?: AttendanceStatsSlice;
  metadata?: {
    from_date: string;
    to_date: string;
  };
}

/**
 * GET /attendance/stats/
 * Omit dates for default last-week window; pass fromdate/todate (YYYY-MM-DD) for custom range.
 */
export async function getAttendanceStats(
  fromDate?: string,
  toDate?: string
): Promise<AttendanceStatsResponse> {
  const params: Record<string, string> = {};
  if (fromDate) params.fromdate = fromDate;
  if (toDate) params.todate = toDate;

  const res = await api.get<AttendanceStatsResponse>('attendance/stats/', { params });
  return res.data;
}

export type OTStatus = 'pending' | 'approved' | 'rejected' | (string & {});

export interface OTRequest {
  id: number;
  employee: number;
  employee_name: string;
  date: string;
  requested_minutes: number;
  reason: string;
  status: OTStatus;
  approved_minutes: number | null;
  rejection_reason: string;
  action_taken_by: number | null;
  action_taken_on: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateOTRequestBody {
  date: string;
  requested_minutes: number;
  reason: string;
}

export async function listOvertimeRequests(): Promise<OTRequest[]> {
  const res = await api.get<OTRequest[]>('attendance/overtime-requests/');
  const data = res.data;
  return Array.isArray(data) ? data : [];
}

export async function createOvertimeRequest(body: CreateOTRequestBody): Promise<OTRequest> {
  const res = await api.post<OTRequest>('attendance/overtime-requests/', body);
  return res.data;
}

export type RegRequestType =
  | 'missed_check_in'
  | 'missed_check_out'
  | 'both'
  | 'wrong_time'
  | 'wfh_mark'
  | (string & {});

export type RegStatus = 'pending' | 'approved' | 'rejected' | (string & {});

export interface RegRequest {
  id: number;
  employee: number;
  employee_name: string;
  date: string;
  request_type: RegRequestType;
  requested_check_in: string | null;
  requested_check_out: string | null;
  reason: string;
  status: RegStatus;
  rejection_reason: string;
  action_taken_by: number | null;
  action_taken_on: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRegRequestBody {
  date: string;
  request_type: RegRequestType;
  requested_check_in?: string | null;
  requested_check_out?: string | null;
  reason: string;
}

export async function listRegularizationRequests(): Promise<RegRequest[]> {
  const res = await api.get<RegRequest[]>('attendance/regularization/');
  const data = res.data;
  return Array.isArray(data) ? data : [];
}

export async function createRegularizationRequest(body: CreateRegRequestBody): Promise<RegRequest> {
  const res = await api.post<RegRequest>('attendance/regularization/', body);
  return res.data;
}
