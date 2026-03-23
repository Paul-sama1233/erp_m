from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from core.models import CustomUser, Production, ProductionStage, Person
from rest_framework.decorators import action
from rest_framework import status
from django.db import models as django_models
from django.db.models import F
from inventory.models import Material, MaterialTransaction, Product, ProductMaterial, PurchaseRequest
from contracts.models import Contract, ContractProduct
from .serializers import (
    CustomTokenObtainPairSerializer, UserSerializer,
    MaterialSerializer,              MaterialTransactionSerializer,
    ProductSerializer,               ProductMaterialSerializer,
    ProductionSerializer,            ProductionStageSerializer,
    WorkerStageSerializer,           PersonSerializer,
    ContractSerializer,              ContractProductSerializer,
)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class MaterialViewSet(viewsets.ModelViewSet):
    queryset = Material.objects.all().order_by('name')
    serializer_class = MaterialSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = MaterialTransaction.objects.all().order_by('-created_at')
    serializer_class = MaterialTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by('name')
    serializer_class = ProductSerializer

    def get_permissians(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

class ProductMaterialViewSet(viewsets.ModelViewSet):
    queryset = ProductMaterial.objects.all()
    serializer_class = ProductMaterialSerializer
    permission_classes = [IsAdmin]

class PersonViewSet(viewsets.ModelViewSet):
    queryset = Person.objects.all().order_by('full_name')
    serializer_class = PersonSerializer
    permission_classes = [permissions.IsAuthenticated]


class ProductionViewSet(viewsets.ModelViewSet):
    queryset = Production.objects.all().order_by('-created_at')
    serializer_class = ProductionSerializer

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'complete']:
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def complete(self, request, pk=None):
        """Завершить производство — списать материалы"""
        production = self.get_object()

        with transaction.atomic():
            product_materials = production.product.materials.all()

            # Проверяем наличие всех материалов
            errors = []
            for pm in product_materials:
                material = pm.material
                if material.quantity < pm.quantity:
                    errors.append(
                        f"{material.name}: нужно {pm.quantity} {material.unit}, "
                        f"на складе {material.quantity}"
                    )

            if errors:
                return Response(
                    {'error': 'Недостаточно материалов', 'details': errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Списываем материалы
            for pm in product_materials:
                material = pm.material
                material.quantity -= pm.quantity
                material.save()

                # Записываем транзакцию
                MaterialTransaction.objects.create(
                    material=material,
                    quantity=pm.quantity,
                    transaction_type='out',
                    comment=f'Списание для производства #{production.id} — {production.product.name}',
                )

                # Проверяем минимальный остаток
                if material.quantity <= material.min_quantity:
                    PurchaseRequest.objects.get_or_create(
                        material=material,
                        status='pending',
                        defaults={'requested_quantity': material.min_quantity * 2}
                    )

                    if production.contract:
                        from contracts.models import ContractProduct
                        ContractProduct.objects.filter(
                            contract=production.contract,
                            product=production.product,
                            status='in_progress'
                        ).update(status='completed')

                    production.status = 'completed'
                    production.save()


        return Response({'success': True, 'message': 'Производство завершено, материалы списаны'})


class ProductionStageViewSet(viewsets.ModelViewSet):
    queryset = ProductionStage.objects.all()
    serializer_class = ProductionStageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Работник видит только свои этапы
        if user.role == 'worker':
            try:
                person = Person.objects.get(full_name=user.get_full_name())
                return ProductionStage.objects.filter(assigned_worker=person)
            except Person.DoesNotExist:
                return ProductionStage.objects.none()
        return ProductionStage.objects.all()

class ContractViewSet(viewsets.ModelViewSet):
    queryset = Contract.objects.all().order_by('-created_at')
    serializer_class = ContractSerializer
    permission_classes = [IsAdmin]

class ContractProductViewSet(viewsets.ModelViewSet):
    queryset = ContractProduct.objects.all()
    serializer_class = ContractProductSerializer
    permission_classes = [IsAdmin]


class MyStagesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        username = request.user.username  # ← строка, не функция

        # Ищем Person по всем возможным совпадениям
        person = None

        # 1. По full_name == "Имя Фамилия" из Django-пользователя
        full_name = f"{request.user.first_name} {request.user.last_name}".strip()
        if full_name:
            try:
                person = Person.objects.get(full_name=full_name)
            except Person.DoesNotExist:
                pass

        # 2. По username если не нашли
        if not person:
            try:
                person = Person.objects.get(full_name=username)
            except Person.DoesNotExist:
                pass

        # 3. Если всё равно не нашли — возвращаем пустой список
        if not person:
            return Response([])

        # Показываем только этапы где работник назначен
        # И только если это текущий активный этап производства
        stages = ProductionStage.objects.filter(
            assigned_worker=person
        ).order_by('-production__created_at', 'order')

        # Фильтруем — показываем только те где предыдущий этап завершён
        active_stages = []
        for stage in stages:
            production = stage.production
            # Если это первый этап (order=0) или все предыдущие завершены
            prev_stages = ProductionStage.objects.filter(
                production=production,
                order__lt=stage.order
            )
            all_prev_done = all(s.status == 'completed' for s in prev_stages)
            if all_prev_done and stage.status != 'completed':
                active_stages.append(stage)

        serializer = WorkerStageSerializer(stages, many=True)
        return Response(serializer.data)

class DashboardStatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        from contracts.models import Contract
        from core.models import Production

        # Считаем статистику
        total_materials     = Material.objects.count()
        low_stock_materials = Material.objects.filter(
            quantity__lte=django_models.F('min_quantity')
        ).count()
        total_products      = Product.objects.count()
        total_productions   = Production.objects.count()
        active_productions  = Production.objects.count()
        total_contracts     = Contract.objects.count()
        total_persons       = Person.objects.count()
        pending_requests    = PurchaseRequest.objects.filter(status='pending').count()

        # Последние производства
        recent_productions = Production.objects.order_by('-created_at')[:5]
        recent_data = [{
            'id': p.id,
            'product_name': p.product.name,
            'client_name': p.contract.client_name if p.contract else '—',
            'status': p.status,
            'created_at': p.created_at,
        } for p in recent_productions]

        # Материалы с низким остатком
        low_stock = Material.objects.filter(
            quantity__lte=F('min_quantity')
        ).values('id', 'name', 'quantity', 'min_quantity', 'unit')[:5]

        return Response({
            'total_materials':     total_materials,
            'low_stock_materials': low_stock_materials,
            'total_products':      total_products,
            'total_productions':   total_productions,
            'active_productions':  active_productions,
            'total_contracts':     total_contracts,
            'total_persons':       total_persons,
            'pending_requests':    pending_requests,
            'recent_productions':  recent_data,
            'low_stock':           list(low_stock),
        })