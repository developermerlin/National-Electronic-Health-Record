from django.contrib import admin
from userauths.models import User, Profile, Role, Permission, RolePermission, Region, District, Chiefdom, Town, Hospital, Department, Patient, Appointment, Message

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
    list_display = ['name', 'code', 'hospital_type', 'ownership_type', 'level_of_care', 'district', 'operational_status', 'approval_status', 'is_active']
    search_fields = ['name', 'code', 'facility_code', 'town_city', 'license_number']
    list_filter = ['hospital_type', 'ownership_type', 'level_of_care', 'operational_status', 'approval_status', 'district__region', 'is_active']
    readonly_fields = ['code', 'date_registered', 'created_at', 'updated_at']
    fieldsets = (
        ('Basic Facility Information', {
            'fields': ('name', 'code', 'facility_code', 'hospital_type', 'ownership_type', 'level_of_care', 'operational_status', 'date_registered')
        }),
        ('Location', {
            'fields': ('country', 'district', 'chiefdom_ward', 'town_city', 'address', 'latitude', 'longitude')
        }),
        ('Contact', {
            'fields': ('phone', 'secondary_phone', 'email', 'website', 'emergency_contact_line')
        }),
        ('Administration', {
            'fields': ('hospital_admin_name', 'admin_user', 'medical_superintendent', 'facility_manager', 'license_number', 'license_expiry_date')
        }),
        ('Services & Capacity', {
            'fields': ('bed_capacity', 'emergency_services', 'laboratory_available', 'pharmacy_available', 'radiology_available', 'maternity_services', 'surgery_services', 'outpatient_services', 'inpatient_services', 'ambulance_available')
        }),
        ('System Configuration', {
            'fields': ('facility_timezone', 'working_hours', 'patient_id_prefix', 'allow_external_access', 'data_sharing_consent'),
            'classes': ('collapse',)
        }),
        ('Reporting & Government Data', {
            'fields': ('reporting_facility_code', 'dhis2_code', 'catchment_population', 'referral_level', 'supervising_authority'),
            'classes': ('collapse',)
        }),
        ('Audit', {
            'fields': ('is_active', 'created_by', 'created_at', 'last_updated_by', 'updated_at', 'approval_status', 'approved_by')
        }),
    )

class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'department_code', 'hospital', 'head_of_department', 'status', 'is_active']
    search_fields = ['hospital__name', 'department_code']
    list_filter = ['name', 'status', 'is_active']
    readonly_fields = ['department_code']

class ChiefdomAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'district', 'is_active', 'created_at']
    search_fields = ['name', 'code']
    list_filter = ['district', 'district__region', 'is_active']

class TownAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'district', 'chiefdom', 'is_active', 'created_at']
    search_fields = ['name', 'code']
    list_filter = ['district', 'chiefdom', 'district__region', 'is_active']

class PatientAdmin(admin.ModelAdmin):
    list_display = ['patient_id', 'first_name', 'last_name', 'gender', 'phone', 'hospital', 'status', 'created_at']
    search_fields = ['patient_id', 'first_name', 'last_name', 'phone', 'national_id', 'insurance_number']
    list_filter = ['gender', 'blood_type', 'status', 'hospital', 'created_at']
    readonly_fields = ['patient_id']

class AppointmentAdmin(admin.ModelAdmin):
    list_display = ['patient', 'doctor', 'hospital', 'scheduled_at', 'status', 'priority', 'created_at']
    search_fields = ['patient__first_name', 'patient__last_name', 'doctor__full_name', 'patient__patient_id']
    list_filter = ['status', 'priority', 'hospital', 'scheduled_at']
    readonly_fields = ['created_at', 'updated_at']

class MessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'recipient', 'subject', 'is_read', 'created_at']
    search_fields = ['sender__full_name', 'recipient__full_name', 'subject', 'body']
    list_filter = ['is_read', 'created_at']

admin.site.register(User, UserAdmin)
admin.site.register(Profile, ProfileAdmin)
admin.site.register(Role, RoleAdmin)
admin.site.register(Permission, PermissionAdmin)
admin.site.register(RolePermission, RolePermissionAdmin)
admin.site.register(Region, RegionAdmin)
admin.site.register(District, DistrictAdmin)
admin.site.register(Chiefdom, ChiefdomAdmin)
admin.site.register(Town, TownAdmin)
admin.site.register(Hospital, HospitalAdmin)
admin.site.register(Department, DepartmentAdmin)
admin.site.register(Patient, PatientAdmin)
admin.site.register(Appointment, AppointmentAdmin)
admin.site.register(Message, MessageAdmin)