from datetime import datetime, time

from django.utils import timezone
from rest_framework import serializers

from .models import Categoria, Lote, Produto, ProdutoSKU, RegraDesconto


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ["id", "nome", "dias_atencao", "dias_critico"]

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
    quantidade = serializers.IntegerField(min_value=1)
    custo_unitario_compra = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    data_validade = serializers.DateField()

    def validate_data_validade(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("A validade não pode estar no passado.")
        return value


class ProdutoSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source="categoria.nome", read_only=True)
    skus = ProdutoSKUSerializer(many=True, read_only=True)
    lotes_iniciais = LoteInicialSerializer(many=True, write_only=True, min_length=1)

    class Meta:
        model = Produto
        fields = [
            "id", "nome", "categoria", "categoria_nome", "preco_venda", "skus",
            "lotes_iniciais",
        ]

    def create(self, validated_data):
        from django.db import transaction

        lotes = validated_data.pop("lotes_iniciais", [])
        with transaction.atomic():
            produto = super().create(validated_data)
            for dados_lote in lotes:
                dados_lote["data_validade"] = timezone.make_aware(
                    datetime.combine(dados_lote["data_validade"], time.min)
                )
                Lote.objects.create(produto=produto, **dados_lote)
        return produto

    def validate_lotes_iniciais(self, value):
        datas = [lote["data_validade"] for lote in value]
        if len(set(datas)) != len(datas):
            raise serializers.ValidationError(
                "Use um lote para cada data de validade."
            )
        return value


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
