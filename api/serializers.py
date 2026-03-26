from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from core.models import CustomUser, Production, ProductionStage, Person
from inventory.models import Material, MaterialTransaction, Product, ProductMaterial
from contracts.models import Contract, ContractProduct

class ContractProductSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = ContractProduct
        fields = ['id', 'contract', 'product', 'product_name',
                  'quantity', 'price', 'production_date']

class ContractSerializer(serializers.ModelSerializer):
    items = ContractProductSerializer(many=True, read_only=True)

    class Meta:
        model = Contract
        fields =['id', 'client_name', 'phone', 'address',
                 'created_at', 'items']

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['specialization'] = user.specialization
        token['username'] = user.username
        return token


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'role', 'specialization']


class MaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = ['id', 'name', 'unit', 'quantity', 'price_per_unit', 'min_quantity',
                  'specialization']


class MaterialTransactionSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source='material.name', read_only=True)

    class Meta:
        model = MaterialTransaction
        fields = ['id', 'material', 'material_name', 'quantity',
                  'transaction_type', 'comment', 'created_at']
class ProductMaterialSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source='material.name', read_only=True)
    material_unit = serializers.CharField(source='material.unit', read_only=True)

    class Meta:
        model = ProductMaterial
        fields = ['id', 'product', 'material', 'material_name', 'material_unit', 'quantity']

class ProductSerializer(serializers.ModelSerializer):
    materials = ProductMaterialSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'price', 'created_at', 'materials']

class ProductionStageSerializer(serializers.ModelSerializer):
    assigned_worker_name = serializers.CharField(
        source='assigned_worker.full_name', read_only=True
    )

    class Meta:
        model = ProductionStage
        fields = [
            'id','production', 'stage_type', 'assigned_worker',
            'assigned_worker_name', 'order', 'status', 'started_at',
            'completed_at'
        ]

class ProductionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    contract_info = serializers.SerializerMethodField()
    stages = ProductionStageSerializer(many=True, read_only=True)

    def get_contract_info(self, obj):
        if obj.contract:
            return {
                'id': obj.contract.id,
                'client_name': obj.contract.client_name,
                'phone': obj.contract.phone,
            }
        return None

    class Meta:
        model = Production
        fields = [
            'id', 'product', 'product_name', 'contract','contract_info',
            'created_at', 'stages','status', 'current_stage_order'
        ]

class PersonSerializer(serializers.ModelSerializer):
    specialization_label = serializers.CharField(
        source='get_specialization_display', read_only=True
    )
    class Meta:
        model = Person
        fields = ['id', 'full_name', 'phone', 'specialization','specialization_label',]


class WorkerStageSerializer(serializers.ModelSerializer):
    assigned_worker_name = serializers.CharField(
        source='assigned_worker.full_name', read_only=True
    )
    product_name = serializers.CharField(
        source='production.product.name', read_only=True
    )

    # Исправлено: используем DateTimeField + format, чтобы безопасно взять только дату
    production_date = serializers.DateTimeField(
        source='production.created_at',
        format='%Y-%m-%d',  # возвращаем только дату в формате YYYY-MM-DD
        read_only=True
    )

    production_status = serializers.CharField(
        source='production.status', read_only=True
    )
    available_materials = serializers.SerializerMethodField()

    def get_available_materials(self, obj):
        # Берём specialization из Person (теперь оно есть)
        specialization = obj.assigned_worker.specialization if hasattr(obj.assigned_worker,
                                                                       'specialization') else 'none'

        product_materials = obj.production.product.materials.all()
        result = []
        for pm in product_materials:
            mat = pm.material
            if mat.specialization == specialization or mat.specialization == 'any':
                result.append({
                    'id': mat.id,
                    'name': mat.name,
                    'unit': mat.unit,
                    'quantity': str(mat.quantity),
                    'needed': str(pm.quantity),
                })
        return result

    class Meta:
        model = ProductionStage
        fields = [
            'id', 'production', 'stage_type', 'assigned_worker',
            'assigned_worker_name', 'product_name', 'production_date',
            'production_status', 'status', 'started_at', 'completed_at',
            'order', 'available_materials'
        ]