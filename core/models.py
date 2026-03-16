from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Администратор'),
        ('worker', 'Работник цеха'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='worker')
    # email и password уже есть от AbstractUser

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class Production(models.Model):
    STATUS_CHOICES = [
        ('started', 'В работе'),
        ('completed', 'Завершено'),
    ]
    product = models.ForeignKey('inventory.Product', on_delete=models.PROTECT, verbose_name="Изделие")
    worker = models.ForeignKey(CustomUser, on_delete=models.PROTECT, limit_choices_to={'role': 'worker'}, verbose_name="Работник")
    date = models.DateTimeField(auto_now_add=True, verbose_name="Дата начала")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='started', verbose_name="Статус")

    class Meta:
        verbose_name = "Производство"
        verbose_name_plural = "Производства"

    def __str__(self):
        return f"{self.product.name} — {self.worker.username}"
