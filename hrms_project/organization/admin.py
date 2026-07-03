from django.contrib import admin

from .models import BusinessUnit, Department, SubDepartment, WorkLocation, EmployeeOrganization, WeeklyOffPolicy

# Register your models here.
@admin.register(BusinessUnit)
class BusinessUnitAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'is_active')
    search_fields = ('name',)
    list_filter = ('is_active',)

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'business_unit')
    search_fields = ('name', 'business_unit__name')
    list_filter = ('business_unit',)
    
@admin.register(SubDepartment)
class SubDepartmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'department')
    search_fields = ('name', 'department__name')
    list_filter = ('department',)
    
@admin.register(WorkLocation)
class WorkLocationAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'city')
    search_fields = ('name', 'city')
    list_filter = ('city',)

@admin.register(EmployeeOrganization)
class EmployeeOrganizationAdmin(admin.ModelAdmin):      
    list_display = ('id', 'employee', 'business_unit', 'department', 'sub_department', 'work_location')
    search_fields = ('employee__display_name', 'business_unit__name', 'department__name', 'sub_department__name', 'work_location__name')
    list_filter = ('business_unit', 'department', 'sub_department', 'work_location')
    

@admin.register(WeeklyOffPolicy)
class WeeklyOffPolicyAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'is_active')
    search_fields = ('name', )
    list_filter = ('is_active', )