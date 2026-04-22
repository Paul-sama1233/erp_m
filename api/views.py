from django.db import transaction
from decimal import Decimal, InvalidOperation
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
from django.db.models import ProtectedError
from inventory.models import Material, MaterialTransaction, Product, ProductMaterial, PurchaseRequest, ProductStageTemplate
from contracts.models import Contract, ContractProduct
from .serializers import ProductStageTemplateSerializer
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

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

    # НОВЫЙ МЕТОД: Аккуратная обработка удаления
    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'error': 'Невозможно удалить это изделие, так как оно уже используется в существующих договорах или производствах.'},
                status=status.HTTP_400_BAD_REQUEST
            )

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

    # --- НОВЫЙ МЕТОД: АВТОГЕНЕРАЦИЯ ЭТАПОВ ПРИ РУЧНОМ СОЗДАНИИ ---
    def perform_create(self, serializer):
        with transaction.atomic():
            # Сохраняем производство, сразу ставим статус 'started'
            production = serializer.save(status='started', current_stage_order=0)

            # Берем технологическую карту (шаблоны этапов) из изделия
            templates = production.product.stage_templates.all()

            if templates.exists():
                for template in templates:
                    ProductionStage.objects.create(
                        production=production,
                        stage_type=template.stage_type,
                        assigned_worker=None,  # Ждет назначения от админа
                        order=template.order,
                        status='pending'
                    )
            else:
                # Резервная логика: если техкарта пустая, создаем базовый этап
                ProductionStage.objects.create(
                    production=production,
                    stage_type='frame',
                    assigned_worker=None,
                    order=0,
                    status='pending'
                )

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def complete(self, request, pk=None):
        production = self.get_object()

        with transaction.atomic():
            # Закрываем все незавершенные этапы
            incomplete_stages = production.stages.exclude(status='completed')
            if incomplete_stages.exists():
                incomplete_stages.update(status='completed', completed_at=timezone.now())

            production.status = 'completed'
            production.save()

            # --- СИНХРОНИЗАЦИЯ С ДОГОВОРОМ ---
            if production.contract:
                try:
                    contract_item = ContractProduct.objects.get(
                        contract=production.contract,
                        product=production.product
                    )

                    # Считаем, сколько таких изделий уже полностью готово
                    completed_count = Production.objects.filter(
                        contract=production.contract,
                        product=production.product,
                        status='completed'
                    ).count()

                    # Если готово столько же, сколько заказано (или больше)
                    if completed_count >= contract_item.quantity:
                        contract_item.status = 'completed'
                        contract_item.save()

                except ContractProduct.DoesNotExist:
                    pass

        return Response({
            'success': True,
            'message': 'Производство успешно закрыто. Статусы договора обновлены.'
        })

    def destroy(self, request, *args, **kwargs):
        production = self.get_object()

        # Если статус НЕ завершен
        if production.status != 'completed':
            return Response(
                {'error': 'Нельзя удалить производство, которое еще не завершено!'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return super().destroy(request, *args, **kwargs)

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

    @action(detail=True, methods=['post'])
    def start_production(self, request, pk=None):
        contract_item = self.get_object()

        # Теперь блокируем только если заказ ПОЛНОСТЬЮ завершен
        if contract_item.status == 'completed':
            return Response({'error': 'Эта позиция уже завершена.'}, status=400)

        with transaction.atomic():
            # Считаем, сколько производств УЖЕ запущено по этому заказу
            already_started = Production.objects.filter(
                contract=contract_item.contract,
                product=contract_item.product
            ).count()

            # Жесткий контроль количества (защита от лишних кликов)
            if already_started >= contract_item.quantity:
                # Если статус забыл обновиться, поправляем
                if contract_item.status == 'pending':
                    contract_item.status = 'in_progress'
                    contract_item.save()
                return Response({'error': 'Все изделия по этой позиции уже запущены.'}, status=400)

            # Создаем ОДНО производство
            production = Production.objects.create(
                product=contract_item.product,
                contract=contract_item.contract,
                status='started',
                current_stage_order=0
            )

            # Генерируем этапы
            templates = contract_item.product.stage_templates.all()
            if templates.exists():
                for template in templates:
                    ProductionStage.objects.create(
                        production=production,
                        stage_type=template.stage_type,
                        assigned_worker=None,
                        order=template.order,
                        status='pending'
                    )
            else:
                ProductionStage.objects.create(
                    production=production,
                    stage_type='frame',
                    assigned_worker=None,
                    order=0,
                    status='pending'
                )

            # Обновляем статус заказа в договоре, чтобы было понятно, что работа пошла
            if contract_item.status == 'pending':
                contract_item.status = 'in_progress'
                contract_item.save()

        return Response({'success': True, 'message': 'Одно изделие успешно запущено.'})

class MyStagesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        person = None
        username = request.user.username

        # 1. По полному имени из Django-пользователя (прямой порядок)
        full_name = f"{request.user.first_name} {request.user.last_name}".strip()
        if full_name:
            try:
                person = Person.objects.get(full_name=full_name)
            except Person.DoesNotExist:
                pass

        # 2. По обратному порядку (Фамилия Имя)
        if not person and request.user.first_name and request.user.last_name:
            reversed_name = f"{request.user.last_name} {request.user.first_name}".strip()
            try:
                person = Person.objects.get(full_name=reversed_name)
            except Person.DoesNotExist:
                pass

        # 3. По username
        if not person:
            try:
                person = Person.objects.get(full_name=username)
            except Person.DoesNotExist:
                pass

        # 4. Поиск по частям имени
        if not person and request.user.first_name:
            try:
                person = Person.objects.get(
                    full_name__icontains=request.user.first_name
                )
            except (Person.DoesNotExist, Person.MultipleObjectsReturned):
                pass

        if not person:
            return Response([])

        stages = ProductionStage.objects.filter(
            assigned_worker=person
        ).order_by('production__created_at', 'order')

        active_stages = []
        for stage in stages:
            production = stage.production
            prev_stages = ProductionStage.objects.filter(
                production=production,
                order__lt=stage.order
            )
            all_prev_done = all(s.status == 'completed' for s in prev_stages)
            if all_prev_done and stage.status != 'completed':
                active_stages.append(stage)

        serializer = WorkerStageSerializer(active_stages, many=True)
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
        active_productions  = Production.objects.filter(status__in=['pending', 'started']).count()
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

# начать и завершить этап
class StageActionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, action):
        try:
            stage = ProductionStage.objects.get(pk=pk)
        except ProductionStage.DoesNotExist:
            return Response({'error': 'Этап не найден'}, status=404)

        # Проверяем что это этап данного работника
        username  = request.user.username
        full_name = f"{request.user.first_name} {request.user.last_name}".strip()
        person    = None

        try:
            person = Person.objects.get(full_name=full_name) if full_name else None
        except Person.DoesNotExist:
            pass

        if not person:
            try:
                person = Person.objects.get(full_name=username)
            except Person.DoesNotExist:
                return Response({'error': 'Сотрудник не найден'}, status=403)

        if stage.assigned_worker != person:
            return Response({'error': 'Нет доступа к этому этапу'}, status=403)

        now = timezone.now()

        if action == 'start':
            # Проверяем что предыдущие этапы завершены
            prev_stages = ProductionStage.objects.filter(
                production=stage.production,
                order__lt=stage.order
            )
            if prev_stages.exists() and not all(s.status == 'completed' for s in prev_stages):
                return Response(
                    {'error': 'Предыдущие этапы ещё не завершены'},
                    status=400
                )

            stage.status     = 'in_progress'
            stage.started_at = now
            stage.save()

            # Обновляем статус производства
            production = stage.production
            production.status              = 'started'
            production.current_stage_order = stage.order
            production.save()

            return Response({'success': True, 'message': 'Этап начат'})

        elif action == 'complete':

            if stage.status != 'in_progress':
                return Response({'error': 'Этап ещё не начат'}, status=400)

            # Списываем материалы для этого этапа
            materials_to_writeoff = request.data.get('materials', [])

            with transaction.atomic():
                for item in materials_to_writeoff:
                    try:
                        material = Material.objects.get(pk=item['material_id'])
                        qty = Decimal(str(item['quantity']))

                        if material.quantity < qty:
                            return Response(
                                {'error': f'Недостаточно {material.name}: '
                                          f'нужно {qty}, на складе {material.quantity}'},
                                status=400
                            )

                        material.quantity -= qty
                        material.save()

                        MaterialTransaction.objects.create(
                            material=material,
                            quantity=qty,
                            transaction_type='out',
                            comment=f'Списание: этап "{stage.get_stage_type_display()}" '
                                    f'производства #{stage.production.id}',
                        )

                        # Если остаток упал ниже минимума, создаем заявку на закупку
                        if material.quantity <= material.min_quantity:
                            PurchaseRequest.objects.get_or_create(
                                material=material,
                                status='pending',
                                defaults={'requested_quantity': material.min_quantity * 2}
                            )

                    except Material.DoesNotExist:
                        return Response({'error': f'Материал с id {item["material_id"]} не найден'}, status=400)
                    except (KeyError, TypeError, InvalidOperation):
                        return Response({'error': 'Неверный формат данных материалов'}, status=400)

                stage.status = 'completed'
                stage.completed_at = now
                stage.save()

                # Проверяем — все ли этапы завершены
                production = stage.production
                all_stages = ProductionStage.objects.filter(production=production)
                all_completed = all(s.status == 'completed' for s in all_stages)

                if all_completed:
                    production.status = 'completed'
                    production.save()  # Сохраняем сразу, чтобы посчитать в выборке ниже

                    # --- СИНХРОНИЗАЦИЯ С ДОГОВОРОМ ---
                    if production.contract:
                        try:
                            contract_item = ContractProduct.objects.get(
                                contract=production.contract,
                                product=production.product
                            )
                            completed_count = Production.objects.filter(
                                contract=production.contract,
                                product=production.product,
                                status='completed'
                            ).count()

                            if completed_count >= contract_item.quantity:
                                contract_item.status = 'completed'
                                contract_item.save()

                        except ContractProduct.DoesNotExist:
                            pass

                else:
                    # Переходим к следующему этапу
                    next_stage = ProductionStage.objects.filter(
                        production=production,
                        order__gt=stage.order,
                        status='pending'
                    ).order_by('order').first()

                    if next_stage:
                        production.current_stage_order = next_stage.order

                production.save()

            return Response({'success': True, 'message': 'Этап завершён'})

        return Response({'error': 'Неизвестное действие'}, status=400)

class ProductStageTemplateViewSet(viewsets.ModelViewSet):
    queryset = ProductStageTemplate.objects.all().order_by('order')
    serializer_class = ProductStageTemplateSerializer
    permission_classes = [IsAdmin]