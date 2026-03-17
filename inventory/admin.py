from django.contrib import admin
from .models import Material, Product, ProductMaterial, MaterialTransaction, PurchaseRequest
admin.site.register(Material)
admin.site.register(Product)
admin.site.register(ProductMaterial)
admin.site.register(MaterialTransaction)
admin.site.register(PurchaseRequest)