from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.display_name', read_only=True)
    actor_id = serializers.IntegerField(source='actor.id', read_only=True, allow_null=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'actor_id',
            'actor_name',
            'notification_type',
            'content',
            'is_read',
            'data',
            'created_at',
        ]
