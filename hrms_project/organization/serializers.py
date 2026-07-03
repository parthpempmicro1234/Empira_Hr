from rest_framework import serializers
from django.db import transaction

from accounts.models import Employee
from .models import BusinessUnit, Department, SubDepartment, WorkLocation, LeaveDays, FeedPost, PollOption, FeedPostComment, FeedPostImage

class BusinessUnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessUnit
        fields = ['id', 'name', 'is_active']
        
class DepartmentSerializer(serializers.ModelSerializer):
    business_unit_name = serializers.CharField(
        source='business_unit.name',
        read_only=True
    )
    class Meta:
        model = Department
        fields = ['id', 'name', 'business_unit', 'business_unit_name']
        
class SubDepartmentSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(
        source='department.name',
        read_only=True
    )

    class Meta:
        model = SubDepartment
        fields = ['id', 'name', 'department', 'department_name']
        
class WorkLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkLocation
        fields = ['id', 'name', 'city', 'latitude', 'longitude', 'radius_meters']
        
class EmployeeOrganizationSerializer(serializers.ModelSerializer):
    
    def validate(self, data):
        bu = data.get('business_unit')
        dept = data.get('department')
        sub = data.get('sub_department')
    
        if dept and bu:
            if dept.business_unit_id != bu.id:
                raise serializers.ValidationError({
                    "department": "Department not under selected business unit"
                })
    
        if sub and dept:
            if sub.department_id != dept.id:
                raise serializers.ValidationError({
                    "sub_department": "SubDepartment not under selected department"
                })
    
        return data
    
class OrgEmployeeDirectorySerializer(serializers.ModelSerializer):
    business_unit = serializers.CharField(source='employeeorganization.business_unit.name', read_only=True)
    department = serializers.CharField(source='employeeorganization.department.name', read_only=True)
    sub_department = serializers.CharField(source='employeeorganization.sub_department.name', read_only=True)
    work_location = serializers.CharField(source='employeeorganization.work_location.name', read_only=True)

    class Meta:
        model = Employee
        fields = [
            'id',
            'display_name',
            'profile_image',
            'job_title_primary',
            'work_email',
            'business_unit',
            'department',
            'sub_department',
            'profile_image',
            'work_location'
        ]
        

class OrgTreeSerializer(serializers.ModelSerializer):
    work_location = serializers.CharField(source='employeeorganization.work_location.name', read_only=True)
    department = serializers.CharField(source='employeeorganization.department.name', read_only=True)
    sub_department = serializers.CharField(source='employeeorganization.sub_department.name', read_only=True)
    business_unit = serializers.IntegerField(source='employeeorganization.business_unit.id', read_only=True)

    reporting_to = serializers.PrimaryKeyRelatedField(read_only=True)
    reportee_count = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id',
            'display_name',
            'profile_image',
            'job_title_primary',
            'employee_code',
            'work_location',
            'department',
            'sub_department',
            'business_unit',
            'reporting_to',
            'reportee_count'
        ]

    def get_reportee_count(self, obj):
        return obj.subordinates.filter(is_active=True).count()

class LeaveDaysSerializer(serializers.ModelSerializer):
    business_unit_name = serializers.CharField(source='business_unit.name', read_only=True)

    class Meta:
        model = LeaveDays
        fields = ['id', 'name', 'date', 'business_unit', 'business_unit_name', 'is_active']

class PollOptionSerializer(serializers.ModelSerializer):
    vote_count = serializers.SerializerMethodField()
    has_voted = serializers.SerializerMethodField()
    
    voters = serializers.SerializerMethodField()

    class Meta:
        model = PollOption
        fields = ['id', 'option_text', 'vote_count', 'has_voted', 'voters']

    def get_vote_count(self, obj):
        return len(obj.votes.all())

    def get_voters(self, obj):
        employees = [vote.employee for vote in obj.votes.all()]
        return PollVoterSerializer(employees, many=True, context=self.context).data

    def get_has_voted(self, obj):
        request = self.context.get('request')
        if request and hasattr(request.user, 'employee'):
            return any(vote.employee_id == request.user.employee.id for vote in obj.votes.all())
        return False

class FeedPostImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedPostImage
        fields = ['id', 'image']

class FeedPostSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.display_name', read_only=True)
    author_avatar = serializers.ImageField(source='author.profile_picture', read_only=True)
    user_reaction = serializers.CharField(read_only=True, allow_null=True)
    
    poll_options = PollOptionSerializer(many=True, required=False)
    images = FeedPostImageSerializer(many=True, read_only=True)

    class Meta:
        model = FeedPost
        fields = [
            'id', 'author', 'author_name', 'author_avatar', 'post_type', 
            'content', 'target_business_unit', 'target_department', 
            'created_at', 'poll_options', 'images', 'likes_count', 'user_reaction', 'comments_count'
        ]
        read_only_fields = ['author'] 
    def validate(self, attrs):

        post_type = attrs.get('post_type')
        poll_options = attrs.get('poll_options', [])

        if post_type == 'poll':

            if not poll_options or len(poll_options) < 2:
                raise serializers.ValidationError({
                    "poll_options": "A poll must contain at least two options."
                })
        else:
            attrs['poll_options'] = []

        return attrs
    @transaction.atomic 
    def create(self, validated_data):
        poll_options_data = validated_data.pop('poll_options', [])
        images_data = validated_data.pop('images_data', [])
        post = FeedPost.objects.create(**validated_data)
        

        if post.post_type == 'poll' and poll_options_data:
            options_to_create = [
                PollOption(feed_post=post, option_text=opt['option_text']) 
                for opt in poll_options_data
            ]
            PollOption.objects.bulk_create(options_to_create)

        if images_data:
            image_objects = [
                FeedPostImage(post=post, image=img_file) 
                for img_file in images_data
            ]
            FeedPostImage.objects.bulk_create(image_objects)
            
        return post
        
class VoteSerializer(serializers.Serializer):
    option_id = serializers.IntegerField(required=True)
    
class PollVoterSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='user.employee.display_name', read_only=True)

    class Meta:
        model = Employee
        fields = ['id', 'name']

class FeedPostCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='employee.display_name', read_only=True)
    author_avatar = serializers.ImageField(source='employee.profile_image', read_only=True)

    class Meta:
        model = FeedPostComment
        fields = ['id', 'content', 'created_at', 'author_name', 'author_avatar']
        read_only_fields = ['id', 'created_at', 'author_name', 'author_avatar']