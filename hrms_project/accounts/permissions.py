from rest_framework.permissions import BasePermission

class IsAdminOrHr(BasePermission):
    def has_permission(self, request, view):
        return request.user.role in ['admin', 'hr']
    
class IsAdminHRorSelf(BasePermission):

    def has_object_permission(self, request, view, obj):
        user = request.user

        if user.role in ['admin', 'hr']:
            return True

        return obj.user == user