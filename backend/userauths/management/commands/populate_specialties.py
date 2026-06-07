"""
Management command to populate default medical specialties
Usage: python manage.py populate_specialties
"""

from django.core.management.base import BaseCommand
from userauths.models import MedicalSpecialty


class Command(BaseCommand):
    help = 'Populate default medical specialties'

    def handle(self, *args, **options):
        specialties_data = [
            # General Medicine
            {'name': 'General Medicine', 'category': 'general_medicine', 'description': 'General medical practice and primary care'},
            {'name': 'General Physician', 'category': 'general_medicine', 'description': 'General medical consultation and treatment'},
            {'name': 'Internal Medicine', 'category': 'general_medicine', 'description': 'Diagnosis and treatment of adult diseases'},
            {'name': 'Cardiology', 'category': 'general_medicine', 'description': 'Heart and cardiovascular system disorders'},
            {'name': 'Endocrinology', 'category': 'general_medicine', 'description': 'Hormonal and metabolic disorders'},
            {'name': 'Gastroenterology', 'category': 'general_medicine', 'description': 'Digestive system and liver disorders'},
            {'name': 'Nephrology', 'category': 'general_medicine', 'description': 'Kidney diseases and disorders'},
            {'name': 'Pulmonology', 'category': 'general_medicine', 'description': 'Respiratory system and lung disorders'},
            {'name': 'Neurology', 'category': 'general_medicine', 'description': 'Nervous system disorders'},
            {'name': 'Rheumatology', 'category': 'general_medicine', 'description': 'Autoimmune and musculoskeletal disorders'},
            {'name': 'Infectious Disease', 'category': 'general_medicine', 'description': 'Infectious and communicable diseases'},
            {'name': 'Oncology', 'category': 'general_medicine', 'description': 'Cancer diagnosis and treatment'},
            {'name': 'Dermatology', 'category': 'general_medicine', 'description': 'Skin, hair, and nail disorders'},
            {'name': 'Geriatrics', 'category': 'general_medicine', 'description': 'Healthcare for elderly patients'},
            
            # Surgery
            {'name': 'General Surgery', 'category': 'surgery', 'description': 'General surgical procedures'},
            {'name': 'Orthopedic Surgery', 'category': 'surgery', 'description': 'Musculoskeletal system surgery'},
            {'name': 'Neurosurgery', 'category': 'surgery', 'description': 'Brain and nervous system surgery'},
            {'name': 'Cardiothoracic Surgery', 'category': 'surgery', 'description': 'Heart and chest surgery'},
            {'name': 'Plastic Surgery', 'category': 'surgery', 'description': 'Reconstructive and cosmetic surgery'},
            {'name': 'Urology', 'category': 'surgery', 'description': 'Urinary tract and male reproductive system'},
            {'name': 'Pediatric Surgery', 'category': 'surgery', 'description': 'Surgical procedures for children'},
            {'name': 'Vascular Surgery', 'category': 'surgery', 'description': 'Blood vessel surgery'},
            {'name': 'ENT Surgery', 'category': 'surgery', 'description': 'Ear, nose, and throat surgery'},
            {'name': 'Ophthalmic Surgery', 'category': 'surgery', 'description': 'Eye surgery and procedures'},
            {'name': 'Trauma Surgery', 'category': 'surgery', 'description': 'Emergency and trauma surgical care'},
            
            # Obstetrics and Gynecology
            {'name': 'Obstetrics', 'category': 'obstetrics_gynecology', 'description': 'Pregnancy and childbirth care'},
            {'name': 'Gynecology', 'category': 'obstetrics_gynecology', 'description': 'Female reproductive health'},
            {'name': 'Maternal-Fetal Medicine', 'category': 'obstetrics_gynecology', 'description': 'High-risk pregnancy management'},
            {'name': 'Reproductive Medicine', 'category': 'obstetrics_gynecology', 'description': 'Reproductive health and fertility'},
            {'name': 'Fertility Specialist', 'category': 'obstetrics_gynecology', 'description': 'Infertility diagnosis and treatment'},
            {'name': 'Gynecologic Oncology', 'category': 'obstetrics_gynecology', 'description': 'Female reproductive system cancers'},
            {'name': 'Urogynecology', 'category': 'obstetrics_gynecology', 'description': 'Pelvic floor disorders'},
            
            # Pediatrics
            {'name': 'General Pediatrics', 'category': 'pediatrics', 'description': 'General child healthcare'},
            {'name': 'Neonatology', 'category': 'pediatrics', 'description': 'Newborn and premature infant care'},
            {'name': 'Pediatric Cardiology', 'category': 'pediatrics', 'description': 'Heart conditions in children'},
            {'name': 'Pediatric Neurology', 'category': 'pediatrics', 'description': 'Nervous system disorders in children'},
            {'name': 'Pediatric Oncology', 'category': 'pediatrics', 'description': 'Childhood cancers'},
            {'name': 'Pediatric Endocrinology', 'category': 'pediatrics', 'description': 'Hormonal disorders in children'},
            {'name': 'Pediatric Nephrology', 'category': 'pediatrics', 'description': 'Kidney disorders in children'},
            {'name': 'Pediatric Gastroenterology', 'category': 'pediatrics', 'description': 'Digestive disorders in children'},
            {'name': 'Pediatric Pulmonology', 'category': 'pediatrics', 'description': 'Respiratory disorders in children'},
            {'name': 'Pediatric Intensive Care', 'category': 'pediatrics', 'description': 'Critical care for children'},
            
            # Other Clinical Specialties
            {'name': 'Emergency Medicine', 'category': 'other_clinical', 'description': 'Emergency and acute care'},
            {'name': 'Family Medicine', 'category': 'other_clinical', 'description': 'Comprehensive family healthcare'},
            {'name': 'Psychiatry', 'category': 'other_clinical', 'description': 'Mental health and psychiatric disorders'},
            {'name': 'Radiology', 'category': 'other_clinical', 'description': 'Medical imaging and diagnostics'},
            {'name': 'Anesthesiology', 'category': 'other_clinical', 'description': 'Anesthesia and pain management'},
            {'name': 'Pathology', 'category': 'other_clinical', 'description': 'Disease diagnosis through laboratory analysis'},
            {'name': 'Physical Medicine and Rehabilitation', 'category': 'other_clinical', 'description': 'Physical therapy and rehabilitation'},
            {'name': 'Occupational Medicine', 'category': 'other_clinical', 'description': 'Workplace health and safety'},
            {'name': 'Public Health Medicine', 'category': 'other_clinical', 'description': 'Community and population health'},
        ]

        created_count = 0
        updated_count = 0
        skipped_count = 0

        for spec_data in specialties_data:
            specialty, created = MedicalSpecialty.objects.get_or_create(
                name=spec_data['name'],
                defaults={
                    'category': spec_data['category'],
                    'description': spec_data['description'],
                    'is_active': True
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ Created: {specialty.name}'))
            else:
                # Update existing specialty
                specialty.category = spec_data['category']
                specialty.description = spec_data['description']
                specialty.save()
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'↻ Updated: {specialty.name}'))

        self.stdout.write(self.style.SUCCESS(f'\n✅ Specialty population complete!'))
        self.stdout.write(self.style.SUCCESS(f'   Created: {created_count}'))
        self.stdout.write(self.style.SUCCESS(f'   Updated: {updated_count}'))
        self.stdout.write(self.style.SUCCESS(f'   Total: {created_count + updated_count}'))
