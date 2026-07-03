from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsAdminUserRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.role == 'admin')

class IsHRRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.role == 'hr')

class IsEmployeeOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.employee.user == request.user
    
class IsHRorAdmin(BasePermission):

    message = "Employees are not authorized to perform this action."
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['hr', 'admin']
        )

class CanActOnLeaveRequest(BasePermission):

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
            
        if request.user.role == 'hr':
            target_employee_role = obj.employee.user.role
            
            if target_employee_role == 'admin':
                self.message = "HR cannot approve or reject Admin leaves."
                return False
                
            if target_employee_role == 'hr':
                self.message = "HR cannot approve or reject leaves for HR personnel."
                return False
                
            return True
            
        return False