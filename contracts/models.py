from django.db import models
from inventory.models import Product

class Contract(models.Model):
    client_name = models.CharField(max_length=150, verbose_name="ФИО клиента")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, verbose_name="Изделие")
    price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Цена по договору")
    deadline = models.DateField(verbose_name="Срок выполнения")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Договор"
        verbose_name_plural = "Договоры"

    def __str__(self):
        return f"{self.client_name} — {self.product.name}"