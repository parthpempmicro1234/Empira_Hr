from django.db import models

# Create your models here.
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from .utils import is_date_weekly_off

def validate_complex_off_days(value):
    if not isinstance(value, dict):
        raise ValidationError("Off days must be a JSON object. Example: {'6': 'all', '5': [1, 3]}")
    
    for day_str, weeks in value.items():
        if not day_str.isdigit() or not (0 <= int(day_str) <= 6):
            raise ValidationError(f"Invalid day key '{day_str}'. Must be a string integer between '0' (Mon) and '6' (Sun).")
        
        if weeks != "all" and not isinstance(weeks, list):
            raise ValidationError(f"Value for day '{day_str}' must be 'all' or a list of integers. Example: [1, 2]")
        
        if isinstance(weeks, list):
            for week_num in weeks:
                if not isinstance(week_num, int) or week_num not in [1, 2, 3, 4, 5]:
                    raise ValidationError(f"Invalid week number '{week_num}'. Must be between 1 and 5.")

class BusinessUnit(models.Model):
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def is_day_off(self, check_date=None) -> bool:
        if check_date is None:
            check_date = timezone.now().date()
            
        active_policy = self.weekly_off_policies.filter(is_active=True).first()
        
        if not active_policy:
            return False
            
        return is_date_weekly_off(check_date, active_policy.policy_rules)

class WeeklyOffPolicy(models.Model): 
    business_unit = models.ForeignKey(
        BusinessUnit, 
        on_delete=models.CASCADE, 
        related_name='weekly_off_policies', 
        null=True
    )
    name = models.CharField(max_length=100)
    
    policy_rules = models.JSONField(
        default=dict,
        validators=[validate_complex_off_days],
        help_text="Format: {'6': 'all', '5': [1, 3]} where 0=Mon, 6=Sun."
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('business_unit', 'name')

    def __str__(self):
        bu_name = self.business_unit.name if self.business_unit else "No Unit"
        return f"{self.name} ({bu_name})"


class LeaveDays(models.Model):
    name = models.CharField(max_length=100)
    date = models.DateField(db_index=True)
    business_unit = models.ForeignKey(
        BusinessUnit, 
        on_delete=models.CASCADE, 
        related_name='company_leave_days',
        db_index=True
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text=_("Uncheck to disable this holiday without permanently deleting the record.")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Leave Day (Holiday)")
        verbose_name_plural = _("Leave Days (Holidays)")
        ordering = ['-date']
        
        constraints = [
            models.UniqueConstraint(
                fields=['date', 'business_unit'],
                name='unique_holiday_per_business_unit'
            )
        ]
        
        indexes = [
            models.Index(fields=['date', 'business_unit', 'is_active']),
        ]
        
    def __str__(self):
        return f"{self.name} - {self.date.strftime('%Y-%m-%d')} ({self.business_unit.name})"

class FeedPost(models.Model):

    POST_TYPES = [
        ('standard', 'Standard Post'),
        ('announcement', 'Announcement'),
        ('poll', 'Poll'),
    ]

    author = models.ForeignKey('accounts.employee', on_delete=models.CASCADE, related_name='authored_posts')
    post_type = models.CharField(max_length=20, choices=POST_TYPES, default='standard')
    
    likes_count = models.PositiveIntegerField(default=0, db_index=True)
    comments_count = models.PositiveIntegerField(default=0, db_index=True)
    # If it's a poll, this is the "Question". If it's a post, this is the "Content".
    content = models.TextField() 
    
    target_business_unit = models.ForeignKey(
        'BusinessUnit', on_delete=models.CASCADE, null=True, blank=True,
        related_name='targeted_posts',
        help_text=_("Leave blank for company-wide global posts.")
    )
    target_department = models.ForeignKey(
        'Department', on_delete=models.CASCADE, null=True, blank=True,
        related_name='targeted_posts',
        help_text=_("Leave blank to show to the entire Business Unit.")
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['target_business_unit', 'target_department', 'is_active']),
        ]

    def __str__(self):
        return f"{self.get_post_type_display()} by {self.author} - {self.created_at.strftime('%Y-%m-%d')}"

class FeedPostImage(models.Model):
    post = models.ForeignKey(FeedPost, on_delete=models.CASCADE, related_name='images')
    
    image = models.ImageField(upload_to='feed_posts/images/%Y/%m/%d/')
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for Post ID {self.post.id}"

class PollOption(models.Model):
    feed_post = models.ForeignKey(
        FeedPost, on_delete=models.CASCADE, related_name='poll_options'
    )
    option_text = models.CharField(max_length=255)
    
    def __str__(self):
        return self.option_text


class PollVote(models.Model):
    feed_post = models.ForeignKey(FeedPost, on_delete=models.CASCADE, related_name='all_votes')
    poll_option = models.ForeignKey(PollOption, on_delete=models.CASCADE, related_name='votes')
    employee = models.ForeignKey('accounts.employee', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['feed_post', 'employee'], 
                name='unique_vote_per_employee_per_poll'
            )
        ]

class FeedPostLike(models.Model):
    REACTION_CHOICES = [
        ('like', 'Like'),
        ('haha', 'Haha'),
        ('heart', 'Heart'),
        ('clap', 'Clap'),
        ('curious', 'Curious'),
    ]

    post = models.ForeignKey(FeedPost, on_delete=models.CASCADE, related_name='reactions')
    employee = models.ForeignKey('accounts.Employee', on_delete=models.CASCADE)
    reaction_type = models.CharField(max_length=20, choices=REACTION_CHOICES, default='like')
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        # Crucial: One reaction per employee per post
        unique_together = ('post', 'employee')

class FeedPostComment(models.Model):
    post = models.ForeignKey(FeedPost, on_delete=models.CASCADE, related_name='comments')
    employee = models.ForeignKey('accounts.Employee', on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['created_at']

class Department(models.Model):
    name = models.CharField(max_length=100)
    business_unit = models.ForeignKey(BusinessUnit, on_delete=models.CASCADE)

class SubDepartment(models.Model):
    name = models.CharField(max_length=100)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)

class WorkLocation(models.Model):
    name = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    radius_meters = models.PositiveIntegerField(
        default=200,
        help_text=_("Geofence radius in meters for attendance punch validation."),
    )
    
class EmployeeOrganization(models.Model):
    employee = models.OneToOneField('accounts.employee', on_delete=models.CASCADE)

    business_unit = models.ForeignKey(BusinessUnit, on_delete=models.SET_NULL, null=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True)
    sub_department = models.ForeignKey(SubDepartment, on_delete=models.SET_NULL, null=True)
    work_location = models.ForeignKey(WorkLocation, on_delete=models.SET_NULL, null=True)