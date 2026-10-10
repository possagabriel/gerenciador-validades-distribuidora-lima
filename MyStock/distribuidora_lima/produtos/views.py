from datetime import timedelta
import csv

from django.utils import timezone
from django.utils.dateparse import parse_date
from django.db.models import Min, Q, Sum
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.http import StreamingHttpResponse
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from usuarios.models import Usuario
from usuarios.permissions import PermissaoMovimento, PermissaoPorCargo, SomenteGerencia

from .models import Categoria, Lote, MovimentoEstoque, Produto, ProdutoSKU, RegraDesconto
from .pagination import CatalogPagination
from .serializers import (
    CategoriaSerializer,
    LoteSerializer,
    MovimentoEstoqueSerializer,
    NovoMovimentoSerializer,
    ProdutoSerializer,
    ProdutoSKUSerializer,
    RegraDescontoSerializer,
)


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [PermissaoPorCargo]
    cargos_leitura = Usuario.TipoFuncionario.values
    cargos_escrita = (Usuario.TipoFuncionario.GERENTE, Usuario.TipoFuncionario.ADMIN)
    cargos_exclusao = cargos_escrita

    def perform_destroy(self, instance):
        if Produto.objects.filter(categoria=instance).exists():
            raise ValidationError({"categoria": "Mova os produtos desta categoria antes de excluí-la."})
        instance.delete()

    @action(detail=False, methods=["get"], permission_classes=[SomenteGerencia])
    def lixeira(self, request):
        return Response(self.get_serializer(Categoria.all_objects.filter(deletado_em__isnull=False), many=True).data)

    @action(detail=True, methods=["post"], permission_classes=[SomenteGerencia])
    def restaurar(self, request, pk=None):
        categoria = get_object_or_404(Categoria.all_objects, pk=pk, deletado_em__isnull=False)
        categoria.restore()
        return Response(self.get_serializer(categoria).data)


class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.select_related("categoria").prefetch_related("skus").annotate(
        estoque_total_anotado=Sum("lotes__quantidade", filter=Q(lotes__deletado_em__isnull=True, lotes__esgotado=False), default=0),
        proxima_validade_anotada=Min("lotes__data_validade", filter=Q(lotes__deletado_em__isnull=True, lotes__esgotado=False)),
    ).order_by("nome", "id")
    serializer_class = ProdutoSerializer
    pagination_class = CatalogPagination
    permission_classes = [PermissaoPorCargo]
    cargos_leitura = Usuario.TipoFuncionario.values
    cargos_escrita = (Usuario.TipoFuncionario.ESTOQUISTA, Usuario.TipoFuncionario.GERENTE, Usuario.TipoFuncionario.ADMIN)
    cargos_exclusao = (Usuario.TipoFuncionario.GERENTE, Usuario.TipoFuncionario.ADMIN)
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["nome", "skus__codigo_barras"]
    ordering_fields = ["nome", "preco_venda"]

    @action(detail=False, methods=["get"], permission_classes=[SomenteGerencia])
    def lixeira(self, request):
        produtos = Produto.all_objects.filter(deletado_em__isnull=False).select_related("categoria").prefetch_related("skus")
        return Response(self.get_serializer(produtos, many=True).data)

    @action(detail=True, methods=["post"], permission_classes=[SomenteGerencia])
    def restaurar(self, request, pk=None):
        produto = get_object_or_404(Produto.all_objects, pk=pk, deletado_em__isnull=False)
        if produto.categoria.deletado_em:
            raise ValidationError({"categoria": "Restaure a categoria antes do produto."})
        produto.restore()
        return Response(self.get_serializer(produto).data)


class ProdutoSKUViewSet(viewsets.ModelViewSet):
    queryset = ProdutoSKU.objects.select_related("produto").filter(produto__deletado_em__isnull=True)
    serializer_class = ProdutoSKUSerializer
    permission_classes = [PermissaoPorCargo]
    cargos_leitura = Usuario.TipoFuncionario.values
    cargos_escrita = (Usuario.TipoFuncionario.ESTOQUISTA, Usuario.TipoFuncionario.GERENTE, Usuario.TipoFuncionario.ADMIN)
    cargos_exclusao = (Usuario.TipoFuncionario.GERENTE, Usuario.TipoFuncionario.ADMIN)
    filter_backends = [filters.SearchFilter]
    search_fields = ["codigo_barras", "produto__nome"]

    def get_queryset(self):
        queryset = super().get_queryset()
        codigo = self.request.query_params.get("codigo_barras")
        return queryset.filter(codigo_barras=codigo) if codigo is not None else queryset


class LoteViewSet(viewsets.ModelViewSet):
    """
    GET/POST /api/lotes/               (aceita ?search= e ?ordering=)
    GET/PUT/PATCH/DELETE /api/lotes/{id}/
    """

    queryset = Lote.objects.select_related("produto", "produto__categoria").filter(produto__deletado_em__isnull=True)
    serializer_class = LoteSerializer
    pagination_class = CatalogPagination
    permission_classes = [PermissaoPorCargo]
    cargos_leitura = Usuario.TipoFuncionario.values
    cargos_escrita = (Usuario.TipoFuncionario.ESTOQUISTA, Usuario.TipoFuncionario.GERENTE, Usuario.TipoFuncionario.ADMIN)
    cargos_exclusao = (Usuario.TipoFuncionario.GERENTE, Usuario.TipoFuncionario.ADMIN)
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["nome_lote", "produto__nome"]
    ordering_fields = ["data_validade", "nivel_vencimento", "data_cadastro"]

    def get_queryset(self):
        qs = Lote.objects.select_related("produto", "produto__categoria").filter(produto__deletado_em__isnull=True)
        params = self.request.query_params

        categoria_id = params.get("categoria")
        if categoria_id:
            if not categoria_id.isascii() or not categoria_id.isdecimal() or len(categoria_id) > 18 or int(categoria_id) < 1:
                raise ValidationError({"categoria": "Informe uma categoria válida."})
            qs = qs.filter(produto__categoria_id=int(categoria_id))

        produto_id = params.get("produto")
        if produto_id:
            if not produto_id.isascii() or not produto_id.isdecimal() or len(produto_id) > 18 or int(produto_id) < 1:
                raise ValidationError({"produto": "Informe um produto válido."})
            qs = qs.filter(produto_id=int(produto_id))

        nivel_vencimento = params.get("nivel_vencimento")
        if nivel_vencimento not in (None, ""):
            try:
                nivel = int(nivel_vencimento)
            except (TypeError, ValueError):
                raise ValidationError({"nivel_vencimento": "Informe um nível válido."})
            if nivel not in [valor for valor, _ in Lote.NivelVencimento.choices]:
                raise ValidationError({"nivel_vencimento": "Informe um nível válido."})
            qs = qs.filter(nivel_vencimento=nivel)

        esgotado = params.get("esgotado")
        if esgotado not in (None, ""):
            valor = str(esgotado).lower()
            if valor not in ("1", "true", "verdadeiro", "0", "false", "falso"):
                raise ValidationError({"esgotado": "Informe verdadeiro ou falso."})
            qs = qs.filter(esgotado=valor in ("1", "true", "verdadeiro"))

        ano = params.get("ano")
        if ano:
            try:
                ano_numero = int(ano)
            except (TypeError, ValueError):
                raise ValidationError({"ano": "Informe um ano válido."})
            if not 1900 <= ano_numero <= 9999:
                raise ValidationError({"ano": "Informe um ano válido."})
            qs = qs.filter(data_cadastro__year=ano_numero)

        mes = params.get("mes")
        if mes:
            try:
                mes_numero = int(mes)
            except (TypeError, ValueError):
                raise ValidationError({"mes": "Informe um mês de 1 a 12."})
            if not 1 <= mes_numero <= 12:
                raise ValidationError({"mes": "Informe um mês de 1 a 12."})
            qs = qs.filter(data_cadastro__month=mes_numero)

        for nome, lookup in (("data_inicio", "data_validade__date__gte"), ("data_fim", "data_validade__date__lte")):
            bruto = params.get(nome)
            if bruto:
                try:
                    data = parse_date(bruto)
                except ValueError:
                    data = None
                if data is None:
                    raise ValidationError({nome: "Use uma data válida no formato AAAA-MM-DD."})
                qs = qs.filter(**{lookup: data})

        return qs

    @action(detail=False, methods=["get"], url_path="exportar-csv", permission_classes=[SomenteGerencia])
    def exportar_csv(self, request):
        class Echo:
            def write(self, value):
                return value

        def seguro(value):
            texto = "" if value is None else str(value)
            return "'" + texto if texto.startswith(("=", "+", "-", "@", "\t", "\r")) else texto

        writer = csv.writer(Echo(), delimiter=";")
        def linhas():
            yield "\ufeff"
            yield writer.writerow(["Lote", "Produto", "Categoria", "Validade", "Quantidade", "Esgotado", "Custo unitário", "Nível"])
            for lote in self.get_queryset().order_by("id").iterator(chunk_size=200):
                yield writer.writerow([
                    seguro(lote.nome_lote), seguro(lote.produto.nome), seguro(lote.produto.categoria.nome),
                    lote.data_validade.date().isoformat() if lote.data_validade else "", lote.quantidade,
                    "Sim" if lote.esgotado else "Não", lote.custo_unitario_compra, lote.nivel_vencimento,
                ])
        resposta = StreamingHttpResponse(linhas(), content_type="text/csv; charset=utf-8")
        resposta["Content-Disposition"] = 'attachment; filename="lotes.csv"'
        return resposta

    @action(detail=False, methods=["get"])
    def prioridade(self, request):
        lotes = self.get_queryset().filter(esgotado=False, nivel_vencimento__in=(Lote.NivelVencimento.CRITICO, Lote.NivelVencimento.VENCIDO))
        total = lotes.count()
        primeiros = lotes.order_by("-nivel_vencimento", "data_validade", "id")[:3]
        return Response({"count": total, "results": self.get_serializer(primeiros, many=True).data})

    @action(detail=False, methods=["get"])
    def alertas(self, request):
        lotes = self.get_queryset().filter(esgotado=False, data_validade__date__gte=timezone.localdate()).order_by("data_validade", "id")[:50]
        return Response(self.get_serializer(lotes, many=True).data)

    @action(detail=False, methods=["get"], permission_classes=[SomenteGerencia])
    def lixeira(self, request):
        lotes = Lote.all_objects.filter(deletado_em__isnull=False).select_related("produto")
        return Response(self.get_serializer(lotes, many=True).data)

    @action(detail=True, methods=["post"], permission_classes=[SomenteGerencia])
    def restaurar(self, request, pk=None):
        lote = get_object_or_404(Lote.all_objects.select_related("produto"), pk=pk, deletado_em__isnull=False)
        if lote.produto.deletado_em:
            raise ValidationError({"produto": "Restaure o produto antes do lote."})
        lote.restore()
        return Response(self.get_serializer(lote).data)

    @action(detail=True, methods=["get", "post"], permission_classes=[PermissaoMovimento])
    def movimentos(self, request, pk=None):
        if request.method == "GET":
            lote = self.get_object()
            registros = MovimentoEstoque.objects.filter(lote=lote).select_related("usuario")[:100]
            return Response(MovimentoEstoqueSerializer(registros, many=True).data)

        entrada = NovoMovimentoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        with transaction.atomic():
            lote = get_object_or_404(self.get_queryset().select_for_update(), pk=pk)
            self.check_object_permissions(request, lote)
            tipo = entrada.validated_data["tipo"]
            quantidade = entrada.validated_data["quantidade"]
            anterior = lote.quantidade
            if tipo == MovimentoEstoque.Tipo.ENTRADA:
                novo = anterior + quantidade
            elif tipo == MovimentoEstoque.Tipo.SAIDA:
                novo = anterior - quantidade
            else:
                novo = quantidade
            if novo < 0:
                raise ValidationError({"quantidade": "A saída supera o estoque disponível."})
            if novo > 999999999:
                raise ValidationError({"quantidade": "O estoque não pode exceder 999999999 unidades."})
            lote.quantidade = novo
            lote.esgotado = novo == 0
            if not lote.esgotado:
                lote.nivel_vencimento = lote.calcular_nivel_vencimento()
            lote.save(update_fields=["quantidade", "esgotado", "nivel_vencimento"])
            movimento = MovimentoEstoque.objects.create(
                lote=lote, usuario=request.user, tipo=tipo, quantidade=quantidade,
                quantidade_antes=anterior, quantidade_depois=novo,
                motivo=entrada.validated_data["motivo"],
            )
        return Response({"movimento": MovimentoEstoqueSerializer(movimento).data, "lote": self.get_serializer(lote).data}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="relatorio-prejuizo", permission_classes=[SomenteGerencia])
    def relatorio_prejuizo(self, request):
        """
        GET /api/lotes/relatorio-prejuizo/
        GET /api/lotes/relatorio-prejuizo/?data_inicio=2026-06-01&data_fim=2026-06-30
        """
        bruto_inicio = request.query_params.get("data_inicio")
        bruto_fim = request.query_params.get("data_fim")

        data_inicio = parse_date(bruto_inicio) if bruto_inicio else None
        data_fim = parse_date(bruto_fim) if bruto_fim else None

        if bruto_inicio and data_inicio is None:
            return Response(
                {"detail": "data_inicio inválida. Use o formato AAAA-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if bruto_fim and data_fim is None:
            return Response(
                {"detail": "data_fim inválida. Use o formato AAAA-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if data_inicio and data_fim and data_inicio > data_fim:
            return Response(
                {"detail": "data_inicio não pode ser depois de data_fim."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not data_inicio and not data_fim:
            hoje = timezone.now().date()
            data_inicio, data_fim = hoje - timedelta(days=30), hoje

        base_qs = self.get_queryset()
        if data_inicio:
            base_qs = base_qs.filter(data_validade__date__gte=data_inicio)
        if data_fim:
            base_qs = base_qs.filter(data_validade__date__lte=data_fim)

        com_custo = base_qs.com_prejuizo_calculavel()
        sem_custo = base_qs.sem_custo_cadastrado()

        return Response(
            {
                "periodo": {
                    "data_inicio": data_inicio.isoformat() if data_inicio else None,
                    "data_fim": data_fim.isoformat() if data_fim else None,
                },
                "prejuizo_total": base_qs.prejuizo_total(),
                "quantidade_lotes_considerados": com_custo.count(),
                "lotes_considerados": LoteSerializer(com_custo, many=True).data,
                "quantidade_lotes_sem_custo_cadastrado": sem_custo.count(),
                "lotes_sem_custo_cadastrado": LoteSerializer(sem_custo, many=True).data,
            }
        )

    @action(detail=False, methods=["get"], url_path="sugestoes-desconto", permission_classes=[SomenteGerencia])
    def sugestoes_desconto(self, request):
        """
        GET /api/lotes/sugestoes-desconto/
        GET /api/lotes/sugestoes-desconto/?categoria=<id>
        """
        hoje = timezone.now().date()
        lotes = (
            self.get_queryset()
            .filter(esgotado=False, data_validade__date__gte=hoje)
            .prefetch_related("produto__categoria__regras_desconto")
        )

        sugestoes = []
        for lote in lotes:
            regra = lote.regra_desconto_aplicavel()
            if not regra:
                continue
            preco_sugerido = lote.preco_sugerido_desconto
            sugestoes.append(
                {
                    "lote_id": lote.id,
                    "nome_lote": lote.nome_lote,
                    "quantidade": lote.quantidade,
                    "produto": lote.produto.nome,
                    "categoria": lote.produto.categoria.nome,
                    "preco_venda": lote.produto.preco_venda,
                    "custo_unitario_compra": lote.custo_unitario_compra,
                    "percentual_desconto": regra.percentual,
                    "preco_sugerido": preco_sugerido,
                    "abaixo_do_custo": preco_sugerido < lote.custo_unitario_compra,
                }
            )

        return Response({"quantidade": len(sugestoes), "sugestoes": sugestoes})


class RegraDescontoViewSet(viewsets.ModelViewSet):
    queryset = RegraDesconto.objects.select_related("categoria").all()
    serializer_class = RegraDescontoSerializer
    permission_classes = [PermissaoPorCargo]
    cargos_leitura = (Usuario.TipoFuncionario.GERENTE, Usuario.TipoFuncionario.ADMIN)
    cargos_escrita = cargos_leitura
    cargos_exclusao = cargos_leitura
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["categoria", "percentual", "dias_para_vencimento"]
