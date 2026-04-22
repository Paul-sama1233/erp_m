from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from contracts.views import generate_contract_pdf
from contracts.views import ValidateAddressLocationIQView

# Импортируем все существующие views
from .views import (
    CustomTokenObtainPairView, MeView,
    MaterialViewSet, TransactionViewSet,
    ProductViewSet, ProductMaterialViewSet,
    PersonViewSet, ProductionViewSet, ProductionStageViewSet,
    ContractViewSet, ContractProductViewSet,
    MyStagesView, DashboardStatsView, StageActionView, ProductStageTemplateViewSet,
)

# Новый импорт для генерации договоров
from contracts.views import generate_contract_pdf

router = DefaultRouter()
router.register(r'materials', MaterialViewSet)
router.register(r'transactions', TransactionViewSet)
router.register(r'products', ProductViewSet)
router.register(r'product-materials', ProductMaterialViewSet)
router.register(r'persons', PersonViewSet)
router.register(r'productions', ProductionViewSet)
router.register(r'production-stages', ProductionStageViewSet)
router.register(r'contracts', ContractViewSet)

router.register(r'product-stage-templates', ProductStageTemplateViewSet)
router.register(r'contract-products', ContractProductViewSet)

urlpatterns = [
    path('token/', CustomTokenObtainPairView.as_view()),
    path('token/refresh/', TokenRefreshView.as_view()),
    path('me/', MeView.as_view()),
    path('my-stages/', MyStagesView.as_view()),
    path('dashboard-stats/', DashboardStatsView.as_view()),
    path('stages/<int:pk>/<str:action>/', StageActionView.as_view()),

    # === Новые пути для генерации договоров ===
    path('contracts/<int:contract_id>/generate/pdf/',
         generate_contract_pdf, name=' generate_contract_pdf'),

    path('contracts/validate-address/',
         ValidateAddressLocationIQView.as_view(),
         name=' validate_address_locationiq'),
    # Router должен быть в конце
    path('', include(router.urls)),
]