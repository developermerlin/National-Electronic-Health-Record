from django.contrib import admin
from userauths.models import User, Profile, Role, Permission, RolePermission, Region, District, Hospital, Department

class UserAdmin(admin.ModelAdmin):
    search_fields  = ['full_name', 'username', 'email',  'phone', 'employee_id']
    list_display  = ['username', 'email', 'phone', 'role', 'hospital', 'employee_id', 'is_active']
    list_filter = ['role', 'is_active', 'hospital', 'date_joined']

class ProfileAdmin(admin.ModelAdmin):
    search_fields  = ['user']
    list_display = ['user', 'full_name']

class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at']
    search_fields = ['name', 'description']

class PermissionAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']
    search_fields = ['name', 'description']

class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ['role', 'permission', 'created_at']
    list_filter = ['role', 'permission']
    search_fields = ['role__name', 'permission__name']

class RegionAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_active', 'created_at']
    search_fields = ['name', 'code']
    list_filter = ['is_active']

class DistrictAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'region', 'is_active', 'created_at']
    search_fields = ['name', 'code']
    list_filter = ['region', 'is_active']

class HospitalAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'hospital_type', 'district', 'is_active', 'created_at']
    search_fields = ['name', 'code']
    list_filter = ['hospital_type', 'district__region', 'is_active']

class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'hospital', 'head_of_department', 'is_active']
    search_fields = ['hospital__name']
    list_filter = ['name', 'is_active']


admin.site.register(User, UserAdmin)
admin.site.register(Profile, ProfileAdmin)
admin.site.register(Role, RoleAdmin)
admin.site.register(Permission, PermissionAdmin)
admin.site.register(RolePermission, RolePermissionAdmin)
admin.site.register(Region, RegionAdmin)
admin.site.register(District, DistrictAdmin)
admin.site.register(Hospital, HospitalAdmin)
admin.site.register(Department, DepartmentAdmin)