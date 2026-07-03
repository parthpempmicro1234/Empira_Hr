from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Exists, OuterRef, Q, F, Subquery
from django.db import transaction
from django.contrib.auth.models import User
# Create your views here.
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.viewsets import ModelViewSet
from rest_framework.generics import ListAPIView, get_object_or_404
from rest_framework.exceptions import NotFound
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from accounts.models import Employee
from accounts.permissions import IsAdminOrHr
from organization.permissions import IsAdminOnly, ReadOnlyForEmployee
from organization.serializers import LeaveDaysSerializer, FeedPostCommentSerializer, FeedPostSerializer, VoteSerializer, BusinessUnitSerializer, DepartmentSerializer, OrgEmployeeDirectorySerializer, OrgTreeSerializer, SubDepartmentSerializer, WorkLocationSerializer, EmployeeOrganizationSerializer
from .models import BusinessUnit, Department, EmployeeOrganization, SubDepartment, WorkLocation, LeaveDays, FeedPost, PollOption, PollVote, FeedPostLike
from notifications.services import (
    notify_mentions_in_text,
    notify_poll_vote,
    notify_post_comment,
    notify_post_reaction,
    notify_system_announcement,
)

from core.mixins import DeleteMessageMixin
import re

class BusinessUnitViewSet(DeleteMessageMixin, ModelViewSet):
    queryset = BusinessUnit.objects.all()
    serializer_class = BusinessUnitSerializer
    delete_message = "Business unit deleted successfully."

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAdminOnly()]
        return [ReadOnlyForEmployee()]
    
class DepartmentViewSet(DeleteMessageMixin, ModelViewSet):
    queryset = Department.objects.select_related('business_unit')
    serializer_class = DepartmentSerializer
    delete_message = "Department deleted successfully."

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAdminOnly()]
        return [ReadOnlyForEmployee()]

class SubDepartmentViewSet(DeleteMessageMixin, ModelViewSet):
    queryset = SubDepartment.objects.select_related('department')
    serializer_class = SubDepartmentSerializer
    delete_message = "Sub-department deleted successfully."

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAdminOnly()]
        return [ReadOnlyForEmployee()]

class WorkLocationViewSet(DeleteMessageMixin, ModelViewSet):
    queryset = WorkLocation.objects.all()
    serializer_class = WorkLocationSerializer
    delete_message = "Work location deleted successfully."

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAdminOnly()]
        return [ReadOnlyForEmployee()]
    
class EmployeeOrganizationViewSet(ModelViewSet):
    queryset = EmployeeOrganization.objects.select_related('employee', 'business_unit', 'department', 'sub_department', 'work_location')
    serializer_class = EmployeeOrganizationSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update']:
            return [IsAdminOrHr()]
        return [ReadOnlyForEmployee()]
    
class EmployeeOrganizationDirectoryViewSet(ListAPIView):
    queryset = Employee.objects.filter(is_active=True)
    serializer_class = OrgEmployeeDirectorySerializer

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    filterset_fields = {
        'employeeorganization__business_unit': ['exact'],
        'employeeorganization__department': ['exact'],
        'employeeorganization__sub_department': ['exact'],
        'employeeorganization__work_location': ['exact'],
        'job_title_primary': ['exact', 'icontains'],
    }

    search_fields = ['display_name', 'work_email']

    ordering_fields = ['display_name', 'job_title_primary']
    ordering = ['display_name']

    def get_queryset(self):
        return super().get_queryset().select_related(
            'employeeorganization',
            'employeeorganization__business_unit',
            'employeeorganization__department',
            'employeeorganization__sub_department',
            'employeeorganization__work_location'
        )

def base_queryset():
    return Employee.objects.filter(is_active=True).select_related(
        'employeeorganization',
        'employeeorganization__business_unit',
        'employeeorganization__department',
        'employeeorganization__sub_department',
        'employeeorganization__work_location'
    ).prefetch_related('subordinates')  

def get_hierarchy_chain(emp):
    chain = []

    current = emp
    while current:
        chain.append(current)
        current = current.reporting_to
    return chain

def get_hierarchy_with_subordinates(emp):
    chain = get_hierarchy_chain(emp)
    chain_ids = [p.id for p in chain]

    subs = Employee.objects.filter(
        reporting_to__in=chain_ids,
        is_active=True
    ).values_list('id', flat=True)

    return set(chain_ids) | set(subs)


class OrgTreeView(ListAPIView):
    serializer_class = OrgTreeSerializer

    def get_queryset(self):
        emp = self.request.user.employee

        ids = get_hierarchy_with_subordinates(emp)

        return base_queryset().filter(id__in=ids)
    

class MyOrgTreeView(APIView):

    def get(self, request, id=None):
        
        if id:
            employee = get_object_or_404(
                base_queryset(),
                id=id,
                is_active=True
            )
        else:
            employee = getattr(request.user, 'employee', None)

            if not employee:
                return Response(
                    {"message": "Employee not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            employee = base_queryset().filter(id=employee.id).first()

        if not employee:
            return Response(
                {"message": "Employee not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        reporting_manager = None
        if employee.reporting_to_id:
            reporting_manager = base_queryset().filter(
                id=employee.reporting_to_id
            ).first()

        peers = base_queryset().filter(
            reporting_to_id=employee.reporting_to_id
        )

        reportees = base_queryset().filter(
            reporting_to=employee
        )

        serializer = OrgTreeSerializer
        
        serializer_context = {'request': request}

        return Response({
            "employee": serializer(employee, context=serializer_context).data,
            "reportingManager": serializer(reporting_manager, context=serializer_context).data if reporting_manager else None,
            "peers": serializer(peers, many=True, context=serializer_context).data,
            "reportees": serializer(reportees, many=True, context=serializer_context).data
        })
        
class DepartmentOrgTreeView(ListAPIView):
    serializer_class = OrgTreeSerializer

    def get_queryset(self):
        emp = self.request.user.employee

        org = getattr(emp, 'employeeorganization', None)
        if not org:
            return Employee.objects.none()

        dept_id = org.department_id

        ids = get_hierarchy_with_subordinates(emp)

        return base_queryset().filter(
            id__in=ids,
            employeeorganization__department_id=dept_id
        )
        
class EmployeeReporteesView(ListAPIView):
    serializer_class = OrgTreeSerializer

    def get_queryset(self):
        emp_id = self.kwargs.get('id')

        if emp_id:
            try:
                employee = Employee.objects.get(id=emp_id, is_active=True)
            except Employee.DoesNotExist:
                raise NotFound("Employee not found")
        else:
            employee = getattr(self.request.user, 'employee', None)

            if not employee:
                raise NotFound("Authenticated employee not found")
            
        return base_queryset().filter( 
            Q(reporting_to=employee)
        )

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        if not queryset.exists():
            return Response(
                {"message": "No reportees found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class LeaveDaysViewSet(ModelViewSet):

    serializer_class = LeaveDaysSerializer
    permission_classes = [ReadOnlyForEmployee]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = {
        'date': ['year', 'month', 'gte', 'lte'],
        'business_unit': ['exact'],
        'is_active': ['exact'],
    }
    search_fields = ['name']

    def get_queryset(self):
        return LeaveDays.objects.select_related('business_unit').filter(is_active=True)


class FeedPostViewSet(ModelViewSet):
    serializer_class = FeedPostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        employee = getattr(user, 'employee', None)
        if not employee:
            return FeedPost.objects.none()
            
        org = getattr(employee, 'employeeorganization', None)
        if not org:
            return FeedPost.objects.none()

        target = self.request.query_params.get('target', 'all').lower()

        qs = FeedPost.objects.filter(is_active=True)
        
        qs = qs.annotate(
            user_reaction=Subquery(
                FeedPostLike.objects.filter(
                    post_id=OuterRef('pk'), 
                    employee=employee
                ).values('reaction_type')[:1] 
            )
        )

        bu = org.business_unit
        dept = org.department

        if target == 'department' and bu and dept:
            qs = qs.filter(target_business_unit=bu, target_department=dept)
            
        elif target == 'organization' and bu:
            qs = qs.filter(target_business_unit=bu, target_department__isnull=True)
            
        elif target == 'global':
            qs = qs.filter(target_business_unit__isnull=True, target_department__isnull=True)
            
        else:
            condition = Q(target_business_unit__isnull=True, target_department__isnull=True)
            
            if bu:
                condition |= Q(target_business_unit=bu, target_department__isnull=True)
                if dept:
                    condition |= Q(target_business_unit=bu, target_department=dept)
            
            qs = qs.filter(condition)

        qs = qs.select_related(
            'author', 'author__user', 'target_business_unit', 'target_department'
        ).prefetch_related(
            'poll_options', 
            'poll_options__votes',
            'poll_options__votes__employee',
            'poll_options__votes__employee__user'
        ).annotate(
            user_has_liked=Exists(
                FeedPostLike.objects.filter(post_id=OuterRef('pk'), employee=user.employee)
            )
        ).order_by('-created_at') 

        return qs

    def perform_create(self, serializer):
        employee = self.request.user.employee
        org = getattr(employee, 'employeeorganization', None)

        visibility = self.request.data.get('visibility', 'global').lower()
        
        target_bu = org.business_unit if visibility in ['business_unit', 'department'] else None
        target_dept = org.department if visibility == 'department' else None

        images_data = self.request.FILES.getlist('images')

        post = serializer.save(
            author=employee,
            target_business_unit=target_bu,
            target_department=target_dept,
            images_data=images_data 
        )
        notify_mentions_in_text(
            employee,
            post.content,
            extra_data={'post_id': post.id},
        )
        if post.post_type == 'announcement':
            notify_system_announcement(post, employee)

    @action(detail=True, methods=['post'], serializer_class=VoteSerializer)
    def vote(self, request, pk=None):
        feed_post = self.get_object()
        employee = request.user.employee
        
        if feed_post.post_type != 'poll':
            return Response({"error": "This post is not a poll."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = VoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        option_id = serializer.validated_data['option_id']

        try:
            poll_option = feed_post.poll_options.get(id=option_id)
        except PollOption.DoesNotExist:
            return Response({"error": "Invalid poll option."}, status=status.HTTP_400_BAD_REQUEST)

        if PollVote.objects.filter(feed_post=feed_post, employee=employee).exists():
            return Response({"error": "You have already voted on this poll."}, status=status.HTTP_400_BAD_REQUEST)

        PollVote.objects.create(
            feed_post=feed_post,
            poll_option=poll_option,
            employee=employee
        )
        notify_poll_vote(feed_post, poll_option, employee)

        return Response({"message": "Vote recorded successfully."}, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def react(self, request, pk=None):
        post = self.get_object()
        employee = request.user.employee
        new_reaction = request.data.get('reaction_type', 'like')

        valid_types = dict(FeedPostLike.REACTION_CHOICES).keys()
        if new_reaction not in valid_types:
            return Response({"error": "Invalid reaction type"}, status=status.HTTP_400_BAD_REQUEST)

        notify_reaction = False
        with transaction.atomic():
            reaction = FeedPostLike.objects.filter(post=post, employee=employee).first()

            if reaction:
                if reaction.reaction_type == new_reaction:
                    reaction.delete()
                    FeedPost.objects.filter(pk=post.pk).update(likes_count=F('likes_count') - 1)
                    is_active = False
                else:
                    reaction.reaction_type = new_reaction
                    reaction.save()
                    is_active = True
                    notify_reaction = True
            else:
                FeedPostLike.objects.create(post=post, employee=employee, reaction_type=new_reaction)
                FeedPost.objects.filter(pk=post.pk).update(likes_count=F('likes_count') + 1)
                is_active = True
                notify_reaction = True

        if notify_reaction and is_active:
            notify_post_reaction(post, employee, new_reaction)

        post.refresh_from_db(fields=['likes_count'])
        return Response({
            "is_active": is_active,
            "current_reaction": new_reaction if is_active else None,
            "likes_count": post.likes_count
        })
        
    @action(detail=True, methods=['get', 'post'], serializer_class=FeedPostCommentSerializer)
    def comments(self, request, pk=None):
        post = self.get_object()

        if request.method == 'GET':
            comments = post.comments.select_related('employee').all()
            serializer = self.get_serializer(comments, many=True)
            return Response(serializer.data)

        if request.method == 'POST':
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            employee = request.user.employee
            comment = serializer.save(post=post, employee=employee)

            FeedPost.objects.filter(pk=post.pk).update(comments_count=F('comments_count') + 1)

            notify_mentions_in_text(
                employee,
                comment.content,
                extra_data={'post_id': post.id, 'comment_id': comment.id},
            )
            notify_post_comment(post, comment, employee)

            return Response(serializer.data, status=status.HTTP_201_CREATED)