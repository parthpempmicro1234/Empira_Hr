from django.db import models

from .constants import NotificationType


class Notification(models.Model):
    recipient = models.ForeignKey(
        'accounts.Employee',
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    actor = models.ForeignKey(
        'accounts.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='actions_triggered',
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.CHOICES,
    )
    content = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    data = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['recipient', 'is_read', '-created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.notification_type} for {self.recipient_id}"
