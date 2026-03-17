from django.db import models
from core.models import Production

class Profit(models.Model):
    production = models.OneToOneField(Production, on_delete=models.CASCADE, verbose_name="Производство")
    material_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Себестоимость материалов")
    other_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Прочие расходы")
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Цена продажи")
    profit = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Прибыль")

    class Meta:
        verbose_name = "Прибыль"
        verbose_name_plural = "Прибыль"

    def __str__(self):
        return f"Прибыль от {self.production} = {self.profit}"