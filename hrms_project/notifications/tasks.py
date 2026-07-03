import logging

from celery import shared_task
from django.db import transaction

from accounts.models import Employee

from .constants import NotificationType
from .models import Notification

logger = logging.getLogger(__name__)


def _dedupe_key(recipient_id, notification_type, data, actor_id=None):
    data = data or {}
    entity_id = (
        data.get('leave_id')
        or data.get('post_id')
        or data.get('comment_id')
    )
    if notification_type in (
        NotificationType.POST_REACTION,
        NotificationType.POLL_VOTE,
    ):
        return (recipient_id, notification_type, entity_id, actor_id)
    return (recipient_id, notification_type, entity_id)


def _dedupe_notifications(notifications):
    seen = set()
    unique = []
    for notification in notifications:
        key = _dedupe_key(
            notification.recipient_id,
            notification.notification_type,
            notification.data,
            actor_id=notification.actor_id,
        )
        if key in seen:
            continue
        seen.add(key)
        unique.append(notification)
    return unique


@shared_task
def send_notification_dispatcher(
    notification_type,
    content,
    actor_id=None,
    recipient_id=None,
    recipient_ids=None,
    text_to_parse=None,
    extra_data=None,
):
    """
    Unified notification dispatcher: direct alerts and @mention parsing.
    """
    try:
        extra_data = extra_data or {}
        actor = Employee.objects.get(id=actor_id) if actor_id else None
        notifications_to_create = []

        target_recipient_ids = set(recipient_ids or [])
        if recipient_id:
            target_recipient_ids.add(recipient_id)

        with transaction.atomic():
            for rid in target_recipient_ids:
                notifications_to_create.append(
                    Notification(
                        recipient_id=rid,
                        actor=actor,
                        notification_type=notification_type,
                        content=content,
                        data=extra_data,
                    )
                )

            if text_to_parse and '@' in text_to_parse:
                words = text_to_parse.split()
                potential_names = []

                for i, word in enumerate(words):
                    if word.startswith('@'):
                        name_1 = word[1:].strip(',.!?;:')
                        potential_names.append(name_1)
                        if i + 1 < len(words):
                            name_2 = f"{name_1} {words[i + 1].strip(',.!?;:')}"
                            potential_names.append(name_2)
                        if i + 2 < len(words):
                            name_3 = f"{name_2} {words[i + 2].strip(',.!?;:')}"
                            potential_names.append(name_3)

                if potential_names:
                    matched_employees = Employee.objects.filter(
                        display_name__in=potential_names,
                        is_active=True,
                    )
                    if actor:
                        matched_employees = matched_employees.exclude(id=actor.id)

                    actor_label = actor.display_name if actor else 'Someone'
                    for employee in matched_employees.distinct():
                        if f"@{employee.display_name}" not in text_to_parse:
                            continue
                        notifications_to_create.append(
                            Notification(
                                recipient=employee,
                                actor=actor,
                                notification_type=NotificationType.MENTION,
                                content=f"{actor_label} mentioned you.",
                                data={**extra_data, 'context_text': text_to_parse[:100]},
                            )
                        )

            if notifications_to_create:
                notifications_to_create = _dedupe_notifications(notifications_to_create)
                Notification.objects.bulk_create(notifications_to_create)

                from .broadcast import broadcast_notifications

                broadcast_notifications(notifications_to_create)

                return (
                    f"Successfully dispatched {len(notifications_to_create)} "
                    "notification records."
                )

            return "No valid targets or mentions processed."

    except Exception as e:
        logger.error("Notification dispatch failed: %s", str(e))
        return f"Failed to distribute notifications: {str(e)}"
