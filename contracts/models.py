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
    contract = models.ForeignKey(
        Contract, on_delete=models.CASCADE, related_name='items'
    )
    product = models.ForeignKey(
        Product, on_delete=models.PROTECT, verbose_name="Изделие"
    )
    quantity = models.PositiveIntegerField(default=1, verbose_name="Количество")
    price = models.DecimalField(
        max_digits=12, decimal_places=2, verbose_name="Цена"
    )
    production_date = models.DateField(
        null=True, blank=True, verbose_name="Дата производства"
    )

    class Meta:
        verbose_name = "Позиция договора"
        verbose_name_plural = "Позиции договора"

    def __str__(self):
        return f"{self.contract} — {self.product.name} × {self.quantity}"