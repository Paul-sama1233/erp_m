from django.db import models
from core.models import Person

class Material(models.Model):
    SPECIALIZATION_CHOICES = [
        ('frame', 'Каркасник'),
        ('sewing', 'Швея'),
        ('foam', 'Поролонщик'),
        ('upholstery', 'Обивщик'),
        ('any', 'Общий (для всех)'),
    ]
    name = models.CharField(max_length=255, verbose_name="Название")
    unit = models.CharField(max_length=50, verbose_name="Единица измерения")
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    min_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    price_per_unit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    specialization = models.CharField(
        max_length=20,
        choices=SPECIALIZATION_CHOICES,
        default='any',
        verbose_name="Для кого предназначен"
    )

    class Meta:
        verbose_name = "Материал"
        verbose_name_plural = "Материалы"

    def __str__(self):
        return f"{self.name} ({self.quantity} {self.unit})"


class MaterialTransaction(models.Model):
    TRANSACTION_TYPES = [
        ('in', 'Поступление'),
        ('out', 'Списание'),
    ]
    material = models.ForeignKey(Material, on_delete=models.PROTECT, verbose_name="Материал")
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_type = models.CharField(max_length=50, choices=TRANSACTION_TYPES, verbose_name="Тип")
    comment = models.TextField(blank=True, verbose_name="Комментарий")
    person = models.ForeignKey(Person, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Сотрудник")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Транзакция материала"
        verbose_name_plural = "Транзакции материалов"

    def __str__(self):
        return f"{self.get_transaction_type_display()} {self.quantity} {self.material.name}"


class Product(models.Model):
    name = models.CharField(max_length=255, verbose_name="Название изделия")
    price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Цена продажи")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Изделие"
        verbose_name_plural = "Изделия"

    def __str__(self):
        return self.name


# --- НОВАЯ МОДЕЛЬ: Шаблон этапа (Технологическая карта) ---
class ProductStageTemplate(models.Model):
    STAGE_CHOICES = [
        ('frame', 'Каркас'),
        ('springs', 'Пружины / Механизмы'),
        ('sewing', 'Шитьё'),
        ('foam', 'Поролон'),
        ('upholstery', 'Обивка'),
    ]
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stage_templates')
    stage_type = models.CharField(max_length=20, choices=STAGE_CHOICES, verbose_name="Тип этапа")
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок выполнения")

    class Meta:
        verbose_name = "Шаблон этапа изделия"
        verbose_name_plural = "Шаблоны этапов изделия"
        ordering = ['order']
        unique_together = ('product', 'stage_type')

    def __str__(self):
        return f"{self.product.name} — {self.get_stage_type_display()}"


class ProductMaterial(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='materials')

    # ПРИВЯЗКА К ЭТАПУ: На каком этапе расходуется материал
    stage_template = models.ForeignKey(
        ProductStageTemplate, on_delete=models.CASCADE, related_name='stage_materials',
        null=True, blank=True, verbose_name="Шаблон этапа"
    )
    material = models.ForeignKey(Material, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Количество на 1 изделие")

    class Meta:
        # Убрали unique_together, так как один материал (например, клей) может быть на разных этапах
        verbose_name = "Материал изделия"
        verbose_name_plural = "Материалы изделий"

    def __str__(self):
        stage = self.stage_template.get_stage_type_display() if self.stage_template else "Общий"
        return f"{self.product.name} ({stage}) → {self.material.name} × {self.quantity}"


class PurchaseRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'В ожидании'),
        ('approved', 'Одобрено'),
        ('purchased', 'Закуплено'),
    ]
    material = models.ForeignKey(Material, on_delete=models.PROTECT, verbose_name="Материал")
    requested_quantity = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Запрашиваемое количество")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending', verbose_name="Статус")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Запрос на закупку"
        verbose_name_plural = "Запросы на закупку"

    def __str__(self):
        return f"{self.material.name} — {self.requested_quantity}"