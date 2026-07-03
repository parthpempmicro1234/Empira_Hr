from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'notification_type',
        'recipient',
        'actor',
        'is_read',
        'created_at',
    )
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = (
        'recipient__display_name',
        'actor__display_name',
        'content',
    )
    readonly_fields = ('created_at',)
    raw_id_fields = ('recipient', 'actor')
