from django.db import models

class AccessLog(models.Model):
    name = models.CharField(max_length=255, blank=True, null=True)
    message = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    path = models.CharField(max_length=500)

    def __str__(self):
        return f"{self.timestamp} - {self.name or 'Anonymous'}"
