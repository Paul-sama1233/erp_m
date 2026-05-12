from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from core.models import CustomUser, Production, ProductionStage, Person
from inventory.models import Material, MaterialTransaction, Product, ProductMaterial
from inventory.models import ProductStageTemplate
from contracts.models import Contract, ContractProduct


class ContractProductSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)


    class Meta:
        model = ContractProduct
        fields = ['id', 'contract', 'product', 'product_name',
                  'quantity', 'price', 'production_date', 'status']

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
                  'transaction_type', 'comment', 'created_at', 'price_per_unit', 'total_cost']
class ProductMaterialSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source='material.name', read_only=True)
    material_unit = serializers.CharField(source='material.unit', read_only=True)
    stage_name = serializers.CharField(source='stage_template.get_stage_type_display', read_only=True)
    class Meta:
        model = ProductMaterial
        fields = ['id', 'product', 'stage_template', 'stage_name', 'material', 'material_name', 'material_unit', 'quantity']

class ProductStageTemplateSerializer(serializers.ModelSerializer):
    stage_name = serializers.CharField(source='get_stage_type_display', read_only=True)

    class Meta:
        model = ProductStageTemplate
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    materials = ProductMaterialSerializer(many=True, read_only=True)
    stage_templates = ProductStageTemplateSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'price', 'created_at', 'materials',
                  'stage_templates','image']

class ProductionStageSerializer(serializers.ModelSerializer):
    assigned_worker_name = serializers.CharField(
        source='assigned_worker.full_name', read_only=True
    )

    class Meta:
        model = ProductionStage
        fields = [
            'id','production', 'stage_type', 'assigned_worker',
            'assigned_worker_name', 'order', 'status', 'started_at',
            'completed_at', 'deadline'
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
        source='get_specialization_display', read_only=True)
    username = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False)
    login = serializers.SerializerMethodField()

    class Meta:
        model = Person
        fields = ['id', 'full_name', 'phone','address', 'specialization',
                  'specialization_label','username', 'password',
                  'login', 'photo', 'language']

    def get_login(self, obj):
        # Ищем связанный аккаунт пользователя (CustomUser)
        user = CustomUser.objects.filter(first_name=obj.full_name).first()
        if not user:
            user = CustomUser.objects.filter(username=obj.full_name).first()
        return user.username if user else ""

    def create(self, validated_data):
        username = validated_data.pop('username', None)
        password = validated_data.pop('password', None)

        person = Person.objects.create(**validated_data)

        if username and password:
            if CustomUser.objects.filter(username=username).exists():
                person.delete()
                raise serializers.ValidationError({"username": "Этот логин уже занят!"})

            try:
                CustomUser.objects.create_user(
                    username=username,
                    password=password,
                    first_name=person.full_name,
                    role='worker',
                    specialization=person.specialization
                )
            except Exception as e:
                person.delete()
                raise serializers.ValidationError({"error": str(e)})

        return person

    def update(self, instance, validated_data):
        username = validated_data.pop('username', None)
        password = validated_data.pop('password', None)

        # Ищем старый аккаунт ДО изменения ФИО
        user = CustomUser.objects.filter(first_name=instance.full_name).first()
        if not user:
            user = CustomUser.objects.filter(username=instance.full_name).first()

        # 1. Обновляем данные самой карточки
        instance.full_name = validated_data.get('full_name', instance.full_name)
        instance.phone = validated_data.get('phone', instance.phone)
        instance.specialization = validated_data.get('specialization', instance.specialization)

        instance.address = validated_data.get('address', instance.address)
        if 'language' in validated_data:
            instance.language = validated_data['language']
        if 'photo' in validated_data:
            instance.photo = validated_data['photo']

        instance.save()

        # 2. Обновляем системный аккаунт (логин, пароль и привязку)
        if user:
            if username:
                user.username = username
            if password:
                user.set_password(password)  # Хешируем новый пароль
            user.first_name = instance.full_name  # Обновляем привязку, если ФИО сменилось
            user.specialization = instance.specialization
            user.save()
        elif username and password:
            # УБРАЛИ локальный import CustomUser
            CustomUser.objects.create_user(
                username=username,
                password=password,
                first_name=instance.full_name,
                role='worker',
                specialization=instance.specialization
            )

        return instance

class WorkerStageSerializer(serializers.ModelSerializer):
    assigned_worker_name = serializers.CharField(source='assigned_worker.full_name', read_only=True)
    product_name = serializers.CharField(source='production.product.name', read_only=True)

    production_date = serializers.DateTimeField(
        source='production.created_at',
        format='%Y-%m-%d',
        read_only=True
    )

    production_status = serializers.CharField(source='production.status', read_only=True)
    available_materials = serializers.SerializerMethodField()

    def get_available_materials(self, obj):
        from inventory.models import ProductStageTemplate

        # Ищем шаблон, соответствующий этому этапу и этому изделию
        template = ProductStageTemplate.objects.filter(
            product=obj.production.product,
            stage_type=obj.stage_type
        ).first()

        result = []
        if template:
            # Берем материалы СТРОГО из шаблона этапа
            for pm in template.stage_materials.all():
                mat = pm.material
                result.append({
                    'id': mat.id,
                    'name': mat.name,
                    'unit': mat.unit,
                    'quantity': str(mat.quantity),
                    'needed': str(pm.quantity),
                })
        else:
            # Резервная логика (для старых изделий без шаблонов)
            specialization = obj.assigned_worker.specialization if hasattr(obj.assigned_worker,
                                                                           'specialization') else 'none'
            product_materials = obj.production.product.materials.all()
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
            'order', 'available_materials', 'deadline'
        ]