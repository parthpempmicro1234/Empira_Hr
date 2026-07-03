from django.db import models

# Create your models here.
class DocumentFolder(models.Model):
    title = models.CharField(max_length=100)
    business_unit = models.ForeignKey(
        'organization.BusinessUnit',
        on_delete=models.CASCADE,
        related_name='document_folders',
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('business_unit', 'title')
        ordering = ['title']

class Document(models.Model):
    folder = models.ForeignKey(DocumentFolder, on_delete=models.CASCADE, related_name="documents")

    title = models.CharField(max_length=100)
    file_url = models.FileField(upload_to="documents/")
    description = models.TextField(null=True, blank=True)

    expiry_date = models.DateField(null=True, blank=True)
    size = models.CharField(max_length=20, blank=True, default='')
    size_bytes = models.BigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_updated', '-id']