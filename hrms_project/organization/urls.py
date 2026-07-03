from rest_framework.routers import DefaultRouter
from .views import BusinessUnitViewSet, LeaveDaysViewSet, FeedPostViewSet, DepartmentOrgTreeView, DepartmentViewSet, EmployeeOrganizationDirectoryViewSet, EmployeeReporteesView, MyOrgTreeView, OrgTreeView, SubDepartmentViewSet, WorkLocationViewSet
from django.urls import path, include

router = DefaultRouter()
router.register(r'business-units', BusinessUnitViewSet, basename='businessunit')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'sub-departments', SubDepartmentViewSet, basename='subdepartment')
router.register(r'work-locations', WorkLocationViewSet, basename='worklocation')
router.register(r'holidays', LeaveDaysViewSet, basename='company-holiday')
router.register(r'feed', FeedPostViewSet, basename='company-feed')

urlpatterns = [
    path('employees/directory/', EmployeeOrganizationDirectoryViewSet.as_view(), name='employee-directory'),
    path('orgtree/reporttrees/<int:id>/', EmployeeReporteesView.as_view()),
    path('orgtree/reporttrees/', EmployeeReporteesView.as_view()),
    path('orgtree/', OrgTreeView.as_view()),
    path('orgtree/employee/', MyOrgTreeView.as_view()),
    path('orgtree/employee/<int:id>/', MyOrgTreeView.as_view()),
    path('orgtree/department/', DepartmentOrgTreeView.as_view()),
] + router.urls