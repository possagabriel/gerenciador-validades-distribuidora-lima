import math
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import Categoria, Lote, Produto, ProdutoSKU, RegraDesconto


def validar_valor_monetario(value):
    if not math.isfinite(value) or value < 0:
        raise serializers.ValidationError("Informe um valor não negativo e finito.")
    if value > 999999999.99:
        raise serializers.ValidationError("O valor deve ser no máximo 999999999,99.")
    if Decimal(str(value)).as_tuple().exponent < -2:
        raise serializers.ValidationError("Use no máximo duas casas decimais.")
    return value


def validar_validade_nova(value):
    if value.date() < timezone.localdate():
        raise serializers.ValidationError("A validade deve ser hoje ou uma data futura.")
    return value


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ["id", "nome", "dias_atencao", "dias_critico"]

    def validate_nome(self, value):
        existentes = Categoria.all_objects.filter(nome__iexact=value)
        if self.instance:
            existentes = existentes.exclude(pk=self.instance.pk)
        if existentes.exists():
            raise serializers.ValidationError("Já existe uma categoria com esse nome.")
        return value

    def validate(self, attrs):
        dias_atencao = attrs.get(
            "dias_atencao", getattr(self.instance, "dias_atencao", None)
        )
        dias_critico = attrs.get(
            "dias_critico", getattr(self.instance, "dias_critico", None)
        )
        if dias_critico is not None and dias_atencao is not None and dias_critico >= dias_atencao:
            raise serializers.ValidationError(
                "'dias_critico' deve ser menor que 'dias_atencao'."
            )
        return attrs


class ProdutoSKUSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProdutoSKU
        fields = ["id", "produto", "codigo_barras"]


class LoteInicialSerializer(serializers.Serializer):
    quantidade = serializers.IntegerField(min_value=1, max_value=999999999)
    custo_unitario_compra = serializers.FloatField(min_value=0)
    data_validade = serializers.DateTimeField()

    def validate_custo_unitario_compra(self, value):
        return validar_valor_monetario(value)

    def validate_data_validade(self, value):
        return validar_validade_nova(value)


class ProdutoSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source="categoria.nome", read_only=True)
    skus = ProdutoSKUSerializer(many=True, read_only=True)
    lote_inicial = LoteInicialSerializer(write_only=True, required=False)

    class Meta:
        model = Produto
        fields = [
            "id",
            "nome",
            "categoria",
            "categoria_nome",
            "preco_venda",
            "skus",
            "lote_inicial",
        ]

    def validate_preco_venda(self, value):
        return validar_valor_monetario(value)

    @transaction.atomic
    def create(self, validated_data):
        lote_inicial = validated_data.pop("lote_inicial", None)
        produto = super().create(validated_data)
        if lote_inicial:
            lote = Lote.objects.create(produto=produto, **lote_inicial)
            lote.nivel_vencimento = lote.calcular_nivel_vencimento()
            lote.save(update_fields=["nivel_vencimento"])
        return produto


class LoteSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source="produto.nome", read_only=True)
    dias_vencido = serializers.ReadOnlyField()

    class Meta:
        model = Lote
        fields = [
            "id",
            "produto",
            "produto_nome",
            "nome_lote",
            "quantidade",
            "custo_unitario_compra",
            "nivel_vencimento",
            "esgotado",
            "dias_vencido",
            "data_cadastro",
            "data_validade",
            "tempo_vencimento",
        ]
        read_only_fields = ["id", "nome_lote", "data_cadastro", "nivel_vencimento"]

    def validate_quantidade(self, value):
        if not 1 <= value <= 999999999:
            raise serializers.ValidationError("Informe uma quantidade entre 1 e 999999999.")
        return value

    def validate_custo_unitario_compra(self, value):
        return validar_valor_monetario(value)

    def validate_data_validade(self, value):
        return validar_validade_nova(value)

    def validate(self, attrs):
        """Replica Lote.clean() aqui para o erro voltar como 400 da API."""
        data_validade = attrs.get(
            "data_validade", getattr(self.instance, "data_validade", None)
        )
        tempo_vencimento = attrs.get(
            "tempo_vencimento", getattr(self.instance, "tempo_vencimento", None)
        )
        if not data_validade and not tempo_vencimento:
            raise serializers.ValidationError(
                "Informe 'data_validade' ou 'tempo_vencimento' (pelo menos um dos dois)."
            )
        return attrs

    def create(self, validated_data):
        lote = super().create(validated_data)
        lote.nivel_vencimento = lote.calcular_nivel_vencimento()
        lote.save(update_fields=["nivel_vencimento"])
        return lote


class RegraDescontoSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source="categoria.nome", read_only=True)

    class Meta:
        model = RegraDesconto
        fields = [
            "id",
            "categoria",
            "categoria_nome",
            "percentual",
            "dias_para_vencimento",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        """Replica RegraDesconto.clean() aqui para o erro voltar como 400 da API."""
        percentual = attrs.get(
            "percentual", getattr(self.instance, "percentual", None)
        )
        if percentual is not None and not (0 < percentual <= 100):
            raise serializers.ValidationError(
                {"percentual": "'percentual' deve estar entre 0 (exclusivo) e 100."}
            )
        return attrs
