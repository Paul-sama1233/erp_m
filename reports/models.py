from django.db import models
from core.models import Production
from inventory.models import Product


class Profit(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.PROTECT,
        verbose_name="Изделие", null=True, blank=True
    )
    production = models.OneToOneField(
        Production, on_delete=models.CASCADE, verbose_name="Производство"
    )
    revenue = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, verbose_name="Выручка"
    )
    material_cost = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name="Себестоимость материалов"
    )
    other_cost = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name="Прочие расходы"
    )
    selling_price = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name="Цена продажи"
    )
    salary_cost = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name="Затраты на зарплату"
    )
    profit = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name="Прибыль (старое поле)"
    )
    profit_value = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name="Прибыль"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Прибыль"
        verbose_name_plural = "Прибыль"

    def __str__(self):
        return f"{self.product} — {self.profit_value}"