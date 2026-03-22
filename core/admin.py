from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Person, Role, PersonRole, Production, ProductionStage

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    # Добавляем поля role и specialization в форму редактирования
    fieldsets = UserAdmin.fieldsets + (
        ('Роль в системе', {
            'fields': ('role', 'specialization')
        }),
    )
    list_display = ['username', 'email', 'role', 'specialization', 'is_staff']
    list_filter = ['role', 'specialization']

class PersonAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'phone', 'specialization']
    list_editable = ['specialization']

admin.site.register(Person)
admin.site.register(Role)
admin.site.register(PersonRole)
admin.site.register(Production)
admin.site.register(ProductionStage)