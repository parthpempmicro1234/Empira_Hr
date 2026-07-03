from rest_framework import serializers

from .models import DocumentFolder, Document


def _humanize_bytes(num: int) -> str:
    num = int(num or 0)
    units = ['B', 'KB', 'MB', 'GB', 'TB']
    size = float(num)
    for unit in units:
        if size < 1024 or unit == units[-1]:
            if unit == 'B':
                return f'{int(size)} {unit}'
            return f'{size:.1f} {unit}'
        size /= 1024
    return f'{num} B'


class DocumentFolderSerializer(serializers.ModelSerializer):
    business_unit = serializers.IntegerField(source='business_unit_id', read_only=True)

    class Meta:
        model = DocumentFolder
        fields = ['id', 'title', 'business_unit', 'created_at']
        read_only_fields = ['id', 'business_unit', 'created_at']


class DocumentSerializer(serializers.ModelSerializer):
    size_display = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id',
            'folder',
            'title',
            'file_url',
            'description',
            'expiry_date',
            'size_bytes',
            'size_display',
            'size',
            'created_at',
            'last_updated',
        ]
        read_only_fields = ['id', 'size_bytes', 'size', 'created_at', 'last_updated']

    def get_size_display(self, obj):
        return _humanize_bytes(getattr(obj, 'size_bytes', 0))

    def validate_folder(self, folder):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return folder
        if getattr(request.user, 'role', None) == 'admin':
            return folder

        # HR/Employee: folder must match current user's BU
        try:
            bu_id = request.user.employee.employeeorganization.business_unit_id
        except AttributeError:
            bu_id = None
        if not bu_id or folder.business_unit_id != bu_id:
            raise serializers.ValidationError('You cannot upload documents to this folder.')
        return folder

    def create(self, validated_data):
        file_obj = validated_data.get('file_url')
        if file_obj is not None:
            validated_data['size_bytes'] = int(getattr(file_obj, 'size', 0) or 0)
            validated_data['size'] = _humanize_bytes(validated_data['size_bytes'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        file_obj = validated_data.get('file_url')
        if file_obj is not None:
            validated_data['size_bytes'] = int(getattr(file_obj, 'size', 0) or 0)
            validated_data['size'] = _humanize_bytes(validated_data['size_bytes'])
        return super().update(instance, validated_data)

