from django.core.management.base import BaseCommand
from userauths.models import Role, Permission, RolePermission


class Command(BaseCommand):
    help = 'Initialize roles and permissions for the National EHR system'

    def handle(self, *args, **kwargs):
        self.stdout.write('Initializing roles and permissions...')
        
        # Create all permissions first
        permissions_data = [
            ('view_patients', 'View Patients'),
            ('add_patients', 'Add Patients'),
            ('edit_patients', 'Edit Patients'),
            ('delete_patients', 'Delete Patients'),
            ('view_medical_records', 'View Medical Records'),
            ('add_medical_records', 'Add Medical Records'),
            ('edit_medical_records', 'Edit Medical Records'),
            ('view_appointments', 'View Appointments'),
            ('manage_appointments', 'Manage Appointments'),
            ('view_prescriptions', 'View Prescriptions'),
            ('create_prescriptions', 'Create Prescriptions'),
            ('view_lab_results', 'View Lab Results'),
            ('manage_lab_results', 'Manage Lab Results'),
            ('view_users', 'View Users'),
            ('manage_users', 'Manage Users'),
            ('view_reports', 'View Reports'),
            ('manage_billing', 'Manage Billing'),
        ]
        
        for perm_name, perm_display in permissions_data:
            permission, created = Permission.objects.get_or_create(
                name=perm_name,
                defaults={'description': perm_display}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created permission: {perm_display}'))
        
        # Create roles
        roles_data = [
            ('admin', 'System Administrator - Full access to all features'),
            ('doctor', 'Medical Doctor - Can view and manage patient records, prescriptions'),
            ('nurse', 'Nurse - Can view patient records and assist with care'),
            ('receptionist', 'Receptionist - Can manage appointments and patient registration'),
            ('lab_technician', 'Lab Technician - Can manage lab results'),
            ('pharmacist', 'Pharmacist - Can view and manage prescriptions'),
            ('patient', 'Patient - Can view own medical records'),
        ]
        
        for role_name, role_desc in roles_data:
            role, created = Role.objects.get_or_create(
                name=role_name,
                defaults={'description': role_desc}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created role: {role_name}'))
        
        # Assign permissions to roles
        role_permissions = {
            'admin': [
                'view_patients', 'add_patients', 'edit_patients', 'delete_patients',
                'view_medical_records', 'add_medical_records', 'edit_medical_records',
                'view_appointments', 'manage_appointments',
                'view_prescriptions', 'create_prescriptions',
                'view_lab_results', 'manage_lab_results',
                'view_users', 'manage_users',
                'view_reports', 'manage_billing'
            ],
            'doctor': [
                'view_patients', 'add_patients', 'edit_patients',
                'view_medical_records', 'add_medical_records', 'edit_medical_records',
                'view_appointments', 'manage_appointments',
                'view_prescriptions', 'create_prescriptions',
                'view_lab_results', 'view_reports'
            ],
            'nurse': [
                'view_patients', 'view_medical_records', 'add_medical_records',
                'view_appointments', 'view_prescriptions', 'view_lab_results'
            ],
            'receptionist': [
                'view_patients', 'add_patients', 'edit_patients',
                'view_appointments', 'manage_appointments', 'manage_billing'
            ],
            'lab_technician': [
                'view_patients', 'view_medical_records',
                'view_lab_results', 'manage_lab_results'
            ],
            'pharmacist': [
                'view_patients', 'view_prescriptions', 'view_medical_records'
            ],
            'patient': [
                'view_medical_records', 'view_appointments', 
                'view_prescriptions', 'view_lab_results'
            ],
        }
        
        for role_name, perm_names in role_permissions.items():
            try:
                role = Role.objects.get(name=role_name)
                for perm_name in perm_names:
                    try:
                        permission = Permission.objects.get(name=perm_name)
                        RolePermission.objects.get_or_create(
                            role=role,
                            permission=permission
                        )
                    except Permission.DoesNotExist:
                        self.stdout.write(self.style.WARNING(f'Permission not found: {perm_name}'))
                
                self.stdout.write(self.style.SUCCESS(f'Assigned permissions to role: {role_name}'))
            except Role.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Role not found: {role_name}'))
        
        self.stdout.write(self.style.SUCCESS('Successfully initialized all roles and permissions!'))
