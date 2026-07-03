from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings

import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retried=3)
def send_otp_email_task(self, email, otp_code, contex="login"):
    subject = "Your Empira_HR Login Code" if contex=="login" else "Empira HR Password Reset Code"
    message = f"Your one-time password is: {otp_code}. It is valid for 5 minutes. Do not share this code."
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        logger.info(f"OTP email sent successfully to {email}")
    except Exception as exc:
        logger.error(f"Failed to send OTP to {email}. Retrying...")
        raise self.retry(exc=exc, countdown=10)
        