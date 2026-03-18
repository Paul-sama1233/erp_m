from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
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
        max_length=20,
        choices=SPECIALIZATION_CHOICES,
        default='none',
        verbose_name="Специализация"
    )

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"

    def __str__(self):
        full_name = self.get_full_name() or self.username
        return f"{full_name} — {self.get_role_display()} ({self.get_specialization_display()})"


class Production(models.Model):
    STATUS_CHOICES = [
        ('started', 'В работе'),
        ('completed', 'Завершено'),
    ]
    product = models.ForeignKey('inventory.Product', on_delete=models.PROTECT, verbose_name="Изделие")
    deadline = models.DateField(
        verbose_name="Дедлайн (только админ)",
        null=True,  # ← добавили
        blank=True  # ← добавили
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='started')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Производство"
        verbose_name_plural = "Производства"

    def __str__(self):
        return f"{self.product.name} (до {self.deadline})"


class ProductionStage(models.Model):
    STAGE_CHOICES = [
        ('frame', 'Каркас'),
        ('springs', 'Пружины / Механизмы'),
        ('sewing', 'Шитьё'),
        ('foam', 'Поролон'),
        ('upholstery', 'Обивка'),
    ]

    production = models.ForeignKey(Production, on_delete=models.CASCADE, related_name='stages')
    stage_type = models.CharField(max_length=20, choices=STAGE_CHOICES, verbose_name="Этап")

    # Дефолтный + возможность замены админом
    assigned_worker = models.ForeignKey(
        CustomUser,
        on_delete=models.PROTECT,
        limit_choices_to={'role': 'worker'},
        verbose_name="Назначенный работник (админ может заменить)"
    )

    status = models.CharField(
        max_length=15,
        choices=[
            ('pending', 'Ожидает'),
            ('in_progress', 'В работе'),
            ('completed', 'Завершено')
        ],
        default='pending'
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Этап производства"
        verbose_name_plural = "Этапы производства"
        ordering = ['production', 'stage_type']

    def __str__(self):
        worker_name = self.assigned_worker.get_full_name() or self.assigned_worker.username
        return f"{self.get_stage_type_display()} — {worker_name}"