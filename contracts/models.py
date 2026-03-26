from django.db import models
from inventory.models import Product


class Contract(models.Model):
    """contracts"""
    client_name = models.CharField(max_length=255, verbose_name="ФИО клиента")
    phone = models.CharField(max_length=50, blank=True, verbose_name="Телефон")
    address = models.TextField(blank=True, verbose_name="Адрес")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Договор"
        verbose_name_plural = "Договоры"

    def __str__(self):
        return f"{self.client_name} ({self.created_at.strftime('%d.%m.%Y')})"


class ContractProduct(models.Model):
    """contract_products — что именно заказал клиент"""
    STATUS_CHOICES = [
        ('pending', 'Ожидает'),
        ('in_progress', 'В производстве'),
        ('completed', 'Выполнено'),
    ]
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('inventory.Product', on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    production_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    class Meta:
        verbose_name = "Позиция договора"
        verbose_name_plural = "Позиции договора"

    def __str__(self):
        return f"{self.contract} — {self.product.name} × {self.quantity}"