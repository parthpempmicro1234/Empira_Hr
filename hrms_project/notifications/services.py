from accounts.models import Employee
from leave.models import Leave
from organization.models import EmployeeOrganization

from .constants import NotificationType
from .tasks import send_notification_dispatcher


def get_hr_for_business_unit(employee):
    """Active HR employees in the same business unit as the given employee."""
    org = getattr(employee, 'employeeorganization', None)
    if not org or not org.business_unit_id:
        return Employee.objects.none()

    hr_employee_ids = EmployeeOrganization.objects.filter(
        business_unit_id=org.business_unit_id,
        employee__is_active=True,
        employee__user__role='hr',
        employee__user__is_active=True,
    ).values_list('employee_id', flat=True)

    return Employee.objects.filter(id__in=hr_employee_ids)


def _actor_label(actor):
    return actor.display_name if actor else 'Someone'


def notify_mentions_in_text(actor, text, extra_data=None):
    if not text or '@' not in text:
        return
    send_notification_dispatcher.delay(
        notification_type=NotificationType.MENTION,
        content='',
        actor_id=actor.id if actor else None,
        text_to_parse=text,
        extra_data=extra_data or {},
    )


def notify_post_comment(post, comment, actor):
    if post.author_id == actor.id:
        return
    send_notification_dispatcher.delay(
        notification_type=NotificationType.POST_COMMENT,
        content=f"{_actor_label(actor)} commented on your post.",
        actor_id=actor.id,
        recipient_id=post.author_id,
        extra_data={'post_id': post.id, 'comment_id': comment.id},
    )


MAX_LEAVE_NOTIFY_RECIPIENTS = 20


def resolve_notify_employee_ids(employee_ids, actor):
    """Return active employee PKs to notify; excludes actor and invalid IDs."""
    if not employee_ids:
        return []
    unique_ids = list(dict.fromkeys(employee_ids))[:MAX_LEAVE_NOTIFY_RECIPIENTS]
    return list(
        Employee.objects.filter(
            id__in=unique_ids,
            is_active=True,
        )
        .exclude(id=actor.id)
        .values_list('id', flat=True),
    )


def _leave_notify_extra_data(leave):
    """Structured leave details for inbox UI and deep links."""
    return {
        'leave_id': leave.id,
        'leave_type': leave.leave_type.name,
        'leave_type_id': leave.leave_type_id,
        'start_date': leave.start_date.isoformat(),
        'end_date': leave.end_date.isoformat(),
        'total_days': str(leave.total_days),
        'employee_name': leave.employee.display_name,
        'employee_id': leave.employee_id,
    }


def _leave_notify_content(leave, notify_message=None):
    """Human-readable line including type, date range, and duration."""
    employee_name = leave.employee.display_name
    leave_name = leave.leave_type.name
    days = leave.total_days
    if leave.start_date == leave.end_date:
        date_part = leave.start_date.strftime('%d %b %Y')
    else:
        date_part = (
            f"{leave.start_date.strftime('%d %b %Y')} – "
            f"{leave.end_date.strftime('%d %b %Y')}"
        )
    duration_part = f"{days} day{'s' if days != 1 else ''}"
    summary = f"{employee_name} — {leave_name}: {date_part} ({duration_part})"
    message = (notify_message or '').strip()
    if message:
        return f"{summary}. {message}"
    return f"{summary}. Shared a leave request with you."


def notify_leave_on_create(leave, actor, notify_employee_ids=None, notify_message=None):
    """
    On leave apply: notify only selected employees (+ @mentions).
    Does not broadcast to all HR in the business unit.
    """
    leave = Leave.objects.select_related('leave_type', 'employee').get(pk=leave.pk)
    extra = _leave_notify_extra_data(leave)
    content = _leave_notify_content(leave, notify_message)

    recipient_ids = resolve_notify_employee_ids(notify_employee_ids or [], actor)
    if recipient_ids:
        send_notification_dispatcher.delay(
            notification_type=NotificationType.LEAVE_NOTIFY,
            content=content,
            actor_id=actor.id,
            recipient_ids=recipient_ids,
            extra_data=extra,
        )

    if leave.reason and '@' in leave.reason:
        notify_mentions_in_text(actor, leave.reason, extra_data=extra)

    if notify_message and '@' in notify_message:
        notify_mentions_in_text(actor, notify_message, extra_data=extra)


def notify_leave_approved(leave, actor):
    send_notification_dispatcher.delay(
        notification_type=NotificationType.LEAVE_APPROVED,
        content=f"Your {leave.leave_type.name} leave was approved.",
        actor_id=actor.id,
        recipient_id=leave.employee_id,
        extra_data={'leave_id': leave.id},
    )


def notify_leave_rejected(leave, actor):
    send_notification_dispatcher.delay(
        notification_type=NotificationType.LEAVE_REJECTED,
        content=f"Your {leave.leave_type.name} leave was rejected.",
        actor_id=actor.id,
        recipient_id=leave.employee_id,
        extra_data={
            'leave_id': leave.id,
            'rejection_reason': leave.rejection_reason,
        },
    )


def notify_leave_cancelled(leave, actor, notify_hr=False):
    if notify_hr:
        hr_employees = list(get_hr_for_business_unit(leave.employee))
        if not hr_employees:
            return
        send_notification_dispatcher.delay(
            notification_type=NotificationType.LEAVE_CANCELLED,
            content=(
                f"{leave.employee.display_name} cancelled a leave request."
            ),
            actor_id=actor.id,
            recipient_ids=[hr.id for hr in hr_employees],
            extra_data={'leave_id': leave.id},
        )


def _reaction_content(actor, reaction_type):
    verb = NotificationType.REACTION_VERBS.get(reaction_type, 'reacted to')
    return f"{_actor_label(actor)} {verb} your post."


def notify_post_reaction(post, actor, reaction_type):
    if post.author_id == actor.id:
        return
    send_notification_dispatcher.delay(
        notification_type=NotificationType.POST_REACTION,
        content=_reaction_content(actor, reaction_type),
        actor_id=actor.id,
        recipient_id=post.author_id,
        extra_data={'post_id': post.id, 'reaction_type': reaction_type},
    )


def notify_poll_vote(post, poll_option, actor):
    if post.author_id == actor.id:
        return
    send_notification_dispatcher.delay(
        notification_type=NotificationType.POLL_VOTE,
        content=(
            f"{_actor_label(actor)} voted on your poll: "
            f"\"{poll_option.option_text}\"."
        ),
        actor_id=actor.id,
        recipient_id=post.author_id,
        extra_data={
            'post_id': post.id,
            'poll_option_id': poll_option.id,
        },
    )


def get_feed_post_audience_employee_ids(post):
    """Active employees who can see this post (excluding the author)."""
    qs = Employee.objects.filter(is_active=True).exclude(id=post.author_id)
    if post.target_department_id:
        qs = qs.filter(
            employeeorganization__department_id=post.target_department_id,
        )
    elif post.target_business_unit_id:
        qs = qs.filter(
            employeeorganization__business_unit_id=post.target_business_unit_id,
        )
    return list(qs.values_list('id', flat=True).distinct())


def notify_system(recipient_ids, content, actor=None, extra_data=None):
    if not recipient_ids:
        return
    send_notification_dispatcher.delay(
        notification_type=NotificationType.SYSTEM,
        content=content,
        actor_id=actor.id if actor else None,
        recipient_ids=list(recipient_ids),
        extra_data=extra_data or {},
    )


def notify_system_announcement(post, actor):
    """Notify feed audience when an announcement post is published."""
    recipient_ids = get_feed_post_audience_employee_ids(post)
    if not recipient_ids:
        return
    preview = (post.content[:80] + '...') if len(post.content) > 80 else post.content
    notify_system(
        recipient_ids=recipient_ids,
        content=f"New announcement from {_actor_label(actor)}: {preview}",
        actor=actor,
        extra_data={'post_id': post.id, 'post_type': post.post_type},
    )


def notify_regularization_on_create(regularization):
    """Notify HR in the same business unit about a new attendance regularization request."""
    hr_employees = list(get_hr_for_business_unit(regularization.employee))
    if not hr_employees:
        return
    send_notification_dispatcher.delay(
        notification_type=NotificationType.ATTENDANCE_ALERT,
        content=(
            f"{regularization.employee.display_name} submitted an attendance "
            f"regularization for {regularization.date.isoformat()}."
        ),
        actor_id=regularization.employee_id,
        recipient_ids=[hr.id for hr in hr_employees],
        extra_data={
            'regularization_id': regularization.id,
            'request_type': regularization.request_type,
            'date': regularization.date.isoformat(),
        },
    )


def notify_regularization_decision(regularization, approved):
    """Notify employee when regularization is approved or rejected."""
    verb = 'approved' if approved else 'rejected'
    send_notification_dispatcher.delay(
        notification_type=NotificationType.ATTENDANCE_ALERT,
        content=f"Your attendance regularization for {regularization.date.isoformat()} was {verb}.",
        actor_id=regularization.action_taken_by_id,
        recipient_id=regularization.employee_id,
        extra_data={
            'regularization_id': regularization.id,
            'status': regularization.status,
        },
    )
