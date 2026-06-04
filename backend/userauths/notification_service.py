"""
Enhanced Notification Service with Templates and Scheduling.
Supports SMS, Email, and In-App notifications with template management.
"""
import logging
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from .models import Notification, Patient, User, Appointment, LabTest, Invoice
from .sms_service import send_sms

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════
# SMS TEMPLATES
# ═══════════════════════════════════════════════════════════════

SMS_TEMPLATES = {
    # Appointment Templates
    'appointment_confirmation': (
        "[NEHR] Hi {patient_name}, your appointment with Dr. {doctor_name} "
        "at {hospital_name} is confirmed for {date} at {time}. "
        "Please arrive 15 mins early."
    ),
    'appointment_reminder_24h': (
        "[NEHR] Reminder: You have an appointment tomorrow at {time} "
        "with Dr. {doctor_name} at {hospital_name}. See you there!"
    ),
    'appointment_reminder_2h': (
        "[NEHR] Your appointment with Dr. {doctor_name} is in 2 hours ({time}). "
        "Please head to {hospital_name} soon."
    ),
    'appointment_cancelled': (
        "[NEHR] Hi {patient_name}, your appointment with Dr. {doctor_name} "
        "on {date} has been CANCELLED. Reason: {reason}. Please call to reschedule."
    ),
    'appointment_rescheduled': (
        "[NEHR] Your appointment has been rescheduled to {date} at {time} "
        "with Dr. {doctor_name} at {hospital_name}."
    ),
    
    # Lab Results Templates
    'lab_result_ready': (
        "[NEHR] Hi {patient_name}, your lab test results ({test_name}) are ready. "
        "Please login to your patient portal or visit {hospital_name} to collect them."
    ),
    'lab_result_critical': (
        "[URGENT] {patient_name}, your {test_name} result is CRITICAL. "
        "Please contact Dr. {doctor_name} or visit {hospital_name} IMMEDIATELY."
    ),
    
    # Prescription Templates
    'prescription_ready': (
        "[NEHR] Hi {patient_name}, your prescription is ready for pickup "
        "at {hospital_name} pharmacy. Pharmacy hours: 8AM-5PM Mon-Fri."
    ),
    'prescription_dispensed': (
        "[NEHR] Your prescription has been dispensed. "
        "Please follow the dosage instructions provided by the pharmacist."
    ),
    
    # Billing Templates
    'invoice_generated': (
        "[NEHR] Hi {patient_name}, your invoice ({invoice_number}) for Le {amount} "
        "has been generated. Please visit {hospital_name} to make payment."
    ),
    'payment_received': (
        "[NEHR] Thank you! We have received your payment of Le {amount}. "
        "Receipt: {receipt_number}. Balance: Le {balance}."
    ),
    'payment_reminder': (
        "[NEHR] Reminder: You have an outstanding balance of Le {amount} "
        "for invoice {invoice_number}. Please visit {hospital_name} to settle."
    ),
    
    # Admission Templates
    'admission_scheduled': (
        "[NEHR] Hi {patient_name}, your admission to {ward_name} at {hospital_name} "
        "is scheduled for {date}. Please arrive by {time}."
    ),
    'discharge_ready': (
        "[NEHR] Hi {patient_name}, you are cleared for discharge. "
        "Please complete checkout at the billing desk."
    ),
    
    # Health Education Templates
    'health_tip': (
        "[NEHR Health Tip] {message}"
    ),
    'medication_reminder': (
        "[NEHR] Reminder: Take your {medication_name} - {dosage}. {instructions}"
    ),
    'followup_reminder': (
        "[NEHR] Hi {patient_name}, you have a follow-up visit due with Dr. {doctor_name}. "
        "Please call {hospital_name} to schedule."
    ),
    
    # General Templates
    'welcome_patient': (
        "[NEHR] Welcome {patient_name}! Your patient ID is {patient_id}. "
        "Download our app or visit our portal to book appointments and view records."
    ),
    'password_reset': (
        "[NEHR] Your password reset code is: {code}. Valid for 15 minutes. "
        "Do not share this code with anyone."
    ),
}


# ═══════════════════════════════════════════════════════════════
# NOTIFICATION FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def send_notification(user, notification_type, title, message, **kwargs):
    """
    Send multi-channel notification (in-app + SMS).
    
    Args:
        user: User object
        notification_type: str (appointment, lab_result, billing, etc.)
        title: str
        message: str
        **kwargs: Additional data (appointment, related_object, etc.)
    """
    # Create in-app notification
    notif = Notification.objects.create(
        user=user,
        type=notification_type,
        title=title,
        message=message,
        appointment=kwargs.get('appointment'),
    )
    
    # Send SMS if enabled
    if hasattr(user, 'sms_notifications_enabled') and user.sms_notifications_enabled:
        if user.phone:
            send_sms(user.phone, message)
    
    return notif


def send_templated_sms(phone, template_key, context):
    """
    Send SMS using a template.
    
    Args:
        phone: Phone number
        template_key: Key from SMS_TEMPLATES
        context: Dict with template variables
    """
    if template_key not in SMS_TEMPLATES:
        logger.error(f'SMS template not found: {template_key}')
        return False
    
    template = SMS_TEMPLATES[template_key]
    try:
        message = template.format(**context)
        return send_sms(phone, message)
    except KeyError as e:
        logger.error(f'Missing template variable: {e}')
        return False


# ═══════════════════════════════════════════════════════════════
# APPOINTMENT NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════

def notify_appointment_confirmation(appointment):
    """Send appointment confirmation notification."""
    patient = appointment.patient
    if not patient:
        return
    
    apt_time = timezone.localtime(appointment.scheduled_at)
    context = {
        'patient_name': patient.first_name,
        'doctor_name': appointment.doctor.full_name if appointment.doctor else 'your doctor',
        'hospital_name': appointment.hospital.name if appointment.hospital else 'the hospital',
        'date': apt_time.strftime('%d %b %Y'),
        'time': apt_time.strftime('%I:%M %p'),
    }
    
    # In-app notification
    if hasattr(patient, 'user_ptr'):
        send_notification(
            user=patient.user_ptr,
            notification_type='appointment',
            title='Appointment Confirmed',
            message=SMS_TEMPLATES['appointment_confirmation'].format(**context),
            appointment=appointment
        )
    
    # SMS
    if patient.phone:
        send_templated_sms(patient.phone, 'appointment_confirmation', context)


def notify_appointment_reminder(appointment, hours_before=24):
    """Send appointment reminder."""
    patient = appointment.patient
    if not patient or not patient.phone:
        return
    
    apt_time = timezone.localtime(appointment.scheduled_at)
    context = {
        'patient_name': patient.first_name,
        'doctor_name': appointment.doctor.full_name if appointment.doctor else 'your doctor',
        'hospital_name': appointment.hospital.name if appointment.hospital else 'the hospital',
        'time': apt_time.strftime('%I:%M %p'),
    }
    
    template_key = 'appointment_reminder_24h' if hours_before == 24 else 'appointment_reminder_2h'
    send_templated_sms(patient.phone, template_key, context)


def notify_appointment_cancelled(appointment, reason=''):
    """Send appointment cancellation notification."""
    patient = appointment.patient
    if not patient:
        return
    
    apt_time = timezone.localtime(appointment.scheduled_at)
    context = {
        'patient_name': patient.first_name,
        'doctor_name': appointment.doctor.full_name if appointment.doctor else 'your doctor',
        'hospital_name': appointment.hospital.name if appointment.hospital else 'the hospital',
        'date': apt_time.strftime('%d %b %Y'),
        'reason': reason or 'Cancelled by hospital',
    }
    
    # In-app notification
    if hasattr(patient, 'user_ptr'):
        send_notification(
            user=patient.user_ptr,
            notification_type='appointment',
            title='Appointment Cancelled',
            message=SMS_TEMPLATES['appointment_cancelled'].format(**context),
            appointment=appointment
        )
    
    # SMS
    if patient.phone:
        send_templated_sms(patient.phone, 'appointment_cancelled', context)


# ═══════════════════════════════════════════════════════════════
# LAB RESULT NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════

def notify_lab_result_ready(lab_test):
    """Notify patient that lab results are ready."""
    patient = lab_test.patient
    if not patient or not patient.phone:
        return
    
    context = {
        'patient_name': patient.first_name,
        'test_name': lab_test.test_name,
        'hospital_name': lab_test.hospital.name if lab_test.hospital else 'the hospital',
    }
    
    # Use critical template if flagged
    template_key = 'lab_result_critical' if lab_test.is_critical else 'lab_result_ready'
    
    if lab_test.is_critical:
        context['doctor_name'] = lab_test.ordered_by.full_name if lab_test.ordered_by else 'your doctor'
    
    # In-app notification
    if hasattr(patient, 'user_ptr'):
        send_notification(
            user=patient.user_ptr,
            notification_type='lab_result',
            title='Lab Results Ready' if not lab_test.is_critical else 'CRITICAL Lab Result',
            message=SMS_TEMPLATES[template_key].format(**context)
        )
    
    # SMS
    send_templated_sms(patient.phone, template_key, context)
    
    # Also notify doctor if critical
    if lab_test.is_critical and lab_test.ordered_by:
        send_notification(
            user=lab_test.ordered_by,
            notification_type='lab_result',
            title=f'CRITICAL: {lab_test.test_name} - {patient.full_name}',
            message=f'Critical lab result for {patient.full_name} (ID: {patient.patient_id}). Please review immediately.'
        )


# ═══════════════════════════════════════════════════════════════
# BILLING NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════

def notify_invoice_generated(invoice):
    """Notify patient of new invoice."""
    patient = invoice.patient
    if not patient or not patient.phone:
        return
    
    context = {
        'patient_name': patient.first_name,
        'invoice_number': invoice.invoice_number,
        'amount': f'{invoice.total:,.2f}',
        'hospital_name': invoice.hospital.name if invoice.hospital else 'the hospital',
    }
    
    # In-app notification
    if hasattr(patient, 'user_ptr'):
        send_notification(
            user=patient.user_ptr,
            notification_type='billing',
            title='New Invoice',
            message=SMS_TEMPLATES['invoice_generated'].format(**context)
        )
    
    # SMS
    send_templated_sms(patient.phone, 'invoice_generated', context)


def notify_payment_received(payment):
    """Notify patient of payment receipt."""
    invoice = payment.invoice
    patient = invoice.patient if invoice else None
    if not patient or not patient.phone:
        return
    
    context = {
        'patient_name': patient.first_name,
        'amount': f'{payment.amount:,.2f}',
        'receipt_number': payment.receipt_number or payment.id,
        'balance': f'{invoice.balance_due:,.2f}' if invoice else '0.00',
    }
    
    # SMS
    send_templated_sms(patient.phone, 'payment_received', context)


# ═══════════════════════════════════════════════════════════════
# HEALTH EDUCATION & REMINDERS
# ═══════════════════════════════════════════════════════════════

def send_health_tip(patient, message):
    """Send health education tip to patient."""
    if not patient or not patient.phone:
        return
    
    context = {'message': message}
    send_templated_sms(patient.phone, 'health_tip', context)


def send_medication_reminder(patient, medication_name, dosage, instructions):
    """Send medication reminder to patient."""
    if not patient or not patient.phone:
        return
    
    context = {
        'medication_name': medication_name,
        'dosage': dosage,
        'instructions': instructions,
    }
    send_templated_sms(patient.phone, 'medication_reminder', context)


# ═══════════════════════════════════════════════════════════════
# BULK NOTIFICATION FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def send_bulk_sms(patients, template_key, context_generator):
    """
    Send bulk SMS to multiple patients.
    
    Args:
        patients: QuerySet or list of Patient objects
        template_key: Template key from SMS_TEMPLATES
        context_generator: Function that takes a patient and returns context dict
    """
    sent_count = 0
    for patient in patients:
        if patient.phone:
            context = context_generator(patient)
            if send_templated_sms(patient.phone, template_key, context):
                sent_count += 1
    
    logger.info(f'Bulk SMS sent: {sent_count}/{len(patients)}')
    return sent_count


def send_appointment_reminders_batch():
    """
    Send appointment reminders for appointments in the next 24 hours.
    Should be run as a scheduled task (cron job/celery).
    """
    tomorrow = timezone.now() + timedelta(hours=24)
    tomorrow_end = tomorrow + timedelta(hours=1)
    
    appointments = Appointment.objects.filter(
        scheduled_at__gte=tomorrow,
        scheduled_at__lt=tomorrow_end,
        status__in=['scheduled', 'confirmed']
    ).select_related('patient', 'doctor', 'hospital')
    
    sent_count = 0
    for appointment in appointments:
        try:
            notify_appointment_reminder(appointment, hours_before=24)
            sent_count += 1
        except Exception as e:
            logger.error(f'Failed to send reminder for appointment {appointment.id}: {e}')
    
    logger.info(f'Sent {sent_count} appointment reminders')
    return sent_count
