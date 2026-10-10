from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import ExpressionWrapper, F, FloatField, Sum
from django.utils import timezone


class SoftDeleteQuerySet(models.QuerySet):
    def ativos(self):
        return self.filter(deletado_em__isnull=True)

    def excluidos(self):
        return self.filter(deletado_em__isnull=False)


class SoftDeleteManager(models.Manager):
    """
    Manager padrão (`objects`): só enxerga registros não excluídos.
    Usado pela API (DRF) e por qualquer código que não deva ver itens
    "excluídos" pelo Gerente.
    """

    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).ativos()


class TodosOsRegistrosManager(models.Manager):
    """
    Manager sem filtro (`all_objects`): enxerga tudo, inclusive excluídos.
    Usado pelo Django Admin, para restaurar ou excluir de verdade.
    """

    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db)


class SoftDeleteModel(models.Model):
    deletado_em = models.DateTimeField(null=True, blank=True, default=None)

    objects = SoftDeleteManager()
    all_objects = TodosOsRegistrosManager()

    class Meta:
        abstract = True
        base_manager_name = "all_objects"

    @property
    def esta_excluido(self):
        return self.deletado_em is not None

    def delete(self, using=None, keep_parents=False):
        self.deletado_em = timezone.now()
        self.save(update_fields=["deletado_em"])

    def hard_delete(self, using=None, keep_parents=False):
        return super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        self.deletado_em = None
        self.save(update_fields=["deletado_em"])


class Categoria(SoftDeleteModel):
    """
    Tabela normalizada de categorias (Limpeza, Frios, Produtos de beleza, etc.).
    Evita categorias digitadas de forma inconsistente ("frios", "Frios",
    "FRIOS" virando 3 categorias diferentes).
    Também guarda os thresholds (em dias) usados para calcular o
    nivel_vencimento dos lotes dessa categoria.
    """

    nome = models.CharField(max_length=100, unique=True)
    dias_atencao = models.PositiveIntegerField(
        default=30,
        help_text="A partir de quantos dias antes do vencimento o lote entra em nível 'Atenção'.",
    )
    dias_critico = models.PositiveIntegerField(
        default=7,
        help_text="A partir de quantos dias antes do vencimento o lote entra em nível 'Crítico'.",
    )

    class Meta(SoftDeleteModel.Meta):
        db_table = "categorias"
        verbose_name = "Categoria"
        verbose_name_plural = "Categorias"
        ordering = ["nome"]

    def clean(self):
        if self.dias_critico >= self.dias_atencao:
            raise ValidationError(
                "'dias_critico' deve ser menor que 'dias_atencao'."
            )

    def __str__(self):
        return self.nome


def get_categoria_padrao():
    categoria, _ = Categoria.all_objects.get_or_create(nome="Sem Categoria")
    return categoria.pk


class RegraDesconto(models.Model):

    categoria = models.ForeignKey(
        Categoria, on_delete=models.CASCADE, related_name="regras_desconto"
    )
    percentual = models.FloatField(help_text="Percentual de desconto sugerido (0 a 100).")
    dias_para_vencimento = models.PositiveIntegerField(
        help_text="A regra passa a valer quando faltar esse número de dias (ou menos) para o vencimento."
    )

    class Meta:
        db_table = "regras_desconto"
        verbose_name = "Regra de desconto"
        verbose_name_plural = "Regras de desconto"
        unique_together = ("categoria", "percentual", "dias_para_vencimento")
        ordering = ["categoria__nome", "-percentual"]

    def clean(self):
        if not (0 < self.percentual <= 100):
            raise ValidationError("'percentual' deve estar entre 0 (exclusivo) e 100.")

    def __str__(self):
        return f"{self.categoria.nome}: {self.percentual}% a partir de {self.dias_para_vencimento} dia(s)"


class Produto(SoftDeleteModel):

    nome = models.CharField(max_length=255)
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.PROTECT,
        default=get_categoria_padrao,
        related_name="produtos",
    )
    preco_venda = models.FloatField(help_text="Valor em R$ pelo qual o produto é vendido.")

    class Meta(SoftDeleteModel.Meta):
        db_table = "produtos"
        verbose_name = "Produto"
        verbose_name_plural = "Produtos"
        ordering = ["nome"]

    def __str__(self):
        return self.nome


class ProdutoSKU(models.Model):

    produto = models.ForeignKey(
        Produto, on_delete=models.CASCADE, related_name="skus"
    )
    codigo_barras = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = "produto_skus"
        verbose_name = "SKU / Código de barras"
        verbose_name_plural = "SKUs / Códigos de barra"

    def __str__(self):
        return f"{self.codigo_barras} ({self.produto.nome})"


class ContadorLote(models.Model):
    """
    Tabela auxiliar (não é exposta na API/Admin) usada só para gerar o
    sequencial de `nome_lote` de forma segura contra concorrência.

    A trava (select_for_update) é feita na LINHA deste contador, não na
    tabela Lote inteira.
    """

    produto = models.ForeignKey(Produto, on_delete=models.CASCADE)
    data = models.DateField()
    sequencial = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "contadores_lote"
        unique_together = ("produto", "data")

    @classmethod
    def proximo_sequencial(cls, produto, data):
        with transaction.atomic():
            contador, _ = cls.objects.select_for_update().get_or_create(
                produto=produto, data=data
            )
            contador.sequencial = F("sequencial") + 1
            contador.save(update_fields=["sequencial"])
            contador.refresh_from_db(fields=["sequencial"])
            return contador.sequencial


class LoteQuerySet(SoftDeleteQuerySet):
    """
    QuerySet especializado de Lote, com os métodos usados no relatório de
    prejuízo de lotes vencidos.
    """

    def vencidos(self):
        return self.filter(nivel_vencimento=self.model.NivelVencimento.VENCIDO)

    def com_prejuizo_calculavel(self):
        return self.vencidos().exclude(esgotado=True).filter(
            custo_unitario_compra__isnull=False
        )

    def sem_custo_cadastrado(self):
        return self.vencidos().exclude(esgotado=True).filter(
            custo_unitario_compra__isnull=True
        )

    def prejuizo_total(self):
        resultado = self.com_prejuizo_calculavel().aggregate(
            total=Sum(
                ExpressionWrapper(
                    F("quantidade") * F("custo_unitario_compra"),
                    output_field=FloatField(),
                )
            )
        )
        return resultado["total"] or 0.0


class LoteManager(SoftDeleteManager):
    def get_queryset(self):
        return LoteQuerySet(self.model, using=self._db).ativos()


class LoteManagerTodos(TodosOsRegistrosManager):
    def get_queryset(self):
        return LoteQuerySet(self.model, using=self._db)


class Lote(SoftDeleteModel):
    """
    Cada lote de um produto: quantidade, custo de aquisição, validade e o
    nível de vencimento calculado. `nome_lote` é 100% gerado pelo sistema
    (nunca digitado pelo usuário) no formato:

        AAAAMMDD-P{produto_id}-{sequencial:03d}
        ex: 20260707-P12-001
    """

    class NivelVencimento(models.IntegerChoices):
        OK = 0, "OK"
        ATENCAO = 1, "Atenção"
        CRITICO = 2, "Crítico"
        VENCIDO = 3, "Vencido"

    produto = models.ForeignKey(
        Produto, on_delete=models.PROTECT, related_name="lotes"
    )
    nome_lote = models.CharField(
        max_length=40,
        unique=True,
        editable=False,  
        blank=True,       
    )
    quantidade = models.PositiveIntegerField()
    custo_unitario_compra = models.FloatField(
        help_text="Custo unitário de aquisição. Usado também para calcular o prejuízo de lotes vencidos."
    )
    nivel_vencimento = models.IntegerField(
        choices=NivelVencimento.choices, null=True, blank=True
    )
    esgotado = models.BooleanField(
        default=False,
        help_text="Lote sem estoque. Lotes esgotados não têm o nível de vencimento recalculado.",
    )
    data_cadastro = models.DateTimeField(auto_now_add=True)
    data_validade = models.DateTimeField(null=True, blank=True)
    tempo_vencimento = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Dias até o vencimento, para lotes sem data fixa.",
    )

    objects = LoteManager()
    all_objects = LoteManagerTodos()

    class Meta(SoftDeleteModel.Meta):
        db_table = "lotes"
        verbose_name = "Lote"
        verbose_name_plural = "Lotes"
        ordering = ["data_validade"]

    def clean(self):
        if not self.data_validade and not self.tempo_vencimento:
            raise ValidationError(
                "Informe 'data_validade' ou 'tempo_vencimento' (pelo menos um dos dois)."
            )

    def save(self, *args, **kwargs):
        # Se só tempo_vencimento foi informado, calcula data_validade
        # a partir da data de cadastro (ou de hoje, na criação).
        if not self.data_validade and self.tempo_vencimento:
            base = self.data_cadastro or timezone.now()
            self.data_validade = base + timedelta(days=self.tempo_vencimento)

        self.clean()

        if not self.pk and not self.nome_lote:
            hoje = timezone.now().date()
            sequencial = ContadorLote.proximo_sequencial(self.produto, hoje)
            self.nome_lote = f"{hoje:%Y%m%d}-P{self.produto_id}-{sequencial:03d}"

        super().save(*args, **kwargs)

    def calcular_nivel_vencimento(self, hoje=None):
        """Retorna a situação atual do lote conforme os prazos da categoria."""
        if self.esgotado or not self.data_validade:
            return self.nivel_vencimento

        hoje = hoje or timezone.now().date()
        dias_restantes = (self.data_validade.date() - hoje).days
        categoria = self.produto.categoria

        if dias_restantes < 0:
            return self.NivelVencimento.VENCIDO
        if dias_restantes <= categoria.dias_critico:
            return self.NivelVencimento.CRITICO
        if dias_restantes <= categoria.dias_atencao:
            return self.NivelVencimento.ATENCAO
        return self.NivelVencimento.OK

    def __str__(self):
        return self.nome_lote or f"(lote não salvo, produto: {self.produto_id})"

    @property
    def dias_vencido(self):
        if not self.data_validade:
            return None
        dias = (timezone.now().date() - self.data_validade.date()).days
        return dias if dias > 0 else None

    @property
    def prejuizo(self):
        if self.nivel_vencimento != self.NivelVencimento.VENCIDO:
            return None
        if self.esgotado:
            return None
        if self.custo_unitario_compra is None:
            return None
        return self.quantidade * self.custo_unitario_compra

    def regra_desconto_aplicavel(self):
        """
        Entre as regras de desconto da categoria deste produto, retorna a
        mais severa (maior percentual) cuja janela de dias já foi atingida
        — ou None se o lote já venceu, não tem data_validade, ou nenhuma
        regra da categoria se aplica ainda.
        """
        if not self.data_validade:
            return None

        dias_restantes = (self.data_validade.date() - timezone.now().date()).days
        if dias_restantes < 0:
            return None

        candidatas = [
            regra
            for regra in self.produto.categoria.regras_desconto.all()
            if regra.dias_para_vencimento >= dias_restantes
        ]
        if not candidatas:
            return None
        return max(candidatas, key=lambda regra: regra.percentual)

    @property
    def preco_sugerido_desconto(self):
        regra = self.regra_desconto_aplicavel()
        if not regra:
            return None
        return round(self.produto.preco_venda * (1 - regra.percentual / 100), 2)


class MovimentoEstoque(models.Model):
    class Tipo(models.TextChoices):
        ENTRADA = "ENTRADA", "Entrada"
        SAIDA = "SAIDA", "Saída"
        AJUSTE = "AJUSTE", "Ajuste"

    lote = models.ForeignKey(Lote, on_delete=models.PROTECT, related_name="movimentos")
    usuario = models.ForeignKey("usuarios.Usuario", on_delete=models.PROTECT, related_name="movimentos_estoque")
    tipo = models.CharField(max_length=10, choices=Tipo.choices)
    quantidade = models.PositiveIntegerField(help_text="Unidades movimentadas; em ajustes, saldo final desejado.")
    quantidade_antes = models.PositiveIntegerField()
    quantidade_depois = models.PositiveIntegerField()
    motivo = models.CharField(max_length=255)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "movimentos_estoque"
        ordering = ["-criado_em", "-id"]

    def __str__(self):
        return f"{self.tipo} {self.lote.nome_lote}: {self.quantidade_antes} → {self.quantidade_depois}"
