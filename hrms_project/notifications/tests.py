from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import Employee, User
from leave.models import Leave, LeaveType
from notifications.constants import NotificationType
from notifications.models import Notification
from notifications.services import (
    notify_leave_approved,
    notify_poll_vote,
    notify_post_reaction,
    notify_system,
    notify_system_announcement,
)
from notifications.tasks import send_notification_dispatcher
from organization.models import BusinessUnit, EmployeeOrganization, FeedPost, PollOption


def _create_user(email, role='employee', display_name=None):
    user = User.objects.create_user(work_email=email, password='testpass123', role=role)
    parts = (display_name or email.split('@')[0]).split(' ', 1)
    fname = parts[0]
    lname = parts[1] if len(parts) > 1 else 'User'
    employee = Employee.objects.create(
        user=user,
        fname=fname,
        lname=lname,
        display_name=display_name or f"{fname} {lname}",
        employee_code=email.split('@')[0][:20],
        work_email=email,
        date_of_joining=date.today() - timedelta(days=365),
        job_title_primary='Staff',
    )
    return user, employee


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class NotificationDispatcherTests(TestCase):
    def setUp(self):
        self.user, self.employee = _create_user('emp1@test.com', display_name='Arjun Mehta')
        self.other_user, self.other = _create_user('emp2@test.com', display_name='Riya Shah')

    def test_direct_notification_creates_row(self):
        send_notification_dispatcher(
            notification_type=NotificationType.LEAVE_APPROVED,
            content='Your leave was approved.',
            actor_id=self.other.id,
            recipient_id=self.employee.id,
            extra_data={'leave_id': 1},
        )
        self.assertEqual(Notification.objects.count(), 1)
        notification = Notification.objects.get()
        self.assertEqual(notification.recipient_id, self.employee.id)
        self.assertEqual(notification.notification_type, NotificationType.LEAVE_APPROVED)

    def test_recipient_ids_creates_multiple_rows(self):
        send_notification_dispatcher(
            notification_type=NotificationType.LEAVE_REQUESTED,
            content='New leave request.',
            actor_id=self.employee.id,
            recipient_ids=[self.employee.id, self.other.id],
            extra_data={'leave_id': 5},
        )
        self.assertEqual(Notification.objects.count(), 2)

    def test_mention_parsing(self):
        send_notification_dispatcher(
            notification_type=NotificationType.MENTION,
            content='',
            actor_id=self.employee.id,
            text_to_parse='Please review @Riya Shah',
            extra_data={'post_id': 10},
        )
        self.assertEqual(Notification.objects.count(), 1)
        self.assertEqual(Notification.objects.get().recipient_id, self.other.id)
        self.assertEqual(Notification.objects.get().notification_type, NotificationType.MENTION)

    def test_dedupe_same_recipient_and_entity(self):
        send_notification_dispatcher(
            notification_type=NotificationType.LEAVE_APPROVED,
            content='Approved',
            recipient_id=self.employee.id,
            recipient_ids=[self.employee.id],
            extra_data={'leave_id': 3},
        )
        self.assertEqual(Notification.objects.count(), 1)


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class NotificationAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user, self.employee = _create_user('api@test.com')
        self.client.force_authenticate(user=self.user)
        Notification.objects.create(
            recipient=self.employee,
            notification_type=NotificationType.SYSTEM,
            content='Welcome to Emira HR',
            is_read=False,
        )

    def test_unread_count(self):
        response = self.client.get('/notifications/unread_count/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['unread_count'], 1)

    def test_mark_as_read(self):
        notification = Notification.objects.get()
        response = self.client.post(f'/notifications/{notification.id}/mark_as_read/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        notification.refresh_from_db()
        self.assertTrue(notification.is_read)

    def test_mark_all_as_read(self):
        response = self.client.post('/notifications/mark_all_as_read/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            Notification.objects.filter(recipient=self.employee, is_read=False).count(),
            0,
        )


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class LeaveNotificationServiceTests(TestCase):
    def setUp(self):
        self.hr_user, self.hr = _create_user('hr@test.com', role='hr', display_name='HR Person')
        self.emp_user, self.employee = _create_user('emp@test.com', display_name='Leave Employee')
        self.leave_type = LeaveType.objects.create(name='Casual', code='CL')
        self.bu = BusinessUnit.objects.create(name='Engineering')
        EmployeeOrganization.objects.create(
            employee=self.employee,
            business_unit=self.bu,
        )
        EmployeeOrganization.objects.create(
            employee=self.hr,
            business_unit=self.bu,
        )
        self.leave = Leave.objects.create(
            employee=self.employee,
            leave_type=self.leave_type,
            start_date=date.today() + timedelta(days=10),
            end_date=date.today() + timedelta(days=12),
            total_days=Decimal('3.00'),
            reason='Family event',
            requested_by=self.employee,
        )

    def test_notify_leave_approved_creates_notification(self):
        notify_leave_approved(self.leave, self.hr)
        notification = Notification.objects.get(recipient=self.employee)
        self.assertEqual(notification.notification_type, NotificationType.LEAVE_APPROVED)
        self.assertEqual(notification.data['leave_id'], self.leave.id)

    def test_notify_leave_on_create_selected_only_not_all_hr(self):
        from notifications.services import notify_leave_on_create

        _, colleague = _create_user('colleague@test.com', display_name='Colleague One')
        EmployeeOrganization.objects.create(employee=colleague, business_unit=self.bu)

        notify_leave_on_create(
            self.leave,
            self.employee,
            notify_employee_ids=[colleague.id],
            notify_message='Please cover my tasks',
        )
        self.assertEqual(Notification.objects.count(), 1)
        n = Notification.objects.get()
        self.assertEqual(n.recipient_id, colleague.id)
        self.assertEqual(n.notification_type, NotificationType.LEAVE_NOTIFY)
        self.assertIn('Casual', n.content)
        self.assertIn('day', n.content.lower())
        self.assertEqual(n.data['leave_type'], 'Casual')
        self.assertEqual(n.data['total_days'], '3.00')
        self.assertIn('start_date', n.data)
        self.assertIn('end_date', n.data)
        self.assertFalse(
            Notification.objects.filter(recipient=self.hr).exists(),
        )

    def test_notify_leave_on_create_mention_in_reason(self):
        from notifications.services import notify_leave_on_create

        self.leave.reason = 'Need off @HR Person'
        self.leave.save(update_fields=['reason'])
        notify_leave_on_create(self.leave, self.employee)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.hr,
                notification_type=NotificationType.MENTION,
            ).exists(),
        )


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class FeedNotificationServiceTests(TestCase):
    def setUp(self):
        self.author_user, self.author = _create_user(
            'author@test.com', display_name='Post Author',
        )
        self.reactor_user, self.reactor = _create_user(
            'reactor@test.com', display_name='Post Reactor',
        )
        self.bu = BusinessUnit.objects.create(name='Sales')
        EmployeeOrganization.objects.create(employee=self.author, business_unit=self.bu)
        EmployeeOrganization.objects.create(employee=self.reactor, business_unit=self.bu)
        self.post = FeedPost.objects.create(
            author=self.author,
            post_type='standard',
            content='Hello team',
        )

    def test_notify_post_reaction(self):
        notify_post_reaction(self.post, self.reactor, 'heart')
        notification = Notification.objects.get(recipient=self.author)
        self.assertEqual(notification.notification_type, NotificationType.POST_REACTION)
        self.assertEqual(notification.data['reaction_type'], 'heart')
        self.assertIn('loved', notification.content)

    def test_post_reaction_skips_self(self):
        notify_post_reaction(self.post, self.author, 'like')
        self.assertEqual(Notification.objects.count(), 0)

    def test_notify_poll_vote(self):
        poll_post = FeedPost.objects.create(
            author=self.author,
            post_type='poll',
            content='Favorite color?',
        )
        option = PollOption.objects.create(
            feed_post=poll_post,
            option_text='Blue',
        )
        notify_poll_vote(poll_post, option, self.reactor)
        notification = Notification.objects.get(recipient=self.author)
        self.assertEqual(notification.notification_type, NotificationType.POLL_VOTE)
        self.assertEqual(notification.data['poll_option_id'], option.id)

    def test_notify_system_announcement(self):
        announcement = FeedPost.objects.create(
            author=self.author,
            post_type='announcement',
            content='Office closed tomorrow',
            target_business_unit=self.bu,
        )
        notify_system_announcement(announcement, self.author)
        notification = Notification.objects.get(recipient=self.reactor)
        self.assertEqual(notification.notification_type, NotificationType.SYSTEM)
        self.assertEqual(notification.data['post_id'], announcement.id)

    def test_notify_system_direct(self):
        notify_system(
            recipient_ids=[self.reactor.id],
            content='Maintenance tonight',
            actor=self.author,
            extra_data={'source': 'admin'},
        )
        notification = Notification.objects.get(recipient=self.reactor)
        self.assertEqual(notification.notification_type, NotificationType.SYSTEM)
        self.assertEqual(notification.data['source'], 'admin')


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CHANNEL_LAYERS={'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}},
)
class BroadcastTests(TestCase):
    def setUp(self):
        self.user, self.recipient = _create_user('ws_recipient@test.com')
        self.actor_user, self.actor = _create_user(
            'ws_actor@test.com', display_name='WS Actor',
        )

    def test_employee_group_name(self):
        from notifications.broadcast import employee_group_name

        self.assertEqual(employee_group_name(99), 'notifications_employee_99')

    def test_broadcast_notification_calls_group_send(self):
        from unittest.mock import MagicMock, patch

        from notifications.broadcast import broadcast_notification

        notification = Notification.objects.create(
            recipient=self.recipient,
            actor=self.actor,
            notification_type=NotificationType.SYSTEM,
            content='Test broadcast',
            data={'post_id': 1},
        )
        mock_layer = MagicMock()
        with patch('notifications.broadcast.get_channel_layer', return_value=mock_layer):
            broadcast_notification(notification)
            mock_layer.group_send.assert_called_once()
            call_args = mock_layer.group_send.call_args[0]
            self.assertEqual(call_args[0], f'notifications_employee_{self.recipient.id}')
            self.assertEqual(call_args[1]['type'], 'notification.new')
            self.assertEqual(call_args[1]['notification']['id'], notification.id)
