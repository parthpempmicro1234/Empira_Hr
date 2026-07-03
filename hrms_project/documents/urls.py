from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import FolderViewSet, DocumentViewSet


router = DefaultRouter()
router.register(r'folders', FolderViewSet, basename='document-folders')
router.register(r'documents', DocumentViewSet, basename='documents')

urlpatterns = [
] + router.urls

