from datetime import date

from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile

from rest_framework.test import APIClient

from accounts.models import User, Employee
from organization.models import BusinessUnit, EmployeeOrganization
from documents.models import DocumentFolder, Document


class OrganizationDocumentsAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.bu_a = BusinessUnit.objects.create(name='BU-A')
        self.bu_b = BusinessUnit.objects.create(name='BU-B')

        self.hr_a_user = User.objects.create_user(
            work_email='hr_a@test.com',
            password='pass',
            role='hr',
        )
        self.hr_a = Employee.objects.create(
            user=self.hr_a_user,
            fname='HR',
            lname='A',
            display_name='HR A',
            employee_code='HRA01',
            work_email='hr_a@test.com',
            date_of_joining=date(2020, 1, 1),
            job_title_primary='HR',
        )
        EmployeeOrganization.objects.create(employee=self.hr_a, business_unit=self.bu_a)

        self.hr_b_user = User.objects.create_user(
            work_email='hr_b@test.com',
            password='pass',
            role='hr',
        )
        self.hr_b = Employee.objects.create(
            user=self.hr_b_user,
            fname='HR',
            lname='B',
            display_name='HR B',
            employee_code='HRB01',
            work_email='hr_b@test.com',
            date_of_joining=date(2020, 1, 1),
            job_title_primary='HR',
        )
        EmployeeOrganization.objects.create(employee=self.hr_b, business_unit=self.bu_b)

        self.emp_b_user = User.objects.create_user(
            work_email='emp_b@test.com',
            password='pass',
            role='employee',
        )
        self.emp_b = Employee.objects.create(
            user=self.emp_b_user,
            fname='Emp',
            lname='B',
            display_name='Emp B',
            employee_code='EMPB01',
            work_email='emp_b@test.com',
            date_of_joining=date(2020, 1, 1),
            job_title_primary='Engineer',
        )
        EmployeeOrganization.objects.create(employee=self.emp_b, business_unit=self.bu_b)

    def test_bu_hr_can_create_folder_and_upload_document(self):
        self.client.force_authenticate(user=self.hr_a_user)

        res = self.client.post('/documents/folders/', {'title': 'Policies'})
        self.assertEqual(res.status_code, 201)
        folder_id = res.data['id']

        upload = SimpleUploadedFile('policy.pdf', b'hello', content_type='application/pdf')
        res2 = self.client.post(
            '/documents/documents/',
            {
                'folder': folder_id,
                'title': 'Policies & Procedures 2026',
                'file_url': upload,
                'description': 'Updated policies',
            },
            format='multipart',
        )
        self.assertEqual(res2.status_code, 201)
        doc_id = res2.data['id']
        doc = Document.objects.get(pk=doc_id)
        self.assertEqual(doc.folder.business_unit_id, self.bu_a.id)
        self.assertGreaterEqual(doc.size_bytes, 1)

    def test_employee_only_sees_own_bu_documents(self):
        folder_a = DocumentFolder.objects.create(title='Policies', business_unit=self.bu_a)
        Document.objects.create(
            folder=folder_a,
            title='Doc A',
            file_url=SimpleUploadedFile('a.txt', b'a', content_type='text/plain'),
            size_bytes=1,
            size='1 B',
        )

        self.client.force_authenticate(user=self.emp_b_user)
        res = self.client.get('/documents/folders/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 0)

        res2 = self.client.get('/documents/documents/')
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(len(res2.data), 0)

    def test_hr_cannot_delete_other_bu_document(self):
        folder_a = DocumentFolder.objects.create(title='Policies', business_unit=self.bu_a)
        doc = Document.objects.create(
            folder=folder_a,
            title='Doc A',
            file_url=SimpleUploadedFile('a.txt', b'a', content_type='text/plain'),
            size_bytes=1,
            size='1 B',
        )

        self.client.force_authenticate(user=self.hr_b_user)
        res = self.client.delete(f'/documents/documents/{doc.id}/')
        # should be hidden by queryset scoping
        self.assertEqual(res.status_code, 404)
