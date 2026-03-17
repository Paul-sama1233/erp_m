from django.contrib import admin
from .models import CustomUser, Production
admin.site.register(CustomUser)
admin.site.register(Production)