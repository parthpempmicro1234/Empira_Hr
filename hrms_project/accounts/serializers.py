from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError

from django.contrib.auth.password_validation import validate_password
from django.db import transaction

from .models import IdentityInformation, User, Employee, Address
from organization.models import BusinessUnit, Department, EmployeeOrganization, SubDepartment, WorkLocation


class EmployeeCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    def validate_password(self, value):
        validate_password(value) 
        return value
    
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, write_only=True)
    user_role = serializers.CharField(
        source='user.role',
        read_only=True
    )
    
    organization = serializers.DictField(write_only=True)
    addresses = serializers.DictField(write_only=True)
    identity = serializers.ListField(write_only=True)
    
    class Meta:
        model = Employee
        fields = [
            'id',
            'fname',
            'lname',
            'display_name',
            'employee_code',
            'work_email',
            'personal_email',
            'mobile_number',
            'profile_image',
            'date_of_birth',
            'gender',
            'marital_status',
            'nationality',
            'blood_group',
        
            'date_of_joining',
            'job_title_primary',
            'job_title_secondary',
            'worker_type',
            'time_type',
            'probation_start',
            'probation_end',
        
            'reporting_to',
            'is_active',
            'created_at',
            'updated_at',
        
            'password',
            'role',
            'user_role',
            'organization',
            'addresses',
            'identity',
        ]
        
    def validate(self, data):
        org = data.get('organization')
        work_email = data.get('work_email')

        if User.objects.filter(work_email=work_email).exists():
            raise serializers.ValidationError({
                "work_email": "User with this email already exists"
            })

        if org:
            bu_id = org.get('business_unit')
            dept_id = org.get('department')
            sub_id = org.get('sub_department')
    
            bu = BusinessUnit.objects.filter(id=bu_id).first() if bu_id else None
            dept = Department.objects.filter(id=dept_id).first() if dept_id else None
            sub = SubDepartment.objects.filter(id=sub_id).first() if sub_id else None
    
            if bu_id and not bu:
                raise serializers.ValidationError({"business_unit": "Invalid Business Unit"})
    
            if dept_id and not dept:
                raise serializers.ValidationError({"department": "Invalid Department"})
    
            if sub_id and not sub:
                raise serializers.ValidationError({"sub_department": "Invalid SubDepartment"})
    
            if dept and bu:
                if dept.business_unit_id != bu.id:
                    raise serializers.ValidationError({
                        "department": "Department not under selected Business Unit"
                    })
    
            if sub and dept:
                if sub.department_id != dept.id:
                    raise serializers.ValidationError({
                        "sub_department": "SubDepartment not under selected Department"
                    })
    
        return data
    
    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop('password')
        role = validated_data.pop('role', 'employee')
        work_email = validated_data.get('work_email')
        
        org_data = validated_data.pop('organization', None)
        address_data = validated_data.pop('addresses', {})
        identity_data = validated_data.pop('identity', [])
        
        user = User.objects.create_user(work_email=work_email, password=password, role=role)
        user.save()
        
        employee = Employee.objects.create(user=user, **validated_data)
        
        if org_data:
            
            EmployeeOrganization.objects.create(
                employee=employee,
                business_unit_id=org_data.get('business_unit'),
                department_id=org_data.get('department'),
                sub_department_id=org_data.get('sub_department'),
                work_location_id=org_data.get('work_location')
            )
            
        for addr_type in ['current', 'permanent']:
            addr = address_data.get(addr_type)

            if addr:
                serializer = AddressSerializer(
                    data={**addr, "address_type": addr_type}
                )
                serializer.is_valid(raise_exception=True)
                serializer.save(employee=employee)
                
        VALID_TYPES = ['aadhaar', 'pan']
        for id_info in identity_data:

            identity_type = id_info.get('identity_type')

            if not identity_type:
                raise serializers.ValidationError({
                    "identity_type": "This field is required"
                })

            if identity_type not in VALID_TYPES:
                raise serializers.ValidationError({
                    "identity_type": "Invalid identity type"
                })

            if IdentityInformation.objects.filter(
                employee=employee,
                identity_type=identity_type
            ).exists():
                raise serializers.ValidationError({
                    "identity_type": f"{identity_type} already exists"
                })

            serializer = IdentitySerializer(data=id_info)
            serializer.is_valid(raise_exception=True)
            serializer.save(employee=employee, is_verified=False)

        return employee

class EmployeeSerializer(serializers.ModelSerializer):

    class Meta:
        model = Employee
        fields = '__all__'
        
    def validate_mobile_number(self, value):
        if not value:
            return value

        if not value.isdigit():
            raise serializers.ValidationError("Mobile number must contain only digits")

        if len(value) != 10:
            raise serializers.ValidationError("Mobile number must be 10 digits")

        return value

    def update(self, instance, validated_data):
        user = self.context['request'].user

        if user.role == 'employee':
            allowed_fields = {
                'fname', 'lname', 'display_name',
                'personal_email', 'profile_image',
                'date_of_birth', 'gender',
                'marital_status', 'nationality',
                'blood_group', 'mobile_number'
            }
            
            incoming_fields = set(validated_data.keys())
            
            restricted_fields = incoming_fields - allowed_fields
            
            if restricted_fields:
                raise PermissionDenied({
                    "restricted_fields": list(restricted_fields)
                })

            validated_data = {
                key: value
                for key, value in validated_data.items()
                if key in allowed_fields
            }

        return super().update(instance, validated_data)
    
        
class CustomLoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        work_email = attrs.get("work_email")
        password = attrs.get("password")
        
        if work_email is None or password is None:
            raise serializers.ValidationError('Both work_email and password are required.')
        
        user = User.objects.filter(work_email=work_email).first()
        
        if not user:
            raise serializers.ValidationError("User not found")

        if not user.check_password(password):
            raise serializers.ValidationError("Invalid password")
        
        data = super().validate({
            'work_email': user.work_email,
            'password': password
        })
        data["role"] = user.role
        data["work_email"] = user.work_email
        data["user_id"] = user.id
        
        return data

class WelcomeEmployeeSerializer(serializers.ModelSerializer):
    business_unit = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    sub_department = serializers.SerializerMethodField()
    work_location = serializers.SerializerMethodField()

    reporting_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id',
            'fname',
            'lname',
            'profile_image',
            'display_name',
            'employee_code',
            'work_email',
            'profile_image',
            'job_title_primary',
            'job_title_secondary',
            'business_unit',
            'department',
            'sub_department',
            'work_location',
            'reporting_to',
            'reporting_to_name',
        ]
        
    def get_business_unit(self, obj):
        org = getattr(obj, 'employeeorganization', None)
        return getattr(getattr(org, 'business_unit', None), 'name', None)

    def get_department(self, obj):
        org = getattr(obj, 'employeeorganization', None)
        return getattr(getattr(org, 'department', None), 'name', None)
    
    def get_sub_department(self, obj):
        org = getattr(obj, 'employeeorganization', None)
        return getattr(getattr(org, 'sub_department', None), 'name', None)

    def get_work_location(self, obj):
        org = getattr(obj, 'employeeorganization', None)
        return getattr(getattr(org, 'work_location', None), 'name', None)
    
    def get_reporting_to_name(self, obj):
        return obj.reporting_to.display_name if obj.reporting_to else None
        
class EmployeeMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = [
            'id',
            'display_name',
            'job_title_primary',
            'profile_image'
        ]
        
class IdentitySerializer(serializers.ModelSerializer):

    class Meta:
        model = IdentityInformation
        fields = [
            'identity_type',
            'document_number',
            'name_on_document',
            'date_of_birth',
            'parent_name',
            'is_verified',
            'document_file'
        ]
        extra_kwargs = {
            'is_verified': {'read_only': True}
        }

class AddressSerializer(serializers.ModelSerializer):

    country_name = serializers.CharField(source='country.name', read_only=True)
    state_name = serializers.CharField(source='state.name', read_only=True)
    city_name = serializers.CharField(source='city.name', read_only=True)

    class Meta:
        model = Address
        fields = [
            'id',
            'address_type',
            'address_line1',
            'address_line2',
            'zip',

            'country',
            'country_name',

            'state',
            'state_name',

            'city',
            'city_name',

            'latitude',
            'longitude'
        ]
        

class EmployeeProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = Employee
        fields = [
            'id',
            'fname',
            'lname',
            'display_name',
            'employee_code',
            'work_email',
            'personal_email',
            'mobile_number',
            'profile_image',
            'date_of_birth',
            'gender',
            'marital_status',
            'nationality',
            'blood_group',
        ]

        
class EmployeeJobSerializer(serializers.ModelSerializer):
    business_unit = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    sub_department = serializers.SerializerMethodField()
    work_location = serializers.SerializerMethodField()

    reporting_to_name = serializers.SerializerMethodField()
    manager_of_manager = serializers.SerializerMethodField()
    peers = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id',
            'employee_code',
            'job_title_primary',
            'job_title_secondary',
            'date_of_joining',
            'worker_type',
            'time_type',
            'probation_start',
            'probation_end',

            'business_unit',
            'department',
            'sub_department',
            'work_location',

            'reporting_to',
            'reporting_to_name',
            'manager_of_manager',
            'peers',
        ]

        read_only_fields = ['employee_code', 'business_unit', 'manager_of_manager', 'peers', 'reporting_to_name']
    
    def validate(self, data):
        request = self.context.get('request')

        if not request:
            return data

        incoming_fields = set(request.data.keys())
        allowed_fields = set(self.Meta.fields)
        read_only_fields = set(self.Meta.read_only_fields)

        errors = {}

        unknown_fields = incoming_fields - allowed_fields
        if unknown_fields:
            errors['unknown_fields'] = list(unknown_fields)

        restricted_fields = incoming_fields & read_only_fields
        if restricted_fields:
            errors['restricted_fields'] = list(restricted_fields)

        if errors:
            raise ValidationError(errors)

        return data

    def get_business_unit(self, obj):
        org = getattr(obj, 'employeeorganization', None)
        return getattr(getattr(org, 'business_unit', None), 'name', None)

    def get_department(self, obj):
        org = getattr(obj, 'employeeorganization', None)
        return getattr(getattr(org, 'department', None), 'name', None)
    
    def get_sub_department(self, obj):
        org = getattr(obj, 'employeeorganization', None)
        return getattr(getattr(org, 'sub_department', None), 'name', None)

    def get_work_location(self, obj):
        org = getattr(obj, 'employeeorganization', None)
        return getattr(getattr(org, 'work_location', None), 'name', None)

    def get_reporting_to_name(self, obj):
        return obj.reporting_to.display_name if obj.reporting_to else None

    def get_manager_of_manager(self, obj):
        if obj.reporting_to and obj.reporting_to.reporting_to:
            return {
                "id": obj.reporting_to.reporting_to.id,
                "name": obj.reporting_to.reporting_to.display_name
            }
        return None

    def get_peers(self, obj):
        if not obj.subordinates:
            return []

        peers = obj.subordinates.exclude(id=obj.id)

        return [
            {
                "id": emp.id,
                "name": emp.display_name
            }
            for emp in peers
        ]

class DashbordSerializer(serializers.ModelSerializer):

    class Meta:
        model = Employee
        fields = [
            'id',
            'display_name',
            'profile_image',
            'date_of_birth',
            'date_of_joining',
            'job_title_primary'
        ]
        

class SortProfile(serializers.ModelSerializer):
    
    class Meta:
        model = Employee
        fields = [
            'id',
            'display_name',
            'profile_image',
            'job_title_primary',
            'employee_code'
        ]