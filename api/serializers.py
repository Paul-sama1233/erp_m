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
        fields = ['id', 'name', 'unit', 'quantity', 'price_per_unit', 'min_quantity']


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
            'assigned_worker_name','status', 'started_at',
            'completed_at'
        ]

class ProductionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    person_name  = serializers.CharField(source='person.full_name', read_only=True)
    stages       = ProductionStageSerializer(many=True, read_only=True)

    class Meta:
        model = Production
        fields = [
            'id', 'product', 'product_name', 'person',
            'person_name', 'created_at', 'stages'
        ]

class PersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ['id', 'full_name', 'phone', 'specialization']