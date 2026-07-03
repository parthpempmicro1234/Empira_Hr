from django.contrib import admin
from .models import (
    AttendanceDay,
    AttendanceSession,
    AttendancePolicy,
    Shift,
    EmployeeShiftAssignment,
    AttendanceRegularization,
    OvertimeRequest,
)


@admin.register(AttendanceDay)
class AttendanceDayAdmin(admin.ModelAdmin):
    list_display = ['id', 'employee', 'date', 'status', 'arrival_status', 'is_locked']
    list_filter = ['status', 'is_locked', 'arrival_status']
    date_hierarchy = 'date'


@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'employee', 'attendance_day', 'is_active', 'work_mode']
    list_filter = ['attendance_day', 'is_active', 'work_mode']


@admin.register(AttendancePolicy)
class AttendancePolicyAdmin(admin.ModelAdmin):
    list_display = ['name', 'business_unit', 'is_active']
    list_filter = ['is_active', 'business_unit']


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ['name', 'business_unit', 'start_time', 'end_time', 'is_active']
    list_filter = ['is_active', 'business_unit']


@admin.register(EmployeeShiftAssignment)
class EmployeeShiftAssignmentAdmin(admin.ModelAdmin):
    list_display = ['employee', 'shift', 'effective_from', 'effective_to', 'is_active']


@admin.register(AttendanceRegularization)
class AttendanceRegularizationAdmin(admin.ModelAdmin):
    list_display = ['employee', 'date', 'request_type', 'status']
    list_filter = ['status', 'request_type']


@admin.register(OvertimeRequest)
class OvertimeRequestAdmin(admin.ModelAdmin):
    list_display = ['employee', 'date', 'requested_minutes', 'approved_minutes', 'status']
    list_filter = ['status']
