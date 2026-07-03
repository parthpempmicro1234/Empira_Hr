import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

from .broadcast import employee_group_name


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if not user or isinstance(user, AnonymousUser):
            await self.close(code=4001)
            return

        employee = await self._get_employee(user)
        if employee is None:
            await self.close(code=4002)
            return

        self.employee_id = employee.id
        self.group_name = employee_group_name(employee.id)

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send(
            text_data=json.dumps({'type': 'connection.established'}),
        )

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name,
            )

    async def receive(self, text_data=None, bytes_data=None):
        # Client-to-server messages not required for v1
        pass

    async def notification_new(self, event):
        await self.send(
            text_data=json.dumps({
                'type': 'notification.new',
                'notification': event['notification'],
                'unread_count': event.get('unread_count'),
            }),
        )

    @database_sync_to_async
    def _get_employee(self, user):
        return getattr(user, 'employee', None)
