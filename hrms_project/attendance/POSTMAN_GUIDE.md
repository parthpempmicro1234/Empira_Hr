# Attendance API – Complete Postman Guide

Office policy: **flexible check-in 09:30–10:30**, office **10:00–19:30**, **8h 30m** effective work (break excluded), **1h lunch 13:00–14:00**, break between sessions **30–60 min**, **OT only after HR approval**.

---

## Base URLs

| Environment | Base |
|-------------|------|
| API root | `http://localhost:8000` |
| Attendance | `http://localhost:8000/attendance/` |
| Login | `http://localhost:8000/auth/login/` |

Replace host/port if your server differs.

---

## Common headers (all protected endpoints)

| Key | Value |
|-----|--------|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `application/json` |

In Postman: **Authorization** tab → Type **Bearer Token** → paste token from login.

---

## Step 0 – Login (get token)

### HR login

**POST** `http://localhost:8000/auth/login/`

**Headers**

```
Content-Type: application/json
```

**Body (raw JSON)**

```json
{
  "work_email": "hr@yourcompany.com",
  "password": "your_password"
}
```

**Response (example)** – copy `access` for HR requests:

```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "...",
  "role": "hr",
  "work_email": "hr@yourcompany.com",
  "user_id": 1
}
```

### Employee login

Same endpoint; use employee `work_email` / `password`. Copy `access` for employee requests.

---

## Step 1 – Run migrations (once, terminal)

```bash
python manage.py migrate attendance organization
```

---

## Step 2 – HR: Apply policy + shift (recommended – one call)

Creates **AttendancePolicy** + **Shift** + assigns shift to **all active employees** in HR’s business unit.  
**Do not send `business_unit`** – it is taken from the logged-in HR user’s org.

**POST** `http://localhost:8000/attendance/policies/setup-office-default/`

**Headers**

```
Authorization: Bearer <HR_ACCESS_TOKEN>
Content-Type: application/json
```

**Body (raw JSON)** – empty object is enough:

```json
{}
```

**Optional body** – link existing week-off policy by id:

```json
{
  "weekly_off_policy": 1
}
```

**Admin only** – must include BU id:

```json
{
  "business_unit": 1,
  "weekly_off_policy": 1
}
```

**What gets created**

| Item | Values |
|------|--------|
| Policy name | Office Default Policy |
| `full_day_minutes` | 510 (8h 30m) |
| `include_breaks_in_work_time` | false |
| `ot_requires_approval` | true |
| Shift | 10:00–19:30, flex 09:30–10:30 |
| Lunch | 13:00–14:00 |
| `break_min_minutes` / `break_max_minutes` | 30 / 60 |
| Assignments | All employees in HR BU |

**Success response (201)** – example shape:

```json
{
  "message": "Office default policy and shift created.",
  "business_unit_id": 1,
  "policy": { "id": 1, "name": "Office Default Policy", "full_day_minutes": 510, "ot_requires_approval": true, ... },
  "shift": { "id": 1, "name": "Office General Shift", "flex_check_in_start": "09:30:00", "flex_check_in_end": "10:30:00", ... },
  "employees_assigned": 25
}
```

---

## Step 2 (alternative) – HR: Manual policy + shift + assign

Use this if you prefer separate API calls instead of setup-office-default.

### 2A – Create attendance policy

**POST** `http://localhost:8000/attendance/policies/`

**Headers**

```
Authorization: Bearer <HR_ACCESS_TOKEN>
Content-Type: application/json
```

**Body** – HR must **omit** `business_unit` (auto-filled from HR profile). Admin must include `"business_unit": 1`.

```json
{
  "name": "Office Policy",
  "full_day_minutes": 510,
  "half_day_minutes": 255,
  "include_breaks_in_work_time": false,
  "late_grace_minutes": 0,
  "early_out_grace_minutes": 15,
  "round_punch_to_minutes": 0,
  "require_gps": true,
  "geofence_mode": "warn",
  "block_punch_on_leave": true,
  "block_punch_on_holiday": true,
  "block_punch_on_week_off": true,
  "ot_enabled": true,
  "ot_requires_approval": true,
  "ot_after_shift_minutes": 0,
  "ot_daily_cap_minutes": 240,
  "penalize_late": true,
  "penalize_short_hours": true,
  "penalize_absent": true,
  "late_penalty_action": "none",
  "short_hours_penalty_action": "half_day",
  "absent_penalty_action": "lop_flag",
  "is_active": true
}
```

**Optional** – link week-off policy:

```json
{
  "name": "Office Policy",
  "weekly_off_policy": 1,
  "full_day_minutes": 510,
  ...
}
```

Save response `id` as `policy_id`.

---

### 2B – Create shift

**POST** `http://localhost:8000/attendance/shifts/`

**Headers**

```
Authorization: Bearer <HR_ACCESS_TOKEN>
Content-Type: application/json
```

**Body** – no `business_unit` for HR:

```json
{
  "name": "Office General Shift",
  "code": "OFFICE-GEN",
  "start_time": "10:00:00",
  "end_time": "19:30:00",
  "is_flexible": true,
  "flex_check_in_start": "09:30:00",
  "flex_check_in_end": "10:30:00",
  "grace_in_minutes": 0,
  "grace_out_minutes": 15,
  "min_effective_minutes": 510,
  "break_rules": [
    {
      "start": "13:00",
      "end": "14:00"
    }
  ],
  "break_min_minutes": 30,
  "break_max_minutes": 60,
  "is_default": true,
  "is_active": true
}
```

Save response `id` as `shift_id` (e.g. `1`).

---

### 2C – Assign shift to all BU employees

**POST** `http://localhost:8000/attendance/shifts/1/assign-all-employees/`

Replace `1` with your `shift_id`.

**Headers**

```
Authorization: Bearer <HR_ACCESS_TOKEN>
Content-Type: application/json
```

**Body**

```json
{
  "effective_from": "2026-05-27"
}
```

Use today’s date in `YYYY-MM-DD`.

---

### 2D – Verify policy and shift (HR)

**GET** `http://localhost:8000/attendance/policies/`

**GET** `http://localhost:8000/attendance/shifts/`

**Headers**

```
Authorization: Bearer <HR_ACCESS_TOKEN>
```

No body.

---

## Step 3 – Employee: Verify policy & shift

**GET** `http://localhost:8000/attendance/my-policy/`

**GET** `http://localhost:8000/attendance/my-shift/`

**Headers**

```
Authorization: Bearer <EMPLOYEE_ACCESS_TOKEN>
```

No body.

---

## Step 4 – Employee: Check-in / Check-out

Ensure employee’s **WorkLocation** has `latitude`, `longitude`, `radius_meters` in admin/org API if using GPS warn/block.

### Check-in

**POST** `http://localhost:8000/attendance/employee/check-in/`

**Headers**

```
Authorization: Bearer <EMPLOYEE_ACCESS_TOKEN>
Content-Type: application/json
```

**Body**

```json
{
  "lat": 19.0760,
  "lng": 72.8777,
  "device": "mobile",
  "browser": "postman",
  "work_mode": "office"
}
```

| Time | Result |
|------|--------|
| Before 09:30 | `400` – too early |
| 09:30 – 10:30 | OK, `arrival_status`: on_time |
| After 10:30 | OK with `warnings`, marked **late** |

**Success (200)** – example:

```json
{
  "message": "Check-in successful",
  "AttandanceDay": {
    "status": "present",
    "arrival_status": "on_time",
    "overtime_minutes": 0,
    ...
  },
  "warnings": []
}
```

### Check-out

**POST** `http://localhost:8000/attendance/employee/check-out/`

**Headers**

```
Authorization: Bearer <EMPLOYEE_ACCESS_TOKEN>
Content-Type: application/json
```

**Body**

```json
{
  "lat": 19.0760,
  "lng": 72.8777
}
```

---

## Step 5 – Employee: View attendance

### List attendance days

**GET** `http://localhost:8000/attendance/employee/?fromDate=2026-05-01&toDate=2026-05-31`

**Headers**

```
Authorization: Bearer <EMPLOYEE_ACCESS_TOKEN>
```

### Timeline

**GET** `http://localhost:8000/attendance/employee/timeline/?fromDate=2026-05-01&toDate=2026-05-31`

**Headers**

```
Authorization: Bearer <EMPLOYEE_ACCESS_TOKEN>
```

### Stats

**GET** `http://localhost:8000/attendance/stats/?fromdate=2026-05-01&todate=2026-05-31`

**Headers**

```
Authorization: Bearer <EMPLOYEE_ACCESS_TOKEN>
```

### Week-off policy

**GET** `http://localhost:8000/attendance/myweekoff/`

**Headers**

```
Authorization: Bearer <EMPLOYEE_ACCESS_TOKEN>
```

---

## Step 6 – Overtime (only counted after HR approval)

### Employee – request OT

**POST** `http://localhost:8000/attendance/overtime-requests/`

**Headers**

```
Authorization: Bearer <EMPLOYEE_ACCESS_TOKEN>
Content-Type: application/json
```

**Body**

```json
{
  "date": "2026-05-27",
  "requested_minutes": 120,
  "reason": "Release deployment"
}
```

Do **not** send `employee` – set automatically.

### Employee – list own OT requests

**GET** `http://localhost:8000/attendance/overtime-requests/`

**Headers**

```
Authorization: Bearer <EMPLOYEE_ACCESS_TOKEN>
```

### HR – list pending OT (same BU)

**GET** `http://localhost:8000/attendance/overtime-requests/?status=pending`

**Headers**

```
Authorization: Bearer <HR_ACCESS_TOKEN>
```

### HR – approve OT

**POST** `http://localhost:8000/attendance/overtime-requests/1/approve/`

Replace `1` with request id.

**Headers**

```
Authorization: Bearer <HR_ACCESS_TOKEN>
Content-Type: application/json
```

**Body**

```json
{
  "approved_minutes": 90
}
```

Omit `approved_minutes` to approve full `requested_minutes`.

After approval, employee should **check-out again** (or wait for EOD job) so `overtime_minutes` updates on `AttendanceDay`.

### HR – reject OT

**POST** `http://localhost:8000/attendance/overtime-requests/1/reject/`

**Headers**

```
Authorization: Bearer <HR_ACCESS_TOKEN>
Content-Type: application/json
```

**Body**

```json
{
  "rejection_reason": "Not pre-approved by manager"
}
```

---

## Step 7 – Attendance regularization (correction requests)

### Employee – create request

**POST** `http://localhost:8000/attendance/regularization/`

**Headers**

```
Authorization: Bearer <EMPLOYEE_ACCESS_TOKEN>
Content-Type: application/json
```

**Body** – missed check-in example:

```json
{
  "date": "2026-05-27",
  "request_type": "missed_check_in",
  "requested_check_in": "2026-05-27T09:45:00+05:30",
  "requested_check_out": "2026-05-27T19:30:00+05:30",
  "reason": "Forgot to punch in the morning"
}
```

`request_type` options: `missed_check_in`, `missed_check_out`, `both`, `wrong_time`, `wfh_mark`

### HR – approve

**POST** `http://localhost:8000/attendance/regularization/1/approve/`

**Headers**

```
Authorization: Bearer <HR_ACCESS_TOKEN>
Content-Type: application/json
```

**Body**

```json
{}
```

### HR – reject

**POST** `http://localhost:8000/attendance/regularization/1/reject/`

**Headers**

```
Authorization: Bearer <HR_ACCESS_TOKEN>
Content-Type: application/json
```

**Body**

```json
{
  "rejection_reason": "Insufficient documentation"
}
```

---

## Step 8 – HR reports & shift assignments

### Monthly attendance summary

**GET** `http://localhost:8000/attendance/reports/summary/?year=2026&month=5`

**Headers**

```
Authorization: Bearer <HR_ACCESS_TOKEN>
```

### Assign shift to one employee

**POST** `http://localhost:8000/attendance/shift-assignments/`

**Headers**

```
Authorization: Bearer <HR_ACCESS_TOKEN>
Content-Type: application/json
```

**Body**

```json
{
  "employee": 5,
  "shift": 1,
  "effective_from": "2026-05-27",
  "effective_to": null,
  "is_active": true
}
```

### List shift assignments

**GET** `http://localhost:8000/attendance/shift-assignments/`

**Headers**

```
Authorization: Bearer <HR_ACCESS_TOKEN>
```

---

## Step 9 – HR update / delete policy or shift

### Update policy

**PUT** or **PATCH** `http://localhost:8000/attendance/policies/1/`

**Headers**

```
Authorization: Bearer <HR_ACCESS_TOKEN>
Content-Type: application/json
```

**Body (PATCH example)**

```json
{
  "ot_daily_cap_minutes": 180
}
```

### Update shift

**PATCH** `http://localhost:8000/attendance/shifts/1/`

**Headers**

```
Authorization: Bearer <HR_ACCESS_TOKEN>
Content-Type: application/json
```

**Body (PATCH example)**

```json
{
  "flex_check_in_end": "10:45:00"
}
```

### Delete policy / shift

**DELETE** `http://localhost:8000/attendance/policies/1/`  
**DELETE** `http://localhost:8000/attendance/shifts/1/`

**Headers**

```
Authorization: Bearer <HR_ACCESS_TOKEN>
```

---

## Quick test order (copy-paste checklist)

1. `POST /auth/login/` → HR token  
2. `POST /attendance/policies/setup-office-default/` → `{}`  
3. `POST /auth/login/` → Employee token  
4. `GET /attendance/my-shift/` → confirm 09:30–10:30 / 10:00–19:30  
5. `POST /attendance/employee/check-in/` → lat/lng body  
6. `POST /attendance/employee/check-out/` → lat/lng body  
7. `GET /attendance/employee/timeline/` → see status & minutes  
8. `POST /attendance/overtime-requests/` → employee  
9. `POST /attendance/overtime-requests/{id}/approve/` → HR  
10. `GET /attendance/reports/summary/?year=2026&month=5` → HR  

---

## Prerequisites checklist

- HR user has `EmployeeOrganization` with a `business_unit`.  
- Employees in same BU have `EmployeeOrganization` records.  
- For GPS: set `WorkLocation.latitude`, `longitude`, `radius_meters` on org work location.  
- Optional: create `WeeklyOffPolicy` and pass `weekly_off_policy` id in setup body.

---

## Common errors

| Status | Cause |
|--------|--------|
| `401` | Missing or expired Bearer token |
| `403` | Employee calling HR-only endpoint |
| `400` HR has no BU | HR not linked to `EmployeeOrganization.business_unit` |
| `400` check-in early | Before `flex_check_in_start` (09:30) |
| `400` holiday/week-off/leave | Policy blocks punch on that day |
| OT always 0 | `ot_requires_approval` true and no approved `overtime-requests` |
