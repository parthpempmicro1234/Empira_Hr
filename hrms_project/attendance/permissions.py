from rest_framework.permissions import BasePermission

from leave.permissions import IsHRorAdmin


class IsHRorAdminForAttendance(IsHRorAdmin):
    pass


class IsOwnerOrHR(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role in ('hr', 'admin'):
            return True
        employee = getattr(request.user, 'employee', None)
        return employee and obj.employee_id == employee.id
