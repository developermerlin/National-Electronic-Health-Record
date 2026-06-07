"""
Management command to initialize all department categories and their sub-units
for a comprehensive hospital management system.

Usage: python manage.py init_departments_units
"""

from django.core.management.base import BaseCommand
from userauths.models import DepartmentCategory, DepartmentUnit


class Command(BaseCommand):
    help = 'Initialize department categories and their sub-units'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING('Initializing Department Categories and Units...'))
        
        # Define all departments and their sub-units
        departments_data = {
            'surgery': {
                'display_name': 'Surgery Department',
                'description': 'Comprehensive surgical services including general, orthopedic, and specialized surgeries',
                'units': [
                    'General Surgery',
                    'Orthopedic Surgery',
                    'Neurosurgery',
                    'Cardiothoracic Surgery',
                    'Plastic & Reconstructive Surgery',
                    'Urology',
                    'Vascular Surgery',
                    'Pediatric Surgery',
                    'Trauma Surgery',
                    'Laparoscopic Surgery',
                    'Surgical Outpatient Clinic',
                    'Pre-Operative Unit',
                    'Post-Operative Unit',
                    'Operating Theatre',
                ]
            },
            'icu': {
                'display_name': 'ICU Department',
                'description': 'Intensive Care Units for critical patient care',
                'units': [
                    'General ICU',
                    'Medical ICU (MICU)',
                    'Surgical ICU (SICU)',
                    'Cardiac ICU (CICU)',
                    'Pediatric ICU (PICU)',
                    'Neonatal ICU (NICU)',
                    'High Dependency Unit (HDU)',
                    'Critical Care Monitoring Unit',
                ]
            },
            'laboratory': {
                'display_name': 'Laboratory Department',
                'description': 'Comprehensive diagnostic laboratory services',
                'units': [
                    'Hematology Laboratory',
                    'Clinical Chemistry Laboratory',
                    'Microbiology Laboratory',
                    'Parasitology Laboratory',
                    'Immunology Laboratory',
                    'Serology Laboratory',
                    'Histopathology Laboratory',
                    'Cytology Laboratory',
                    'Blood Bank / Transfusion Services',
                    'Molecular Diagnostics Laboratory',
                ]
            },
            'radiology': {
                'display_name': 'Radiology Department',
                'description': 'Medical imaging and diagnostic radiology services',
                'units': [
                    'X-Ray Unit',
                    'Ultrasound Unit',
                    'CT Scan Unit',
                    'MRI Unit',
                    'Mammography Unit',
                    'Fluoroscopy Unit',
                    'Interventional Radiology Unit',
                    'Nuclear Medicine Unit',
                ]
            },
            'medical': {
                'display_name': 'Medical Department (General Medicine)',
                'description': 'General medicine and specialized medical services',
                'units': [
                    'Internal Medicine',
                    'Cardiology',
                    'Neurology',
                    'Gastroenterology',
                    'Nephrology',
                    'Pulmonology',
                    'Endocrinology',
                    'Rheumatology',
                    'Dermatology',
                    'Infectious Diseases',
                    'Oncology',
                    'Geriatrics',
                    'Family Medicine',
                ]
            },
            'dental': {
                'display_name': 'Dental Department',
                'description': 'Comprehensive dental and oral health services',
                'units': [
                    'General Dentistry',
                    'Oral Surgery',
                    'Orthodontics',
                    'Prosthodontics',
                    'Periodontics',
                    'Endodontics',
                    'Pediatric Dentistry',
                    'Oral Medicine',
                    'Oral Radiology',
                ]
            },
            'physiotherapy': {
                'display_name': 'Physiotherapy Department',
                'description': 'Physical therapy and rehabilitation services',
                'units': [
                    'Orthopedic Physiotherapy',
                    'Neurological Physiotherapy',
                    'Pediatric Physiotherapy',
                    'Sports Physiotherapy',
                    'Cardiopulmonary Physiotherapy',
                    'Geriatric Physiotherapy',
                    'Rehabilitation Unit',
                    'Occupational Therapy Unit',
                ]
            },
            'ophthalmology': {
                'display_name': 'Ophthalmology Department',
                'description': 'Eye care and vision services',
                'units': [
                    'General Eye Clinic',
                    'Cataract Unit',
                    'Glaucoma Unit',
                    'Retina Unit',
                    'Cornea Unit',
                    'Pediatric Ophthalmology',
                    'Oculoplastic Surgery',
                    'Refraction & Optical Services',
                    'Low Vision Clinic',
                ]
            },
            'ent': {
                'display_name': 'ENT Department',
                'description': 'Ear, Nose, and Throat services',
                'units': [
                    'General ENT Clinic',
                    'Otology (Ear Disorders)',
                    'Rhinology (Nose Disorders)',
                    'Laryngology (Throat Disorders)',
                    'Audiology Unit',
                    'Speech Therapy Unit',
                    'Head & Neck Surgery',
                    'Pediatric ENT',
                ]
            },
            'psychiatry': {
                'display_name': 'Psychiatry Department',
                'description': 'Mental health and psychiatric services',
                'units': [
                    'General Psychiatry',
                    'Child & Adolescent Psychiatry',
                    'Adult Psychiatry',
                    'Geriatric Psychiatry',
                    'Addiction Medicine',
                    'Clinical Psychology',
                    'Counseling Services',
                    'Psychiatric Rehabilitation',
                    'Community Mental Health',
                ]
            },
            'ipd': {
                'display_name': 'In-Patient Department (IPD)',
                'description': 'In-patient wards and admission services',
                'units': [
                    'Male Medical Ward',
                    'Female Medical Ward',
                    'Surgical Ward',
                    'Pediatric Ward',
                    'Maternity Ward',
                    'Private Ward',
                    'ICU Ward',
                    'Isolation Ward',
                    'High Dependency Unit (HDU)',
                ]
            },
            'opd': {
                'display_name': 'Out-Patient Department (OPD)',
                'description': 'Out-patient consultation and follow-up services',
                'units': [
                    'General OPD',
                    'Specialist OPD',
                    'Medical OPD',
                    'Surgical OPD',
                    'Pediatric OPD',
                    'ENT OPD',
                    'Eye Clinic OPD',
                    'Dental OPD',
                    'Physiotherapy OPD',
                    'Psychiatry OPD',
                    'Follow-Up Clinic',
                ]
            },
            'pediatrics': {
                'display_name': 'Pediatrics Department',
                'description': 'Comprehensive child health services',
                'units': [
                    'General Pediatrics',
                    'Neonatology',
                    'Pediatric Cardiology',
                    'Pediatric Neurology',
                    'Pediatric Nephrology',
                    'Pediatric Oncology',
                    'Pediatric Endocrinology',
                    'Pediatric Gastroenterology',
                    'Pediatric Pulmonology',
                    'Pediatric Intensive Care Unit (PICU)',
                    'Child Development Clinic',
                    'Immunization Clinic',
                ]
            },
            'emergency': {
                'display_name': 'Emergency / Casualty',
                'description': 'Emergency and trauma services',
                'units': [
                    'Emergency Reception',
                    'Triage Unit',
                    'Trauma Bay',
                    'Resuscitation Room',
                    'Emergency Observation Unit',
                ]
            },
            'pharmacy': {
                'display_name': 'Pharmacy',
                'description': 'Pharmaceutical services and medication management',
                'units': [
                    'In-Patient Pharmacy',
                    'Out-Patient Pharmacy',
                    'Drug Store',
                    'Clinical Pharmacy',
                    'Pharmacy Dispensing Unit',
                ]
            },
            'maternity': {
                'display_name': 'Maternity / Obstetrics',
                'description': 'Maternal and obstetric care services',
                'units': [
                    'Antenatal Clinic',
                    'Labour Ward',
                    'Delivery Room',
                    'Postnatal Ward',
                    'High-Risk Pregnancy Unit',
                    'Family Planning Clinic',
                ]
            },
            'records': {
                'display_name': 'Medical Records',
                'description': 'Medical records and health information management',
                'units': [
                    'Records Filing',
                    'Records Retrieval',
                    'Health Information Management',
                    'Medical Coding',
                ]
            },
            'admin': {
                'display_name': 'Administration',
                'description': 'Hospital administration and management',
                'units': [
                    'Human Resources',
                    'Finance & Accounts',
                    'Procurement',
                    'IT Department',
                    'Facility Management',
                ]
            },
            'triage': {
                'display_name': 'Triage',
                'description': 'Patient assessment and prioritization',
                'units': [
                    'Emergency Triage',
                    'OPD Triage',
                    'Vital Signs Station',
                ]
            },
            'other': {
                'display_name': 'Other',
                'description': 'Other specialized services',
                'units': [
                    'Nutrition & Dietetics',
                    'Social Services',
                    'Chaplaincy Services',
                    'Mortuary',
                    'Laundry Services',
                    'Housekeeping',
                ]
            },
        }

        created_categories = 0
        created_units = 0
        updated_categories = 0

        for category_name, category_info in departments_data.items():
            # Create or update department category
            category, created = DepartmentCategory.objects.get_or_create(
                name=category_name,
                defaults={
                    'display_name': category_info['display_name'],
                    'description': category_info['description'],
                    'is_active': True,
                }
            )
            
            if created:
                created_categories += 1
                self.stdout.write(self.style.SUCCESS(f'✓ Created category: {category.get_name_display()}'))
            else:
                # Update existing category
                category.display_name = category_info['display_name']
                category.description = category_info['description']
                category.save()
                updated_categories += 1
                self.stdout.write(self.style.WARNING(f'⟳ Updated category: {category.get_name_display()}'))

            # Create units for this category
            for unit_name in category_info['units']:
                unit, unit_created = DepartmentUnit.objects.get_or_create(
                    category=category,
                    name=unit_name,
                    defaults={
                        'is_active': True,
                    }
                )
                
                if unit_created:
                    created_units += 1
                    self.stdout.write(self.style.SUCCESS(f'  ✓ Created unit: {unit_name}'))

        self.stdout.write(self.style.SUCCESS('\n' + '='*70))
        self.stdout.write(self.style.SUCCESS(f'Department Categories Created: {created_categories}'))
        self.stdout.write(self.style.WARNING(f'Department Categories Updated: {updated_categories}'))
        self.stdout.write(self.style.SUCCESS(f'Department Units Created: {created_units}'))
        self.stdout.write(self.style.SUCCESS('='*70))
        self.stdout.write(self.style.SUCCESS('\n✓ Department initialization complete!'))
