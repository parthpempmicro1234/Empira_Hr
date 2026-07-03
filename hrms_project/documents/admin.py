from django.contrib import admin

from .models import DocumentFolder, Document


@admin.register(DocumentFolder)
class DocumentFolderAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'business_unit', 'created_at']
    list_filter = ['business_unit']
    search_fields = ['title', 'business_unit__name']


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'folder', 'expiry_date', 'size_bytes', 'last_updated']
    list_filter = ['folder__business_unit', 'expiry_date']
    search_fields = ['title', 'folder__title', 'folder__business_unit__name']
