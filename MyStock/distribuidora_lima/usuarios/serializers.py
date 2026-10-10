from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework import serializers

Usuario = get_user_model()


class UsuarioSerializer(serializers.ModelSerializer):

    class Meta:
        model = Usuario
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "cpf",
            "tipo_funcionario",
            "is_active",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        if self.instance and self.instance.is_active and (self.instance.is_superuser or self.instance.tipo_funcionario == Usuario.TipoFuncionario.ADMIN):
            novo_cargo = attrs.get("tipo_funcionario", self.instance.tipo_funcionario)
            ativo = attrs.get("is_active", self.instance.is_active)
            if (novo_cargo != Usuario.TipoFuncionario.ADMIN or not ativo) and not Usuario.objects.filter(is_active=True).filter(
                Q(is_superuser=True) | Q(tipo_funcionario=Usuario.TipoFuncionario.ADMIN)
            ).exclude(pk=self.instance.pk).exists():
                raise serializers.ValidationError("É necessário manter pelo menos um administrador ativo.")
        return attrs

    def update(self, instance, validated_data):
        novo_cargo = validated_data.get("tipo_funcionario")
        if novo_cargo and novo_cargo != Usuario.TipoFuncionario.ADMIN:
            instance.is_staff = False
            instance.is_superuser = False
        return super().update(instance, validated_data)


class UsuarioPerfilSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ["id", "username", "first_name", "last_name", "cpf", "tipo_funcionario", "is_active"]
        read_only_fields = ["id", "username", "cpf", "tipo_funcionario", "is_active"]


class UsuarioRegistroSerializer(serializers.ModelSerializer):

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Usuario
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "cpf",
            "tipo_funcionario",
            "password",
        ]

    def validate(self, attrs):
        try:
            validate_password(attrs["password"], Usuario(**{k: v for k, v in attrs.items() if k != "password"}))
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": error.messages}) from error
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        usuario = Usuario(**validated_data)
        usuario.set_password(password)
        usuario.save()
        return usuario
