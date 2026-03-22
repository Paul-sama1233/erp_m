from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    """Django-пользователь для авторизации (admin/worker)"""
    ROLE_CHOICES = [
        ('admin', 'Администратор'),
        ('worker', 'Работник'),
    ]
    SPECIALIZATION_CHOICES = [
        ('frame', 'Каркасник'),
        ('springs', 'Пружинщик / Механик'),
        ('sewing', 'Швея'),
        ('foam', 'Поролонщик'),
        ('upholstery', 'Обивщик'),
        ('none', 'Без специализации'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='worker')
    specialization = models.CharField(
        max_length=20, choices=SPECIALIZATION_CHOICES,
        default='none', verbose_name="Специализация"
    )

    class Meta:
        verbose_name = "Аккаунт"
        verbose_name_plural = "Аккаунты"

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


# ──────────────────────────────────────────────
# Таблица users (сотрудники/контактные лица)
# ──────────────────────────────────────────────

class Role(models.Model):
    """roles"""
    name = models.CharField(max_length=100, verbose_name="Название роли")

    class Meta:
        verbose_name = "Роль"
        verbose_name_plural = "Роли"

    def __str__(self):
        return self.name


class Person(models.Model):
    SPECIALIZATION_CHOICES = [
        ('frame',      'Каркасник'),
        ('springs',    'Пружинщик / Механик'),
        ('sewing',     'Швея'),
        ('foam',       'Поролонщик'),
        ('upholstery', 'Обивщик'),
        ('none',       'Без специализации'),
    ]
    full_name       = models.CharField(max_length=255, verbose_name="ФИО")
    phone           = models.CharField(max_length=50, blank=True, verbose_name="Телефон")
    specialization  = models.CharField(
        max_length=20, choices=SPECIALIZATION_CHOICES,
        default='none', verbose_name="Специализация"
    )
    roles = models.ManyToManyField(Role, through='PersonRole', verbose_name="Роли")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Сотрудник"
        verbose_name_plural = "Сотрудники"

    def __str__(self):
        return f"{self.full_name} ({self.get_specialization_display()})"


class PersonRole(models.Model):
    """user_roles — связь many-to-many"""
    person = models.ForeignKey(Person, on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('person', 'role')
        verbose_name = "Роль сотрудника"
        verbose_name_plural = "Роли сотрудников"


class Production(models.Model):
    """production"""
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.PROTECT,
        verbose_name="Изделие"
    )
    person = models.ForeignKey(
        Person,
        on_delete=models.PROTECT,
        verbose_name="Ответственный сотрудник"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Производство"
        verbose_name_plural = "Производства"

    def __str__(self):
        return f"{self.product.name} / {self.person.full_name}"


class ProductionStage(models.Model):
    """Этапы производства (каркас → поролон → обивка и т.д.)"""
    STAGE_CHOICES = [
        ('frame', 'Каркас'),
        ('springs', 'Пружины / Механизмы'),
        ('sewing', 'Шитьё'),
        ('foam', 'Поролон'),
        ('upholstery', 'Обивка'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Ожидает'),
        ('in_progress', 'В работе'),
        ('completed', 'Завершено'),
    ]
    production = models.ForeignKey(
        Production, on_delete=models.CASCADE, related_name='stages'
    )
    stage_type = models.CharField(max_length=20, choices=STAGE_CHOICES)
    assigned_worker = models.ForeignKey(
        Person, on_delete=models.PROTECT, verbose_name="Назначенный работник"
    )
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Этап производства"
        verbose_name_plural = "Этапы производства"
        ordering = ['production', 'stage_type']

    def __str__(self):
        return f"{self.production} — {self.get_stage_type_display()}"