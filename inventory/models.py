from django.db import models
from core.models import Person


class Material(models.Model):
    """materials"""
    name = models.CharField(max_length=255, verbose_name="Название")
    unit = models.CharField(max_length=50, verbose_name="Единица измерения")
    quantity = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name="Количество на складе"
    )
    price_per_unit = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name="Цена за единицу"
    )

    class Meta:
        verbose_name = "Материал"
        verbose_name_plural = "Материалы"

    def __str__(self):
        return f"{self.name} ({self.quantity} {self.unit})"


class MaterialTransaction(models.Model):
    """material_transactions"""
    TRANSACTION_TYPES = [
        ('in', 'Поступление'),
        ('out', 'Списание'),
    ]
    material = models.ForeignKey(
        Material, on_delete=models.PROTECT, verbose_name="Материал"
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_type = models.CharField(
        max_length=50, choices=TRANSACTION_TYPES, verbose_name="Тип"
    )
    comment = models.TextField(blank=True, verbose_name="Комментарий")
    person = models.ForeignKey(
        Person, on_delete=models.SET_NULL, null=True, blank=True,
        verbose_name="Сотрудник"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Транзакция материала"
        verbose_name_plural = "Транзакции материалов"

    def __str__(self):
        return f"{self.get_transaction_type_display()} {self.quantity} {self.material.name}"


class Product(models.Model):
    """products"""
    name = models.CharField(max_length=255, verbose_name="Название изделия")
    price = models.DecimalField(
        max_digits=12, decimal_places=2, verbose_name="Цена продажи"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Изделие"
        verbose_name_plural = "Изделия"

    def __str__(self):
        return self.name


class ProductMaterial(models.Model):
    """product_materials — сколько материала на 1 изделие"""
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='materials'
    )
    material = models.ForeignKey(
        Material, on_delete=models.PROTECT
    )
    quantity = models.DecimalField(
        max_digits=12, decimal_places=2,
        verbose_name="Количество на 1 изделие"
    )

    class Meta:
        unique_together = ('product', 'material')
        verbose_name = "Материал изделия"
        verbose_name_plural = "Материалы изделий"

    def __str__(self):
        return f"{self.product.name} → {self.material.name} × {self.quantity}"