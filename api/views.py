from django.db import transaction
from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from core.models import CustomUser, Production, ProductionStage, Person
from  rest_framework.decorators import action
from rest_framework import status
from inventory.models import Material, MaterialTransaction, Product, ProductMaterial
from contracts.models import Contract, ContractProduct
from .serializers import (
    CustomTokenObtainPairSerializer, UserSerializer,
    MaterialSerializer, MaterialTransactionSerializer,
    ProductSerializer, ProductMaterialSerializer,
    ProductionSerializer, ProductionStageSerializer, PersonSerializer,
    ContractSerializer, ContractProductSerializer,
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
                from inventory.models import PurchaseRequest
                if material.quantity <= material.min_quantity:
                    PurchaseRequest.objects.get_or_create(
                        material=material,
                        status='pending',
                        defaults={'requested_quantity': material.min_quantity * 2}
                    )

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