from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from rest_framework.exceptions import ValidationError, PermissionDenied

from django.db import IntegrityError

from accounts.models import Employee
from organization.models import BusinessUnit, EmployeeOrganization
from leave.permissions import IsHRorAdmin

from .models import DocumentFolder, Document
from .serializers import DocumentFolderSerializer, DocumentSerializer


def _current_employee(request):
    try:
        return Employee.objects.get(user=request.user)
    except Employee.DoesNotExist:
        raise PermissionDenied('Employee profile not found.')


def _hr_business_unit(user):
    if getattr(user, 'role', None) == 'admin':
        return None
    try:
        org = user.employee.employeeorganization
        if org and org.business_unit_id:
            return org.business_unit
    except AttributeError:
        pass
    raise ValidationError('HR user is not assigned to a business unit.')


def _visible_bu_ids(user):
    if getattr(user, 'role', None) == 'admin':
        return list(BusinessUnit.objects.filter(is_active=True).values_list('id', flat=True))
    bu = _hr_business_unit(user)
    return [bu.id]


class FolderViewSet(ModelViewSet):
    serializer_class = DocumentFolderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        employee = _current_employee(self.request)
        org = EmployeeOrganization.objects.filter(employee=employee).first()
        if user.role == 'admin':
            qs = DocumentFolder.objects.all()
        else:
            if not org or not org.business_unit_id:
                return DocumentFolder.objects.none()
            qs = DocumentFolder.objects.filter(business_unit_id=org.business_unit_id)
        return qs.order_by('title')

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsHRorAdmin()]
        return super().get_permissions()

    def perform_create(self, serializer):
        user = self.request.user
        title = (serializer.validated_data.get('title') or '').strip()
        if user.role == 'admin':
            bu_id = self.request.data.get('business_unit')
            if not bu_id:
                raise ValidationError({'business_unit': 'Admin must provide business_unit id.'})
            bu = BusinessUnit.objects.get(pk=bu_id)
            if DocumentFolder.objects.filter(business_unit=bu, title=title).exists():
                raise ValidationError({'title': 'Folder title already exists in this business unit.'})
            try:
                serializer.save(business_unit=bu)
            except IntegrityError:
                raise ValidationError({'title': 'Folder title already exists in this business unit.'})
        else:
            bu = _hr_business_unit(user)
            if DocumentFolder.objects.filter(business_unit=bu, title=title).exists():
                raise ValidationError({'title': 'Folder title already exists in this business unit.'})
            try:
                serializer.save(business_unit=bu)
            except IntegrityError:
                raise ValidationError({'title': 'Folder title already exists in this business unit.'})

    def perform_update(self, serializer):
        instance = serializer.instance
        title = (serializer.validated_data.get('title') or instance.title or '').strip()
        bu = instance.business_unit
        if DocumentFolder.objects.filter(business_unit=bu, title=title).exclude(id=instance.id).exists():
            raise ValidationError({'title': 'Folder title already exists in this business unit.'})
        try:
            serializer.save()
        except IntegrityError:
            raise ValidationError({'title': 'Folder title already exists in this business unit.'})


class DocumentViewSet(ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Document.objects.select_related('folder', 'folder__business_unit')
        folder_id = self.request.query_params.get('folder')

        employee = _current_employee(self.request)
        org = EmployeeOrganization.objects.filter(employee=employee).first()

        if user.role == 'admin':
            if folder_id:
                qs = qs.filter(folder_id=folder_id)
            return qs

        if not org or not org.business_unit_id:
            return qs.none()

        qs = qs.filter(folder__business_unit_id=org.business_unit_id)
        if folder_id:
            qs = qs.filter(folder_id=folder_id)
        return qs

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsHRorAdmin()]
        return super().get_permissions()

    def perform_create(self, serializer):
        user = self.request.user
        folder = serializer.validated_data.get('folder')
        if user.role == 'admin':
            # Admin can upload into any folder
            serializer.save()
            return

        bu = _hr_business_unit(user)
        if folder.business_unit_id != bu.id:
            raise ValidationError('You cannot upload documents to another business unit.')
        serializer.save()
