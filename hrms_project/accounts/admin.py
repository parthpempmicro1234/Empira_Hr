from django.contrib import admin

from accounts.models import Country, Employee, User, Address, State, City, IdentityInformation, Zipcode

# Register your models here.
@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('id', 'employee_code', 'display_name', 'job_title_primary', 'work_email', 'date_of_joining', 'is_active')
    search_fields = ('employee_code', 'display_name', 'job_title_primary', 'work_email')
    list_filter = ('job_title_primary', 'date_of_joining', 'is_active')

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'work_email', 'role', 'is_active')
    search_fields = ('work_email', 'role')
    list_filter = ('role', 'is_active')

@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('id', 'employee', 'address_type', 'city', 'state', 'country')
    search_fields = ('employee__display_name', 'city__name', 'state__name', 'country__name')
    list_filter = ('address_type', 'city', 'state', 'country')

@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'code')
    search_fields = ('name', 'code')
    
@admin.register(State)
class StateAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'code', 'country')
    search_fields = ('name', 'code', 'country__name')
    list_filter = ('country',)
    
@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'state')
    search_fields = ('name', 'state__name')
    list_filter = ('state',)
    
@admin.register(Zipcode)
class ZipcodeAdmin(admin.ModelAdmin):
    list_display = ('id','code', 'city')

@admin.register(IdentityInformation)
class IdentityInformationAdmin(admin.ModelAdmin):
    list_display = ('id', 'employee', 'identity_type', 'is_verified')
    search_fields = ('employee__display_name', 'identity_type')
    list_filter = ('identity_type',)