from django.contrib import admin

from .models import Categoria, Lote, Produto, ProdutoSKU


class SoftDeleteAdminMixin:
    """
    Mixin de admin compartilhado por CategoriaAdmin, ProdutoAdmin e LoteAdmin.
    Faz o Admin (tela do ADMIN) enxergar TODOS os registros, inclusive os
    soft-deletados pelo Gerente, e adiciona ações para restaurar ou excluir
    de verdade.
    """

    def get_queryset(self, request):
        qs = self.model.all_objects.get_queryset()
        ordering = self.get_ordering(request)
        if ordering:
            qs = qs.order_by(*ordering)
        return qs

    @admin.display(boolean=True, description="Excluído?")
    def excluido(self, obj):
        return obj.esta_excluido

    @admin.action(description="Restaurar selecionados (desfaz a exclusão)")
    def restaurar_selecionados(self, request, queryset):
        atualizados = 0
        for obj in queryset:
            if obj.esta_excluido:
                obj.restore()
                atualizados += 1
        self.message_user(request, f"{atualizados} registro(s) restaurado(s).")

    @admin.action(description="Excluir DEFINITIVAMENTE (irreversível, remove do banco)")
    def excluir_definitivamente(self, request, queryset):
        total = queryset.count()
        for obj in queryset:
            obj.hard_delete()
        self.message_user(
            request,
            f"{total} registro(s) removido(s) permanentemente do banco.",
            level="warning",
        )

    actions = ["restaurar_selecionados", "excluir_definitivamente"]


@admin.register(Categoria)
class CategoriaAdmin(SoftDeleteAdminMixin, admin.ModelAdmin):
    list_display = ("nome", "dias_atencao", "dias_critico", "excluido")
    search_fields = ("nome",)


class ProdutoSKUInline(admin.TabularInline):
    model = ProdutoSKU
    extra = 1


@admin.register(Produto)
class ProdutoAdmin(SoftDeleteAdminMixin, admin.ModelAdmin):
    list_display = ("nome", "categoria", "preco_venda", "excluido")
    list_filter = ("categoria", "deletado_em")
    search_fields = ("nome", "skus__codigo_barras")
    autocomplete_fields = ("categoria",)
    inlines = [ProdutoSKUInline]


@admin.register(Lote)
class LoteAdmin(SoftDeleteAdminMixin, admin.ModelAdmin):
    list_display = (
        "nome_lote",
        "produto",
        "quantidade",
        "custo_unitario_compra",
        "data_validade",
        "nivel_vencimento",
        "dias_vencido_display",
        "esgotado",
        "excluido",
    )
    list_filter = ("produto__categoria", "nivel_vencimento", "esgotado", "deletado_em")
    search_fields = ("nome_lote", "produto__nome")
    autocomplete_fields = ("produto",)
    date_hierarchy = "data_validade"
    readonly_fields = ("nome_lote", "data_cadastro", "dias_vencido")

    @admin.display(description="Dias vencido")
    def dias_vencido_display(self, obj):
        return obj.dias_vencido if obj.dias_vencido is not None else "-"