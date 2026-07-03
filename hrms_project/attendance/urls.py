from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AttendanceViewSet, MyWeekOffDaysViewSet, AttendanceStatsView
from .hr_views import (
    AttendancePolicyViewSet,
    ShiftViewSet,
    EmployeeShiftAssignmentViewSet,
    AttendanceRegularizationViewSet,
    OvertimeRequestViewSet,
    MyPolicyView,
    MyShiftView,
    AttendanceSummaryReportView,
)

router = DefaultRouter()
router.register(r'employee', AttendanceViewSet, basename='attendance')
router.register(r'myweekoff', MyWeekOffDaysViewSet, basename='myweekoffdays')
router.register(r'policies', AttendancePolicyViewSet, basename='attendance-policies')
router.register(r'shifts', ShiftViewSet, basename='attendance-shifts')
router.register(r'shift-assignments', EmployeeShiftAssignmentViewSet, basename='shift-assignments')
router.register(r'regularization', AttendanceRegularizationViewSet, basename='attendance-regularization')
router.register(r'overtime-requests', OvertimeRequestViewSet, basename='overtime-requests')

urlpatterns = [
    path('stats/', AttendanceStatsView.as_view(), name='attendance-stats'),
    path('my-policy/', MyPolicyView.as_view(), name='my-attendance-policy'),
    path('my-shift/', MyShiftView.as_view(), name='my-shift'),
    path('reports/summary/', AttendanceSummaryReportView.as_view(), name='attendance-summary-report'),
] + router.urls
