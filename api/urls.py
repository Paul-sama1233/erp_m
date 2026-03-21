from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView, MeView,
    MaterialViewSet, TransactionViewSet,
    ProductViewSet, ProductMaterialViewSet,
    PersonViewSet, ProductionViewSet, ProductionStageViewSet,
)

router = DefaultRouter()
router.register(r'materials', MaterialViewSet)
router.register(r'transactions', TransactionViewSet)
router.register(r'products', ProductViewSet)
router.register(r'product-materials', ProductMaterialViewSet)
router.register(r'persons', PersonViewSet)
router.register(r'productions', ProductionViewSet)
router.register(r'production-stages', ProductionStageViewSet)


urlpatterns = [
    path('token/', CustomTokenObtainPairView.as_view()),
    path('token/refresh/', TokenRefreshView.as_view()),
    path('me/', MeView.as_view()),
    path('', include(router.urls)),
]
