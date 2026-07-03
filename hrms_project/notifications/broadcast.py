import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Notification
from .serializers import NotificationSerializer

logger = logging.getLogger(__name__)


def employee_group_name(employee_id):
    return f'notifications_employee_{employee_id}'


def notification_to_payload(notification):
    """Serialize a notification for WebSocket (matches REST API shape)."""
    return NotificationSerializer(notification).data


def _get_unread_count(employee_id):
    return Notification.objects.filter(
        recipient_id=employee_id,
        is_read=False,
    ).count()


def broadcast_notification(notification):
    """Push one notification to the recipient's WebSocket group."""
    channel_layer = get_channel_layer()
    if channel_layer is None:
        logger.warning('Channel layer not configured; skipping WebSocket broadcast.')
        return

    if not notification.pk or not notification.recipient_id:
        return

    notification = (
        Notification.objects.filter(pk=notification.pk)
        .select_related('actor', 'recipient')
        .first()
    )
    if not notification:
        return

    payload = notification_to_payload(notification)
    unread_count = _get_unread_count(notification.recipient_id)
    group = employee_group_name(notification.recipient_id)

    async_to_sync(channel_layer.group_send)(
        group,
        {
            'type': 'notification.new',
            'notification': payload,
            'unread_count': unread_count,
        },
    )


def broadcast_notifications(notifications):
    """
    Push all created notifications to their recipients (callable from Celery).
    """
    if not notifications:
        return

    pks = [n.pk for n in notifications if n.pk]
    if not pks:
        logger.warning('Notifications have no PK after bulk_create; skipping broadcast.')
        return

    stored = (
        Notification.objects.filter(pk__in=pks)
        .select_related('actor', 'recipient')
        .order_by('pk')
    )
    for notification in stored:
        broadcast_notification(notification)
