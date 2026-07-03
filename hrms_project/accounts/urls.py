from .views import PublicSortProfileViewSet, EmployeeCreateView, EmployeeViewSet, DeshbordViewSet, PublicProfileHeaderViewSet, WelcomeScreenAPIView, EmployeeProfileView, EmployeeJobViewSet, EmployeeTimelineView
from django.urls import path
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'employees/public/profileheader', PublicProfileHeaderViewSet, basename='public-profile-header')
router.register(r'employees/profile/job', EmployeeJobViewSet, basename='employee-profile')
router.register(r'employees/profile/timeline', EmployeeTimelineView, basename='employee-timeline')
router.register(r'employee/dashbord', DeshbordViewSet, basename='dashbord')
router.register(r'employee/sortprofile', PublicSortProfileViewSet, basename='sortprofile')

urlpatterns = [
    path('employees/create/', EmployeeCreateView.as_view(), name='employee-create'),
    path('welcomescreen/details/', WelcomeScreenAPIView.as_view(), name='welcome-screen'),
    path('employees/profile/', EmployeeProfileView.as_view(), name='employee-profile'),
    path('employees/profile/<int:id>/', EmployeeProfileView.as_view()), 
] + router.urls 
