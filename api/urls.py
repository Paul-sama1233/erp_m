from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from contracts.views import generate_contract_pdf # Новый импорт для генерации договоров
from contracts.views import ValidateAddressLocationIQView

# Импортируем все существующие views
from .views import (
    CustomTokenObtainPairView, MeView,
    MaterialViewSet, TransactionViewSet,
    ProductViewSet, ProductMaterialViewSet,
    PersonViewSet, ProductionViewSet, ProductionStageViewSet,
    ContractViewSet, ContractProductViewSet,
    MyStagesView, DashboardStatsView, StageActionView, ProductStageTemplateViewSet,
    WorkerStatsView, SalaryReportView,
    FinancialReportView
)



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
    path('reports/salaries/', SalaryReportView.as_view()),
    path('worker-stats/', WorkerStatsView.as_view()),
    path('', include(router.urls)),
    path('token/', CustomTokenObtainPairView.as_view()),
    path('token/refresh/', TokenRefreshView.as_view()),
    path('me/', MeView.as_view()),
    path('my-stages/', MyStagesView.as_view()),
    path('dashboard-stats/', DashboardStatsView.as_view()),
    path('stages/<int:pk>/<str:action>/', StageActionView.as_view()),
    path('reports/finance/', FinancialReportView.as_view()),
    # === Новые пути для генерации договоров ===
    path('contracts/<int:contract_id>/generate/pdf/',
         generate_contract_pdf, name=' generate_contract_pdf'),

    # Router должен быть в конце
    path('', include(router.urls)),
]