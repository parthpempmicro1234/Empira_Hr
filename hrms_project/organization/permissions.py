from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsAdminOrHR(BasePermission):
    def has_permission(self, request, view):
        return request.user.role in ['admin', 'hr']


class IsAdminOnly(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'admin'


class ReadOnlyForEmployee(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user.role in ['admin', 'hr', 'employee']
        return request.user.role in ['admin', 'hr']