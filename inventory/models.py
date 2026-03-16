from django.db import models
from decimal import Decimal

class Material(models.Model):
    name = models.CharField(max_length=100, verbose_name="Название материала")
    unit = models.CharField(max_length=20, verbose_name="Единица измерения")  # кг, м², шт
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Количество на складе")
    min_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=10, verbose_name="Минимальный остаток")

    class Meta:
        verbose_name = "Материал"
        verbose_name_plural = "Материалы"

    def __str__(self):
        return f"{self.name} ({self.quantity} {self.unit})"


class Product(models.Model):
    name = models.CharField(max_length=100, verbose_name="Название изделия")
    description = models.TextField(blank=True, verbose_name="Описание")
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Цена продажи")

    class Meta:
        verbose_name = "Изделие"
        verbose_name_plural = "Изделия"

    def __str__(self):
        return self.name


class ProductMaterial(models.Model):
    """Сколько материала нужно на 1 изделие (главная таблица контроля!)"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="materials")
    material = models.ForeignKey(Material, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Количество на 1 шт.")

    class Meta:
        verbose_name = "Материал для изделия"
        verbose_name_plural = "Материалы для изделий"
        unique_together = ('product', 'material')

    def __str__(self):
        return f"{self.product.name} — {self.material.name} ({self.quantity})"


class MaterialTransaction(models.Model):
    TYPE_CHOICES = [
        ('out', 'Списание'),
        ('in', 'Поступление'),
    ]
    material = models.ForeignKey(Material, on_delete=models.PROTECT)
    production = models.ForeignKey('core.Production', on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    type = models.CharField(max_length=3, choices=TYPE_CHOICES, verbose_name="Тип")
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Транзакция материала"
        verbose_name_plural = "Транзакции материалов"

    def __str__(self):
        return f"{self.get_type_display()} {self.quantity} {self.material.name}"


class PurchaseRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'В ожидании'),
        ('approved', 'Одобрено'),
        ('purchased', 'Закуплено'),
    ]
    material = models.ForeignKey(Material, on_delete=models.PROTECT)
    requested_quantity = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Запрос на закупку"
        verbose_name_plural = "Запросы на закупку"

    def __str__(self):
        return f"{self.material.name} — {self.requested_quantity}"