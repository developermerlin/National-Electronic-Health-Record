"""
Management command to set up default role-permission assignments.
Run with: python manage.py setup_permissions
"""

from django.core.management.base import BaseCommand
from userauths.models import Role, Permission, RolePermission


class Command(BaseCommand):
    help = 'Create permissions and assign default permissions to roles'

    def handle(self, *args, **options):
        self.create_permissions()
        self.assign_role_permissions()
        self.stdout.write(self.style.SUCCESS('Permissions setup completed successfully!'))

    def create_permissions(self):
        """Create all system permissions if they don't exist"""
        permissions_data = [
            # Patient permissions
            ('view_patients', 'View Patients'),
            ('add_patients', 'Add Patients'),
            ('edit_patients', 'Edit Patients'),
            ('delete_patients', 'Delete Patients'),
            
            # Medical records permissions
            ('view_medical_records', 'View Medical Records'),
            ('add_medical_records', 'Add Medical Records'),
            ('edit_medical_records', 'Edit Medical Records'),
            
            # Appointment permissions
            ('view_appointments', 'View Appointments'),
            ('manage_appointments', 'Manage Appointments'),
            
            # Prescription permissions
            ('view_prescriptions', 'View Prescriptions'),
            ('create_prescriptions', 'Create Prescriptions'),
            
            # Lab permissions
            ('view_lab_results', 'View Lab Results'),
            ('manage_lab_results', 'Manage Lab Results'),
            
            # User management permissions
            ('view_users', 'View Users'),
            ('manage_users', 'Manage Users'),
            
            # Administrative permissions
            ('view_reports', 'View Reports'),
            ('manage_billing', 'Manage Billing'),
            ('manage_hospitals', 'Manage Hospitals'),
            ('manage_districts', 'Manage Districts'),
            ('manage_regions', 'Manage Regions'),
            ('manage_departments', 'Manage Departments'),
            
            # Data scope permissions
            ('view_national_data', 'View National Data'),
            ('view_district_data', 'View District Data'),
            ('view_hospital_data', 'View Hospital Data'),
        ]
        
        for code, display in permissions_data:
            Permission.objects.get_or_create(name=code, defaults={'description': display})
            self.stdout.write(f'  Permission: {display}')
        
        self.stdout.write(self.style.SUCCESS(f'\nCreated/verified {len(permissions_data)} permissions'))

    def assign_role_permissions(self):
        """Assign default permissions to each role"""
        
        # Define role-permission mappings
        role_permissions = {
            'admin': [
                'view_patients', 'add_patients', 'edit_patients', 'delete_patients',
                'view_medical_records', 'add_medical_records', 'edit_medical_records',
                'view_appointments', 'manage_appointments',
                'view_prescriptions', 'create_prescriptions',
                'view_lab_results', 'manage_lab_results',
                'view_users', 'manage_users',
                'view_reports', 'manage_billing',
                'manage_hospitals', 'manage_districts', 'manage_regions', 'manage_departments',
                'view_national_data', 'view_district_data', 'view_hospital_data',
            ],
            'ministry_admin': [
                'view_national_data', 'view_district_data', 'view_hospital_data',
                'manage_regions', 'manage_districts', 'manage_hospitals',
                'view_reports', 'view_users', 'manage_users',
                'view_patients', 'view_medical_records',
            ],
            'district_admin': [
                'view_district_data', 'view_hospital_data',
                'view_patients', 'view_users', 'view_reports', 'view_medical_records',
            ],
            'hospital_admin': [
                'view_hospital_data', 'manage_departments', 'manage_users',
                'view_patients', 'add_patients', 'edit_patients',
                'view_medical_records', 'view_appointments', 'manage_appointments',
                'view_lab_results', 'view_prescriptions', 'view_reports',
            ],
            'doctor': [
                'view_patients', 'add_patients', 'edit_patients',
                'view_medical_records', 'add_medical_records', 'edit_medical_records',
                'view_appointments', 'manage_appointments',
                'view_prescriptions', 'create_prescriptions',
                'view_lab_results',
            ],
            'nurse': [
                'view_patients', 'edit_patients',
                'view_medical_records', 'add_medical_records',
                'view_appointments', 'manage_appointments',
                'view_lab_results',
            ],
            'receptionist': [
                'view_patients', 'add_patients', 'edit_patients',
                'view_appointments', 'manage_appointments',
            ],
            'lab_technician': [
                'view_patients', 'view_lab_results', 'manage_lab_results',
            ],
            'pharmacist': [
                'view_patients', 'view_prescriptions', 'create_prescriptions',
            ],
        }
        
        for role_name, perm_codes in role_permissions.items():
            try:
                role = Role.objects.get(name=role_name)
                for perm_code in perm_codes:
                    try:
                        permission = Permission.objects.get(name=perm_code)
                        RolePermission.objects.get_or_create(role=role, permission=permission)
                    except Permission.DoesNotExist:
                        self.stdout.write(self.style.WARNING(f'  Permission {perm_code} not found'))
                
                count = RolePermission.objects.filter(role=role).count()
                self.stdout.write(f'  {role.get_name_display()}: {count} permissions assigned')
            except Role.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'  Role {role_name} not found'))
