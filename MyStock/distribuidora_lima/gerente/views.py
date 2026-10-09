from datetime import timedelta

from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib.auth.views import LoginView, LogoutView
from django.db.models import F, Sum
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse_lazy
from django.utils import timezone
from django.views.generic import CreateView, ListView, UpdateView, View

from produtos.models import Categoria, Lote, Produto, RegraDesconto
from usuarios.models import Usuario

from .forms import (
    CategoriaForm,
    LoginForm,
    LoteFiltroForm,
    LoteForm,
    PrejuizoFiltroForm,
    ProdutoForm,
    RegraDescontoForm,
    SugestaoDescontoFiltroForm,
)

class TelaLoginView(LoginView):

    template_name = "gerente/login.html"
    redirect_authenticated_user = True
    authentication_form = LoginForm

    def get_success_url(self):
        return str(reverse_lazy("gerente:lote_list"))


class TelaLogoutView(LogoutView):
    next_page = reverse_lazy("gerente:login")


class GerenteRequiredMixin(LoginRequiredMixin, UserPassesTestMixin):

    login_url = reverse_lazy("gerente:login")

    def test_func(self):
        usuario = self.request.user
        return (
            usuario.is_superuser
            or usuario.tipo_funcionario == Usuario.TipoFuncionario.GERENTE
        )


class CategoriaListView(GerenteRequiredMixin, ListView):
    model = Categoria
    template_name = "gerente/categoria_list.html"
    context_object_name = "categorias"
    paginate_by = 20
    ordering = ["nome"]


class CategoriaCreateView(GerenteRequiredMixin, CreateView):
    model = Categoria
    form_class = CategoriaForm
    template_name = "gerente/categoria_form.html"
    success_url = reverse_lazy("gerente:categoria_list")

    def form_valid(self, form):
        messages.success(self.request, "Categoria criada com sucesso.")
        return super().form_valid(form)


class CategoriaUpdateView(GerenteRequiredMixin, UpdateView):
    model = Categoria
    form_class = CategoriaForm
    template_name = "gerente/categoria_form.html"
    success_url = reverse_lazy("gerente:categoria_list")

    def form_valid(self, form):
        messages.success(self.request, "Categoria atualizada com sucesso.")
        return super().form_valid(form)


class CategoriaSoftDeleteView(GerenteRequiredMixin, View):
    def post(self, request, pk):
        categoria = get_object_or_404(Categoria, pk=pk)
        categoria.delete()  
        messages.success(request, f'Categoria "{categoria.nome}" excluída.')
        return redirect("gerente:categoria_list")


class ProdutoListView(GerenteRequiredMixin, ListView):
    model = Produto
    template_name = "gerente/produto_list.html"
    context_object_name = "produtos"
    paginate_by = 20
    ordering = ["nome"]

    def get_queryset(self):
        return super().get_queryset().select_related("categoria")


class ProdutoCreateView(GerenteRequiredMixin, CreateView):
    model = Produto
    form_class = ProdutoForm
    template_name = "gerente/produto_form.html"
    success_url = reverse_lazy("gerente:produto_list")

    def form_valid(self, form):
        messages.success(self.request, "Produto criado com sucesso.")
        return super().form_valid(form)


class ProdutoUpdateView(GerenteRequiredMixin, UpdateView):
    model = Produto
    form_class = ProdutoForm
    template_name = "gerente/produto_form.html"
    success_url = reverse_lazy("gerente:produto_list")

    def form_valid(self, form):
        messages.success(self.request, "Produto atualizado com sucesso.")
        return super().form_valid(form)


class ProdutoSoftDeleteView(GerenteRequiredMixin, View):
    def post(self, request, pk):
        produto = get_object_or_404(Produto, pk=pk)
        produto.delete()  # soft delete
        messages.success(request, f'Produto "{produto.nome}" excluído.')
        return redirect("gerente:produto_list")


class LoteListView(GerenteRequiredMixin, ListView):
    model = Lote
    template_name = "gerente/lote_list.html"
    context_object_name = "lotes"
    paginate_by = 25

    def get_queryset(self):
        qs = Lote.objects.select_related("produto", "produto__categoria").filter(produto__deletado_em__isnull=True)

        self.filtro_form = LoteFiltroForm(self.request.GET or None)
        if self.filtro_form.is_valid():
            dados = self.filtro_form.cleaned_data

            if dados.get("categoria"):
                qs = qs.filter(produto__categoria=dados["categoria"])
            if dados.get("nivel_vencimento"):
                qs = qs.filter(nivel_vencimento=dados["nivel_vencimento"])
            if dados.get("esgotado"):
                qs = qs.filter(esgotado=(dados["esgotado"] == "1"))
            if dados.get("ano"):
                qs = qs.filter(data_cadastro__year=int(dados["ano"]))
            if dados.get("mes"):
                qs = qs.filter(data_cadastro__month=int(dados["mes"]))

        return qs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["filtro_form"] = self.filtro_form
        return context


class LoteCreateView(GerenteRequiredMixin, CreateView):
    model = Lote
    form_class = LoteForm
    template_name = "gerente/lote_form.html"
    success_url = reverse_lazy("gerente:lote_list")

    def form_valid(self, form):
        messages.success(self.request, "Lote criado com sucesso.")
        return super().form_valid(form)


class LoteUpdateView(GerenteRequiredMixin, UpdateView):
    model = Lote
    form_class = LoteForm
    template_name = "gerente/lote_form.html"
    success_url = reverse_lazy("gerente:lote_list")

    def form_valid(self, form):
        messages.success(self.request, "Lote atualizado com sucesso.")
        return super().form_valid(form)


class LoteSoftDeleteView(GerenteRequiredMixin, View):
    def post(self, request, pk):
        lote = get_object_or_404(Lote, pk=pk)
        lote.delete()  # soft delete
        messages.success(request, f"Lote {lote.nome_lote} excluído.")
        return redirect("gerente:lote_list")


class LoteToggleEsgotadoView(GerenteRequiredMixin, View):
    """Botão dedicado na listagem para marcar/desmarcar um lote como esgotado."""

    def post(self, request, pk):
        lote = get_object_or_404(Lote, pk=pk)
        lote.esgotado = not lote.esgotado
        lote.save(update_fields=["esgotado"])

        acao = "marcado como esgotado" if lote.esgotado else "desmarcado como esgotado"
        messages.success(request, f"Lote {lote.nome_lote} {acao}.")

        return redirect(request.META.get("HTTP_REFERER") or reverse_lazy("gerente:lote_list"))


class PrejuizoListView(GerenteRequiredMixin, ListView):
    """
    Lista lotes VENCIDOS (excluindo esgotados) dentro de um intervalo de
    datas, com o valor de prejuízo de cada um (quantidade * custo unitário)
    e o total do período.

    O filtro de período é sobre `data_validade` — ou seja, "lotes que
    venceram entre X e Y".
    """

    model = Lote
    template_name = "gerente/prejuizo_list.html"
    context_object_name = "lotes"
    paginate_by = 50

    def get_periodo_padrao(self):
        hoje = timezone.now().date()
        return hoje - timedelta(days=30), hoje

    def get_queryset(self):
        qs = (
            Lote.objects.select_related("produto", "produto__categoria")
            .filter(nivel_vencimento=Lote.NivelVencimento.VENCIDO, esgotado=False, produto__deletado_em__isnull=True)
            .annotate(valor_prejuizo=F("quantidade") * F("custo_unitario_compra"))
        )

        self.filtro_form = PrejuizoFiltroForm(self.request.GET or None)
        data_inicio = data_fim = None
        if self.filtro_form.is_valid():
            data_inicio = self.filtro_form.cleaned_data.get("data_inicio")
            data_fim = self.filtro_form.cleaned_data.get("data_fim")

        if not data_inicio and not data_fim:
            data_inicio, data_fim = self.get_periodo_padrao()

        self.data_inicio = data_inicio
        self.data_fim = data_fim

        if data_inicio:
            qs = qs.filter(data_validade__date__gte=data_inicio)
        if data_fim:
            qs = qs.filter(data_validade__date__lte=data_fim)

        return qs.order_by("data_validade")

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["filtro_form"] = self.filtro_form
        context["data_inicio"] = self.data_inicio
        context["data_fim"] = self.data_fim

        total = self.object_list.aggregate(total=Sum(F("quantidade") * F("custo_unitario_compra")))
        context["total_prejuizo"] = total["total"] or 0

        hoje = timezone.now().date()
        inicio_semana = hoje - timedelta(days=hoje.weekday())  # segunda-feira desta semana
        context["atalho_semana"] = {"data_inicio": inicio_semana, "data_fim": hoje}
        context["atalho_30_dias"] = {"data_inicio": hoje - timedelta(days=30), "data_fim": hoje}

        return context

class RegraDescontoListView(GerenteRequiredMixin, ListView):
    model = RegraDesconto
    template_name = "gerente/regra_desconto_list.html"
    context_object_name = "regras"
    paginate_by = 30

    def get_queryset(self):
        return super().get_queryset().select_related("categoria")


class RegraDescontoCreateView(GerenteRequiredMixin, CreateView):
    model = RegraDesconto
    form_class = RegraDescontoForm
    template_name = "gerente/regra_desconto_form.html"
    success_url = reverse_lazy("gerente:regra_desconto_list")

    def form_valid(self, form):
        messages.success(self.request, "Regra de desconto criada com sucesso.")
        return super().form_valid(form)


class RegraDescontoDeleteView(GerenteRequiredMixin, View):

    def post(self, request, pk):
        regra = get_object_or_404(RegraDesconto, pk=pk)
        descricao = str(regra)
        regra.delete()
        messages.success(request, f'Regra "{descricao}" excluída.')
        return redirect("gerente:regra_desconto_list")


class SugestaoDescontoListView(GerenteRequiredMixin, ListView):

    template_name = "gerente/sugestao_desconto_list.html"
    context_object_name = "sugestoes"
    paginate_by = 50

    def get_queryset(self):
        hoje = timezone.now().date()
        lotes = (
            Lote.objects.select_related("produto", "produto__categoria")
            .prefetch_related("produto__categoria__regras_desconto")
            .filter(esgotado=False, data_validade__date__gte=hoje, produto__deletado_em__isnull=True)
        )

        self.filtro_form = SugestaoDescontoFiltroForm(self.request.GET or None)
        if self.filtro_form.is_valid() and self.filtro_form.cleaned_data.get("categoria"):
            lotes = lotes.filter(produto__categoria=self.filtro_form.cleaned_data["categoria"])

        sugestoes = []
        for lote in lotes:
            regra = lote.regra_desconto_aplicavel()
            if not regra:
                continue
            preco_sugerido = lote.preco_sugerido_desconto
            sugestoes.append(
                {
                    "lote": lote,
                    "regra": regra,
                    "preco_sugerido": preco_sugerido,
                    "abaixo_do_custo": preco_sugerido < lote.custo_unitario_compra,
                }
            )
        return sugestoes

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["filtro_form"] = self.filtro_form
        return context
