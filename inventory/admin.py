from django.contrib import admin
from .models import Material, MaterialTransaction, Product, ProductMaterial

admin.site.register(Material)
admin.site.register(MaterialTransaction)
admin.site.register(Product)
admin.site.register(ProductMaterial)