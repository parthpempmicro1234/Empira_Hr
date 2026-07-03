from datetime import date, timedelta
import secrets

from django.db.models import Q
from django.core.cache import cache
from django.contrib.auth import get_user_model

# Create your views here.
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.viewsets import GenericViewSet, ModelViewSet
from rest_framework.exceptions import PermissionDenied
from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.mixins import RetrieveModelMixin, UpdateModelMixin
from rest_framework.filters import SearchFilter
from rest_framework.decorators import action
from rest_framework.generics import CreateAPIView, get_object_or_404
from rest_framework_simplejwt.tokens import RefreshToken

from organization.serializers import OrgTreeSerializer
from organization.views import base_queryset
from .models import Employee, Zipcode
from .serializers import AddressSerializer, CustomLoginSerializer, DashbordSerializer, EmployeeCreateSerializer, EmployeeJobSerializer, EmployeeMiniSerializer, EmployeeProfileSerializer, EmployeeSerializer, IdentitySerializer, WelcomeEmployeeSerializer, SortProfile
from .permissions import IsAdminHRorSelf, IsAdminOrHr
from core.mixins import DeleteMessageMixin
from .tasks import send_otp_email_task


User = get_user_model()
OTP_EXPIRY_SECONDS = 300


def generate_secure_otp():
    """Generates a secure 6-digit OTP"""
    return str(secrets.SystemRandom().randint(100000, 999999))

class RequestLoginOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get('email', '').strip().lower()

        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        otp = generate_secure_otp()
        cache_key = f"otp_login_{email}"
        
        cache.set(cache_key, otp, timeout=OTP_EXPIRY_SECONDS)
        
        send_otp_email_task.delay(email, otp)

        return Response({"message": "If the email is valid, an OTP will be sent."}, status=status.HTTP_200_OK)

class VerifyLoginOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        user_otp = request.data.get('otp', '').strip()

        if not email or not user_otp:
            return Response({"error": "Email and OTP are required"}, status=status.HTTP_400_BAD_REQUEST)

        cache_key = f"otp_login_{email}"
        valid_otp = cache.get(cache_key)

        if valid_otp and str(valid_otp) == str(user_otp):
            cache.delete(cache_key)
            
            if not User.objects.filter(work_email=email).exists():
                return Response({"error": "User does not exist"}, status=status.HTTP_404_NOT_FOUND)
            
            user = User.objects.filter(work_email=email)

            refresh = RefreshToken.for_user(user)
            return Response({
                "message": "Login Successful",
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                }
            }, status=status.HTTP_200_OK)
            
        return Response({"error": "Invalid or expired OTP"}, status=status.HTTP_401_UNAUTHORIZED)

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        
        if User.objects.filter(work_email=email).exists():
            otp = generate_secure_otp()
            cache.set(f"otp_reset_{email}", otp, timeout=OTP_EXPIRY_SECONDS)
            send_otp_email_task.delay(email, otp, context="reset")

        return Response({"message": "If an account with that email exists, a reset code has been sent."}, status=status.HTTP_200_OK)

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        user_otp = request.data.get('otp', '').strip()
        new_password = request.data.get('new_password')

        if not all([email, user_otp, new_password]):
            return Response({"error": "Missing fields"}, status=status.HTTP_400_BAD_REQUEST)

        cache_key = f"otp_reset_{email}"
        valid_otp = cache.get(cache_key)

        if valid_otp and str(valid_otp) == str(user_otp):
            try:
                user = User.objects.get(work_email=email)
                user.set_password(new_password)
                user.save()
                cache.delete(cache_key)
                
                return Response({"message": "Password reset successfully. You can now log in."}, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                pass

        return Response({"error": "Invalid or expired OTP"}, status=status.HTTP_400_BAD_REQUEST)

class EmployeeCreateView(CreateAPIView):
    queryset = Employee.objects.all()
    serializer_class = EmployeeCreateSerializer
    permission_classes = [IsAdminOrHr]

class EmployeeViewSet(DeleteMessageMixin, ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsAdminHRorSelf]
    delete_message = "Employee account deleted successfully."

    def get_queryset(self):
        user = self.request.user

        if user.role in ['admin', 'hr']:
            return Employee.objects.all()

        return Employee.objects.filter(user=user)

    def perform_destroy(self, instance):
        request_user = self.request.user

        if request_user.role not in ['admin', 'hr']:
            raise PermissionDenied("You are not allowed to delete employees")

        instance.is_active = False
        instance.save()

        if instance.user:
            instance.user.is_active = False
            instance.user.save()
    
        
class CustomLoginView(TokenObtainPairView):
    serializer_class = CustomLoginSerializer
    
    
class WelcomeScreenAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        emp = getattr(user, 'employee', None)

        if not emp:
            return Response(
                {"message": "Employee profile not found"},
                status=404
            )

        employee = Employee.objects.select_related(
            'reporting_to',
            'employeeorganization__department',
            'employeeorganization__sub_department',
            'employeeorganization__work_location'
        ).get(user=user)
        employee_data = WelcomeEmployeeSerializer(employee).data

        reporting_to = employee.reporting_to
        reporting_to_data = (EmployeeMiniSerializer(reporting_to).data if reporting_to else None)

        peers = Employee.objects.filter(reporting_to=employee.reporting_to).exclude(id=employee.id)
        peers_data = EmployeeMiniSerializer(peers, many=True).data

        total_fields = 11
        filled_fields = sum([
            bool(employee.fname),
            bool(employee.lname),
            bool(employee.display_name),
            bool(employee.personal_email),
            bool(employee.work_email),
            bool(employee.job_title_primary),
            bool(employee.date_of_birth),
            bool(employee.gender),
            bool(employee.nationality),
            bool((organization := getattr(employee, 'employeeorganization', None)) and getattr(organization, 'department', None)),
            bool((organization := getattr(employee, 'employeeorganization', None)) and getattr(organization, 'work_location', None))
        ])

        profile_completion = round((filled_fields / total_fields) * 100, 2)

        return Response({
            "employeeDetails": employee_data,
            "myTeamEmployees": {
                "reportingManager": reporting_to_data,
                "peers": peers_data
            },
            "profileCompletionProgress": profile_completion
        })
        
class PublicProfileHeaderViewSet(ReadOnlyModelViewSet):
    queryset = Employee.objects.filter(is_active=True)
    serializer_class = WelcomeEmployeeSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def me(self, request):
        emp = getattr(request.user, 'employee', None)

        if not emp:
            return Response({"message": "Employee not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(emp)
        return Response(serializer.data)

class EmployeeProfileView(APIView):

    def get_employee(self, request, id=None):
        user = request.user
        emp = getattr(user, 'employee', None)
        
        if id:
            if user.role not in ['admin', 'hr']:
                if id != user.employee.id:
                    raise PermissionDenied("Not allowed")
            return get_object_or_404(base_queryset(), id=id, is_active=True)
        
        return base_queryset().filter(id=emp.id).first()

    def build_response(self, employee):
        addresses = employee.addresses.all()
        current_address = addresses.filter(address_type='current').first()
        permanent_address = addresses.filter(address_type='permanent').first()

        identities = employee.identities.all()

        return {
            "basic": EmployeeProfileSerializer(employee).data,

            "addresses": {
                "current": AddressSerializer(current_address).data if current_address else None,
                "permanent": AddressSerializer(permanent_address).data if permanent_address else None,
            },

            "identity": IdentitySerializer(identities, many=True).data
        }

    def get(self, request, id=None):
        employee = self.get_employee(request, id)

        if not employee:
            return Response({"message": "Employee not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(self.build_response(employee))

    def patch(self, request, id=None):
        employee = self.get_employee(request, id)
        user = request.user

        if not employee:
            return Response({"message": "Employee not found"}, status=status.HTTP_404_NOT_FOUND)

        data = request.data

        if user.role in ['admin', 'hr']:

            basic_data = data.get('basic', {})
            if basic_data:
                serializer = EmployeeSerializer(
                    employee,
                    data=basic_data,
                    partial=True,
                    context={'request': request}
                )
                serializer.is_valid(raise_exception=True)
                serializer.save()

            addresses = data.get('addresses', {})

            for addr_type in ['current', 'permanent']:
                addr_data = addresses.get(addr_type)

                if addr_data:
                    obj = employee.addresses.filter(address_type=addr_type).first()

                    serializer = AddressSerializer(
                        obj,
                        data=addr_data,
                        partial=True
                    )
                    serializer.is_valid(raise_exception=True)
                    serializer.save(
                        employee=employee,
                        address_type=addr_type
                    )

            identities = data.get('identity', [])

            for identity_data in identities:
                identity_type = identity_data.get('identity_type')

                obj = employee.identities.filter(identity_type=identity_type).first()

                serializer = IdentitySerializer(
                    obj,
                    data=identity_data,
                    partial=True
                )
                serializer.is_valid(raise_exception=True)
                serializer.save(employee=employee)

            return Response(self.build_response(employee))


        if user.role == 'employee':
            
            if 'identity' in data:
                return Response({
                    "message": "You are not allowed to update identity information"
                }, status=403)
            
            allowed_fields = [
                'fname', 'lname', 'display_name',
                'personal_email', 'profile_image',
                'date_of_birth', 'gender',
                'marital_status', 'nationality',
                'blood_group', 'mobile_number'
            ]

            basic_data = data.get('basic', {})
            address_data = data.get('addresses', {})

            incoming_fields = set(basic_data.keys())
            restricted_fields = incoming_fields - set(allowed_fields)

            if restricted_fields:
                return Response({
                    "message": "You cannot update these fields",
                    "restricted_fields": list(restricted_fields)
                }, status=status.HTTP_403_FORBIDDEN)

            if basic_data:
                serializer = EmployeeSerializer(
                    employee,
                    data=basic_data,
                    partial=True,
                    context={'request': request}
                )
                serializer.is_valid(raise_exception=True)
                serializer.save()

        
            for addr_type in ['current', 'permanent']:
                addr = address_data.get(addr_type)

                if addr:
                    obj = employee.addresses.filter(address_type=addr_type).first()

                    serializer = AddressSerializer(
                        obj,
                        data=addr,
                        partial=True
                    )
                    serializer.is_valid(raise_exception=True)
                    serializer.save(
                        employee=employee,
                        address_type=addr_type
                    )

            return Response(self.build_response(employee))

        return Response({"message": "Invalid role"}, status=403)
    
    
class EmployeeJobViewSet(GenericViewSet, RetrieveModelMixin, UpdateModelMixin):
    serializer_class = EmployeeJobSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Employee.objects.filter(is_active=True).select_related(
            'employeeorganization',
            'employeeorganization__business_unit',
            'employeeorganization__department',
            'employeeorganization__sub_department',
            'employeeorganization__work_location',
            'reporting_to',
            'reporting_to__reporting_to'
        )

    def list(self, request):
        emp = getattr(request.user, 'employee', None)

        if not emp:
            return Response({"message": "Employee not found"}, status=404)

        serializer = self.get_serializer(emp)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        user = request.user

        if user.role not in ['admin', 'hr']:
            raise PermissionDenied("Not allowed")

        employee = get_object_or_404(self.get_queryset(), id=pk)
        serializer = self.get_serializer(employee)
        return Response(serializer.data)

    def partial_update(self, request, pk=None):
        user = request.user

        if user.role not in ['admin', 'hr']:
            raise PermissionDenied("Not allowed")

        employee = get_object_or_404(self.get_queryset(), id=pk)

        serializer = self.get_serializer(
            employee,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)
    
class EmployeeTimelineView(ReadOnlyModelViewSet):
    queryset = Employee.objects.filter(is_active=True)
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        employee = getattr(request.user, 'employee', None)

        if not employee:
            return Response({"message": "Employee not found"}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            "employee_id": employee.id,
            "name": employee.display_name,
            "timeline": self.build_timeline(employee)
        })
    
    def retrieve(self, request, pk=None):
        employee = self.get_queryset().filter(id=pk).first()

        if not employee:
            return Response({"message": "Employee not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "employee_id": employee.id,
            "name": employee.display_name,
            "timeline": self.build_timeline(employee)
        })
        
    def build_timeline(self, employee):
        timeline = []
        today = date.today()

        if employee.date_of_joining:
            join_date = employee.date_of_joining

            for year in range(join_date.year + 1, today.year + 1):
                anniversary_date = join_date.replace(year=year)

                timeline.append({
                    "type": "work_anniversary",
                    "title": f"{year - join_date.year} Year Work Anniversary",
                    "date": anniversary_date
                })

            timeline.append({
                "type": "joined",
                "title": "Joined Company",
                "date": join_date
            })

        grouped = {}

        for event in timeline:
            year = event["date"].year
            grouped.setdefault(year, []).append(event)

        result = []
        for year in sorted(grouped.keys(), reverse=True):
            result.append({
                "year": year,
                "events": sorted(
                    grouped[year],
                    key=lambda x: x["date"],
                    reverse=True
                )
            })

        return result
    
class DeshbordViewSet(ReadOnlyModelViewSet):
    queryset = Employee.objects.filter(is_active=True).only('id', 'display_name', 'date_of_birth', 'date_of_joining', 'profile_image', 'job_title_primary')
    permission_classes = [IsAuthenticated]
    serializer_class = DashbordSerializer
    
    def list(self, request):
        today = date.today()
        next_20_days = today + timedelta(days=20)
        
        emp = getattr(request.user, 'employee', None)
        
        emp_name = emp.display_name if emp else None
        emp_id = emp.id if emp else None
        
        employees = self.get_queryset()
        
        birthdays_today = employees.filter(
            date_of_birth__month=today.month,
            date_of_birth__day=today.day
        )
        
        upcoming_birthdays = employees.filter(
            date_of_birth__isnull = False
        ).exclude(
            date_of_birth__month=today.month,
            date_of_birth__day=today.day
        ).filter(
            Q(date_of_birth__month=today.month, date_of_birth__day__gt=today.day) |
            Q(date_of_birth__month=next_20_days.month, date_of_birth__day__lte=next_20_days.day)
        )
    
        anniversary_today = employees.filter(
            date_of_joining__month=today.month,
            date_of_joining__day=today.day
        )
        
        upcoming_anniversary = employees.filter(
            date_of_joining__isnull=False
        ).exclude(
            date_of_joining__month=today.month,
            date_of_joining__day=today.day
        ).filter(
            Q(date_of_joining__month=today.month, date_of_joining__day__gt=today.day) |
            Q(date_of_joining__month=next_20_days.month, date_of_joining__day__lte=next_20_days.day)
        )
        
        new_joined_today = employees.filter(
            date_of_joining=today
        )
        
        recent_joined = employees.filter(date_of_joining__range=(today - timedelta(days=5), today)).exclude(date_of_joining=today)
        
        return Response({
            "employee": {
                "id": emp_id,
                "display_name": emp_name
            },
            "birthdays_today": DashbordSerializer(birthdays_today, many=True, context={'request': request}).data,
            "upcoming_birthdays": DashbordSerializer(upcoming_birthdays, many=True, context={'request': request}).data,

            "anniversary_today": DashbordSerializer(anniversary_today, many=True, context={'request': request}).data,
            "upcoming_anniversary": DashbordSerializer(upcoming_anniversary, many=True, context={'request': request}).data,

            "new_joined_today": DashbordSerializer(new_joined_today, many=True, context={'request': request}).data,
            "recent_joined": DashbordSerializer(recent_joined, many=True, context={'request': request}).data
        })
        
class ZipcodeLookupAPIView(APIView):

    def get(self, request):
        code = request.query_params.get('code', '').strip()


        if not code:
            return Response(
                {"message": "Zipcode is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        zip_qs = Zipcode.objects.select_related(
            'city__state__country'
        ).filter(code=code)

        if not zip_qs.exists():
            return Response(
                {"message": "Invalid zipcode"},
                status=status.HTTP_404_NOT_FOUND
            )

        first = zip_qs.first()

        country = first.city.state.country.name
        country_id = first.city.state.country.id
        state = first.city.state.name
        state_id = first.city.state.id
        district = first.district  

        seen = set()
        cities = []

        for z in zip_qs:
            if z.city.id in seen:
                continue
            seen.add(z.city.id)

            cities.append({
                "city_id": z.city.id,
                "city": z.city.name
            })

        return Response({
            "zipcode": code,
            "country": country,
            "country_id":country_id,
            "state": state,
            "state_id":state_id,
            "district": district,
            "count": len(cities),
            "cities": cities
        })
        
class PublicSortProfileViewSet(ReadOnlyModelViewSet):
    queryset = Employee.objects.filter(is_active=True)
    serializer_class = SortProfile
    permission_classes = [IsAuthenticated]
    
    filter_backends = [SearchFilter]
    search_fields = ['display_name']
