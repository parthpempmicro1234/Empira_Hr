from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import LeaveViewSet, LeaveBalanceViewSet, LeaveSummaryDashboardView

router = DefaultRouter()
router.register(r'employeeleaves', LeaveViewSet, basename='leave')
router.register(r'leave-balances', LeaveBalanceViewSet, basename='leave-balance')

urlpatterns = [
    path('myleaves/summary/', LeaveSummaryDashboardView.as_view(), name='leave-summary'),
] + router.urls

