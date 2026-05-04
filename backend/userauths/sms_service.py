"""
SMS notification service.

Supports Africa's Talking (recommended for Sierra Leone, Ghana, Kenya, Nigeria).
Can be swapped out for Twilio, Vonage, etc. by editing `_send_via_provider`.

Setup:
  1. Sign up at https://africastalking.com (free sandbox account)
  2. Get your username + API key from the dashboard
  3. Add to your .env / settings.py:
       AT_USERNAME = 'your_username'
       AT_API_KEY = 'your_api_key'
       AT_SENDER_ID = 'NEHR'  # optional, must be pre-approved

  4. Install the SDK:
       pip install africastalking

  5. Users must have a valid phone number AND have enabled SMS notifications
     (User.sms_notifications_enabled = True)
"""
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def _normalize_phone(phone):
    """Normalize phone to international format (+232...). Adjust for your country."""
    if not phone:
        return None
    p = str(phone).strip().replace(' ', '').replace('-', '')
    if p.startswith('+'):
        return p
    # Default to Sierra Leone (+232) - adjust if your primary country differs
    if p.startswith('232'):
        return '+' + p
    if p.startswith('0'):
        return '+232' + p[1:]
    return '+' + p


def _send_via_provider(phone, body):
    """
    Send SMS via Africa's Talking.
    Returns (success: bool, error_message: str or None).
    """
    username = getattr(settings, 'AT_USERNAME', None)
    api_key = getattr(settings, 'AT_API_KEY', None)
    sender_id = getattr(settings, 'AT_SENDER_ID', None)

    if not username or not api_key:
        logger.info('SMS not sent: AT_USERNAME/AT_API_KEY not configured.')
        return False, 'SMS provider not configured'

    try:
        import africastalking
        africastalking.initialize(username, api_key)
        sms = africastalking.SMS
        # Send
        kwargs = {'recipients': [phone], 'message': body}
        if sender_id:
            kwargs['sender_id'] = sender_id
        response = sms.send(**kwargs)
        logger.info('SMS send response: %s', response)
        return True, None
    except ImportError:
        return False, 'africastalking package not installed. Run: pip install africastalking'
    except Exception as e:
        logger.exception('SMS send failed')
        return False, str(e)


def send_sms(phone, body):
    """
    Public API: send an SMS to a phone number.
    Silent failure on errors - logs only.
    """
    phone = _normalize_phone(phone)
    if not phone:
        logger.info('SMS not sent: missing phone number')
        return False
    if not body:
        return False
    # Truncate to 160 chars for single SMS (each SMS segment = 160 chars)
    body = body[:480]  # allow up to 3 segments
    success, error = _send_via_provider(phone, body)
    if not success:
        logger.warning('SMS not sent to %s: %s', phone, error)
    return success


def send_message_sms(message):
    """
    Send an SMS notification for a new in-app Message.
    Respects recipient.sms_notifications_enabled flag.
    """
    recipient = message.recipient
    if not recipient.sms_notifications_enabled:
        return False
    if not recipient.phone:
        return False

    sender_name = message.sender.full_name or message.sender.email or 'Someone'
    preview = (message.body or '').strip().replace('\n', ' ')[:100]
    sms_body = f"[NEHR] New message from {sender_name}: {preview}... Login to reply."
    return send_sms(recipient.phone, sms_body)


def send_appointment_sms(appointment, action='created'):
    """
    Send SMS notification for appointment events.
    
    Actions:
      - 'created': Appointment booked confirmation
      - 'reminder': Day-before reminder
      - 'cancelled': Appointment cancelled
      
    Respects patient notification preferences if implemented.
    """
    patient = appointment.patient
    if not patient or not patient.phone:
        return False
    
    patient_name = patient.full_name or 'Patient'
    hospital_name = appointment.hospital.name if appointment.hospital else 'the hospital'
    doctor_name = appointment.doctor.full_name if appointment.doctor else 'a doctor'
    
    if action == 'created':
        from django.utils import timezone
        apt_time = timezone.localtime(appointment.scheduled_at)
        date_str = apt_time.strftime('%d %b %Y')
        time_str = apt_time.strftime('%I:%M %p')
        
        sms_body = (
            f"[NEHR] Hi {patient_name}, your appointment with Dr. {doctor_name} "
            f"at {hospital_name} is confirmed for {date_str} at {time_str}. "
            f"Please arrive 15 mins early. Reply NO to cancel."
        )
        
    elif action == 'cancelled':
        reason = appointment.cancellation_reason or 'Cancelled by hospital'
        sms_body = (
            f"[NEHR] Hi {patient_name}, your appointment with Dr. {doctor_name} "
            f"at {hospital_name} has been CANCELLED. Reason: {reason}. "
            f"Please call to reschedule."
        )
        
    elif action == 'reminder':
        from django.utils import timezone
        apt_time = timezone.localtime(appointment.scheduled_at)
        time_str = apt_time.strftime('%I:%M %p')
        
        sms_body = (
            f"[NEHR] Reminder: You have an appointment tomorrow at {time_str} "
            f"with Dr. {doctor_name} at {hospital_name}. See you there!"
        )
        
    else:
        return False
    
    return send_sms(patient.phone, sms_body)
