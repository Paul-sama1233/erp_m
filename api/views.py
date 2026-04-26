import requests
from django.db import transaction
from decimal import Decimal, InvalidOperation
from django.db.models import Sum, Count, F
from django.conf import settings
from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from core.models import CustomUser, Production, ProductionStage, Person
from rest_framework import status
from django.db import models as django_models
from django.db.models import F
from datetime import timedelta
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import ProtectedError
from inventory.models import Material, MaterialTransaction, Product, ProductMaterial, PurchaseRequest, ProductStageTemplate
from contracts.models import Contract, ContractProduct
from .serializers import ProductStageTemplateSerializer
from django.utils import timezone
from reports.models import WorkerSalary, MonthlyOverhead
from datetime import datetime
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

    @action(detail=True, methods=['get'])
    def finance(self, request, pk=None):
        person = self.get_object()
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        salaries = WorkerSalary.objects.filter(worker=person).order_by('-created_at')

        if start_date:
            salaries = salaries.filter(created_at__date__gte=start_date)
        if end_date:
            salaries = salaries.filter(created_at__date__lte=end_date)

        total = sum(s.amount for s in salaries)

        history = []
        for s in salaries:
            history.append({
                'id': s.id,
                'product_name': s.production.product.name,
                'amount': s.amount,
                'date': s.created_at
            })

        return Response({
            'total_earned': total,
            'operations_count': salaries.count(),
            'history': history
        })

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
            start_date = timezone.now()
            production = serializer.save(status='started', current_stage_order=0)

            templates = production.product.stage_templates.all().order_by('order')

            if templates.exists():
                for i, template in enumerate(templates, start=1):
                    # Прибавляем по 7 дней на каждый следующий этап
                    deadline_date = start_date + timedelta(days=i * 7)

                    ProductionStage.objects.create(
                        production=production,
                        stage_type=template.stage_type,
                        assigned_worker=None,
                        order=template.order,
                        status='pending',
                        deadline=deadline_date  # <--- Сохраняем дату
                    )
            else:
                ProductionStage.objects.create(
                    production=production,
                    stage_type='frame',
                    assigned_worker=None,
                    order=0,
                    status='pending',
                    deadline=start_date + timedelta(days=7)
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

            # --- 1. БРОНЕБОЙНАЯ СИНХРОНИЗАЦИЯ С ДОГОВОРОМ ---
            price = Decimal(str(production.product.price))
            if production.contract:
                contract_items = ContractProduct.objects.filter(
                    contract=production.contract,
                    product=production.product
                ).order_by('id')

                if contract_items.exists():
                    price = Decimal(str(contract_items.first().price))

                    completed_count = Production.objects.filter(
                        contract=production.contract,
                        product=production.product,
                        status='completed'
                    ).count()

                    allocated = completed_count
                    for item in contract_items:
                        if allocated >= item.quantity:
                            if item.status != 'completed':
                                item.status = 'completed'
                                item.save()
                            allocated -= item.quantity
                        else:
                            break

            # --- 2. БРОНЕБОЙНЫЙ РАСЧЕТ ЗАРПЛАТ ---
            if price > Decimal('0'):
                salary_pool = price * Decimal('0.45')

                # Добавил springs на всякий случай, чтобы не было деления на 0
                coefs = {
                    'frame': Decimal('1.0'),
                    'springs': Decimal('1.0'),
                    'foam': Decimal('1.0'),
                    'sewing': Decimal('2.0'),
                    'upholstery': Decimal('0.4'),
                }

                # Берем только те этапы, где реально назначен человек
                finished_stages = production.stages.filter(assigned_worker__isnull=False)
                total_coef = sum(coefs.get(s.stage_type, Decimal('0')) for s in finished_stages)

                if total_coef > Decimal('0'):
                    base_unit = salary_pool / total_coef
                    for s in finished_stages:
                        amount = base_unit * coefs.get(s.stage_type, Decimal('0'))
                        if amount > Decimal('0'):
                            # get_or_create защитит от двойного начисления
                            WorkerSalary.objects.get_or_create(
                                worker=s.assigned_worker,
                                production=production,
                                defaults={'amount': amount}
                            )

        return Response({
            'success': True,
            'message': 'Производство успешно закрыто. Зарплаты начислены.'
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

    # Встраиваем проверку адреса напрямую в ContractViewSet, чтобы роутер не путался
    @action(detail=False, methods=['get'], url_path='validate-address')
    def validate_address(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({"error": "Параметр q (адрес) обязателен"}, status=status.HTTP_400_BAD_REQUEST)

        api_key = getattr(settings, 'LOCATIONIQ_API_KEY', None)
        if not api_key or api_key == 'pk.твой_ключ_сюда':
            return Response({"error": "LocationIQ API ключ не настроен"}, status=500)

        url = "https://us1.locationiq.com/v1/search.php"
        params = {
            'key': api_key,
            'q': query,
            'format': 'json',
            'limit': 5,
            'addressdetails': 1,
            'accept-language': 'ru'
        }

        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if not data or len(data) == 0:
                return Response({
                    "valid": False,
                    "message": "Адрес не найден"
                })

            best = data[0]

            result = {
                "valid": True,
                "message": "Адрес успешно найден",
                "formatted_address": best.get('display_name'),
                "coordinates": {
                    "lat": best.get('lat'),
                    "lon": best.get('lon')
                },
                "address": {
                    "house_number": best.get('address', {}).get('house_number'),
                    "road": best.get('address', {}).get('road'),
                    "city": best.get('address', {}).get('city'),
                    "state": best.get('address', {}).get('state'),
                }
            }

            return Response(result)

        except requests.exceptions.RequestException:
            return Response({
                "valid": False,
                "message": "Ошибка соединения с LocationIQ"
            }, status=502)
        except Exception as e:
            return Response({
                "valid": False,
                "message": f"Неизвестная ошибка: {str(e)}"
            }, status=500)

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
            start_date = timezone.now()

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
            templates = contract_item.product.stage_templates.all().order_by('order')
            if templates.exists():
                for i, template in enumerate(templates, start=1):
                    deadline_date = start_date + timedelta(days=i * 7)

                    ProductionStage.objects.create(
                        production=production,
                        stage_type=template.stage_type,
                        assigned_worker=None,
                        order=template.order,
                        status='pending',
                        deadline=deadline_date
                    )
            else:
                ProductionStage.objects.create(
                    production=production,
                    stage_type='frame',
                    assigned_worker=None,
                    order=0,
                    status='pending',
                    deadline=start_date + timedelta(days=7)
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
        total_completed_stages = ProductionStage.objects.filter(status='completed').count()
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
            "total_completed_stages": total_completed_stages,
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
                    production.save()

                    # --- 1. БРОНЕБОЙНАЯ СИНХРОНИЗАЦИЯ С ДОГОВОРОМ ---
                    price = Decimal(str(production.product.price))
                    if production.contract:
                        contract_items = ContractProduct.objects.filter(
                            contract=production.contract,
                            product=production.product
                        ).order_by('id')

                        if contract_items.exists():
                            price = Decimal(str(contract_items.first().price))

                            completed_count = Production.objects.filter(
                                contract=production.contract,
                                product=production.product,
                                status='completed'
                            ).count()

                            allocated = completed_count
                            for item in contract_items:
                                if allocated >= item.quantity:
                                    if item.status != 'completed':
                                        item.status = 'completed'
                                        item.save()
                                    allocated -= item.quantity
                                else:
                                    break

                    # --- 2. БРОНЕБОЙНЫЙ РАСЧЕТ ЗАРПЛАТ ---
                    if price > Decimal('0'):
                        salary_pool = price * Decimal('0.45')

                        coefs = {
                            'frame': Decimal('1.0'),
                            'springs': Decimal('1.0'),
                            'foam': Decimal('1.0'),
                            'sewing': Decimal('2.0'),
                            'upholstery': Decimal('0.4'),
                        }

                        finished_stages = production.stages.filter(assigned_worker__isnull=False)
                        total_coef = sum(coefs.get(s.stage_type, Decimal('0')) for s in finished_stages)

                        if total_coef > Decimal('0'):
                            base_unit = salary_pool / total_coef

                            for s in finished_stages:
                                amount = base_unit * coefs.get(s.stage_type, Decimal('0'))
                                if amount > Decimal('0'):
                                    WorkerSalary.objects.get_or_create(
                                        worker=s.assigned_worker,
                                        production=production,
                                        defaults={'amount': amount}
                                    )

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


class WorkerStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Определяем начало текущего месяца
        now = timezone.now()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Находим объект сотрудника
        full_name = f"{request.user.first_name} {request.user.last_name}".strip()
        try:
            person = Person.objects.get(full_name=full_name)
        except Person.DoesNotExist:
            return Response({"completed_this_month": 0})

        # Считаем только те этапы, которые завершены В ЭТОМ МЕСЯЦЕ
        completed_count = ProductionStage.objects.filter(
            assigned_worker=person,
            status='completed',
            completed_at__gte=start_of_month
        ).count()

        return Response({
            "completed_this_month": completed_count,
            "month_name": now.strftime('%B')  # Передаем название месяца для красоты
        })


class SalaryReportView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        from reports.models import WorkerSalary

        # Группируем по сотруднику и суммируем заработок
        stats = WorkerSalary.objects.values(
            'worker__id', 'worker__full_name', 'worker__specialization'
        ).annotate(
            total_earned=Sum('amount'),
            completed_products=Count('production', distinct=True)
        ).order_by('-total_earned')

        return Response(list(stats))


class FinancialReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Берем только завершенные производства
        productions = Production.objects.filter(status='completed').order_by('-created_at')

        data = []
        for prod in productions:
            # 1. Стоимость списанных материалов
            mat_cost_dict = MaterialTransaction.objects.filter(
                comment__icontains=f"производства #{prod.id}",
                transaction_type='out'
            ).aggregate(total=Sum(F('quantity') * F('material__price_per_unit')))
            material_cost = mat_cost_dict['total'] or Decimal('0')

            # 2. Зарплата (ФОТ) по этому изделию
            sal_cost_dict = WorkerSalary.objects.filter(production=prod).aggregate(total=Sum('amount'))
            salary_cost = sal_cost_dict['total'] or Decimal('0')

            # 3. Расходы на Аренду и ЖКХ (доля)
            overhead = MonthlyOverhead.objects.filter(
                month__year=prod.created_at.year,
                month__month=prod.created_at.month
            ).first()

            rent_share = Decimal('0')
            if overhead:
                # Считаем, сколько всего заказов завершено в этом месяце
                total_orders = Production.objects.filter(
                    created_at__year=prod.created_at.year,
                    created_at__month=prod.created_at.month,
                    status='completed'
                ).count()

                if total_orders > 0:
                    rent_share = (overhead.rent_amount + overhead.utilities_amount) / Decimal(total_orders)

            # 4. Налоги (пока ставим 5% от цены изделия, как заглушку)
            price = prod.product.price
            tax = price * Decimal('0.05')

            # 5. Чистая прибыль
            net_profit = price - (material_cost + salary_cost + rent_share + tax)

            data.append({
                'id': prod.id,
                'product_name': prod.product.name,
                'date': prod.created_at,
                'price': price,
                'material_cost': material_cost,
                'salary_cost': salary_cost,
                'rent_share': rent_share,
                'tax': tax,
                'net_profit': net_profit
            })

        return Response(data)