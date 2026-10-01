from rest_framework import filters, viewsets
from datetime import timedelta

from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Categoria, Lote, Produto, ProdutoSKU, RegraDesconto
from .serializers import (
    CategoriaSerializer,
    LoteSerializer,
    ProdutoSerializer,
    ProdutoSKUSerializer,
    RegraDescontoSerializer,
)


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer


class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.select_related("categoria").prefetch_related("skus").all()
    serializer_class = ProdutoSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["nome", "skus__codigo_barras"]
    ordering_fields = ["nome", "preco_venda"]


class ProdutoSKUViewSet(viewsets.ModelViewSet):
    queryset = ProdutoSKU.objects.select_related("produto").all()
    serializer_class = ProdutoSKUSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["codigo_barras", "produto__nome"]


class LoteViewSet(viewsets.ModelViewSet):
    """
    GET/POST /api/lotes/               (aceita ?search= e ?ordering=)
    GET/PUT/PATCH/DELETE /api/lotes/{id}/
    """

    queryset = Lote.objects.select_related("produto", "produto__categoria").all()
    serializer_class = LoteSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["nome_lote", "produto__nome"]
    ordering_fields = ["data_validade", "nivel_vencimento", "data_cadastro"]

    def get_queryset(self):
        qs = Lote.objects.select_related("produto", "produto__categoria").all()
        params = self.request.query_params

        categoria_id = params.get("categoria")
        if categoria_id:
            qs = qs.filter(produto__categoria_id=categoria_id)

        nivel_vencimento = params.get("nivel_vencimento")
        if nivel_vencimento not in (None, ""):
            try:
                qs = qs.filter(nivel_vencimento=int(nivel_vencimento))
            except (TypeError, ValueError):
                pass  

        esgotado = params.get("esgotado")
        if esgotado not in (None, ""):
            qs = qs.filter(esgotado=str(esgotado).lower() in ("1", "true", "verdadeiro"))

        ano = params.get("ano")
        if ano:
            try:
                qs = qs.filter(data_cadastro__year=int(ano))
            except (TypeError, ValueError):
                pass

        mes = params.get("mes")
        if mes:
            try:
                qs = qs.filter(data_cadastro__month=int(mes))
            except (TypeError, ValueError):
                pass

        return qs

    @action(detail=False, methods=["get"], url_path="relatorio-prejuizo")
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
                "periodo": {"data_inicio": data_inicio, "data_fim": data_fim},
                "prejuizo_total": base_qs.prejuizo_total(),
                "quantidade_lotes_considerados": com_custo.count(),
                "lotes_considerados": LoteSerializer(com_custo, many=True).data,
                "quantidade_lotes_sem_custo_cadastrado": sem_custo.count(),
                "lotes_sem_custo_cadastrado": LoteSerializer(sem_custo, many=True).data,
            }
        )

    @action(detail=False, methods=["get"], url_path="sugestoes-desconto")
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
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["categoria", "percentual", "dias_para_vencimento"]