from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager

class UserManager(BaseUserManager):
    def create_user(self, work_email, password=None, **extra_fields):
        if not work_email:
            raise ValueError("Email is required")

        work_email = self.normalize_email(work_email)

        user = self.model(work_email=work_email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, work_email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True')

        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True')

        return self.create_user(work_email, password, **extra_fields)
    
class User(AbstractUser):
    username = None
    
    work_email = models.EmailField(unique=True)
    
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('hr', 'HR'),
        ('employee', 'Employee'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
    
    is_active = models.BooleanField(default=True)
    USERNAME_FIELD = 'work_email'
    REQUIRED_FIELDS = []
    
    objects = UserManager() 
    
    def __str__(self):
        return self.work_email
    
class Employee(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]
    # Basic Info
    fname = models.CharField(max_length=50)
    lname = models.CharField(max_length=50)
    display_name = models.CharField(max_length=120, db_index=True)

    employee_code = models.CharField(max_length=20, unique=True)

    # Contact
    work_email = models.EmailField(unique=True)
    personal_email = models.EmailField(null=True, blank=True)
    mobile_number = models.CharField(max_length=15, null=True, blank=True)

    # Profile
    profile_image = models.ImageField(upload_to='profiles/', null=True, blank=True)

    # Personal Info
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, null=True, blank=True)
    marital_status = models.CharField(max_length=20, null=True, blank=True)
    nationality = models.CharField(max_length=50, null=True, blank=True)
    blood_group = models.CharField(max_length=5, null=True, blank=True)

    # Job Info
    date_of_joining = models.DateField()
    job_title_primary = models.CharField(max_length=100)
    job_title_secondary = models.CharField(max_length=100, null=True, blank=True)

    worker_type = models.CharField(max_length=20, default="permanent")
    time_type = models.CharField(max_length=20, default="full_time")

    probation_start = models.DateField(null=True, blank=True)
    probation_end = models.DateField(null=True, blank=True)

    # Hierarchy
    reporting_to = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='subordinates',
        db_index=True
    )

    # Status
    is_active = models.BooleanField(default=True)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # def save(self, *args, **kwargs):
    #     self.display_name = f"{self.fname} {self.lname}"
    #     super().save(*args, **kwargs)

    def __str__(self):
        return self.display_name

class Country(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=5, unique=True) 

    def __str__(self):
        return self.name
    
class State(models.Model):
    country = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name='states'
    )

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10)

    def __str__(self):
        return f"{self.name} ({self.country.code})"
    
class City(models.Model):
    state = models.ForeignKey(
        State,
        on_delete=models.CASCADE,
        related_name='cities'
    )
    name = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.name}, {self.state.name}"
    
class Zipcode(models.Model):
    code = models.CharField(max_length=6, db_index=True)

    city = models.ForeignKey(
        City,
        on_delete=models.CASCADE,
        related_name='zipcodes'
    )

    district = models.CharField(max_length=100)

    class Meta:
        unique_together = ['code', 'city', 'district']
        indexes = [
            models.Index(fields=['code']),
        ]
        

    def __str__(self):
        return f"{self.code} - {self.city.name}"
    

class Address(models.Model):
    ADDRESS_TYPE = [
        ('current', 'Current'),
        ('permanent', 'Permanent'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='addresses')
    address_type = models.CharField(max_length=20, choices=ADDRESS_TYPE)

    address_line1 = models.TextField()
    address_line2 = models.TextField(null=True, blank=True)

    country = models.ForeignKey(Country, on_delete=models.SET_NULL, null=True)
    state = models.ForeignKey(State, on_delete=models.SET_NULL, null=True)
    city = models.ForeignKey(City, on_delete=models.SET_NULL, null=True)

    zip = models.CharField(max_length=10)

    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    class Meta:
        unique_together = ['employee', 'address_type']

    def __str__(self):
        return f"{self.employee.display_name} - {self.address_type}"
    
class IdentityInformation(models.Model):
    IDENTITY_TYPE = [
        ('aadhaar', 'Aadhaar'),
        ('pan', 'PAN'),
    ]

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='identities'
    )

    identity_type = models.CharField(max_length=20, choices=IDENTITY_TYPE)

    document_number = models.CharField(max_length=50)
    name_on_document = models.CharField(max_length=150)

    date_of_birth = models.DateField(null=True, blank=True)
    parent_name = models.CharField(max_length=150, null=True, blank=True)

    is_verified = models.BooleanField(default=False)

    document_file = models.FileField(upload_to='identity_docs/', null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
        
    class Meta:
        unique_together = ['employee', 'identity_type']
        