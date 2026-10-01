from django.urls import path

from . import views

app_name = "gerente"

urlpatterns = [
    path("", views.TelaLoginView.as_view(), name="login"),
    path("logout/", views.TelaLogoutView.as_view(), name="logout"),
    path("categorias/", views.CategoriaListView.as_view(), name="categoria_list"),
    path("categorias/novo/", views.CategoriaCreateView.as_view(), name="categoria_create"),
    path("categorias/<int:pk>/editar/", views.CategoriaUpdateView.as_view(), name="categoria_update"),
    path("categorias/<int:pk>/excluir/", views.CategoriaSoftDeleteView.as_view(), name="categoria_delete"),
    path("produtos/", views.ProdutoListView.as_view(), name="produto_list"),
    path("produtos/novo/", views.ProdutoCreateView.as_view(), name="produto_create"),
    path("produtos/<int:pk>/editar/", views.ProdutoUpdateView.as_view(), name="produto_update"),
    path("produtos/<int:pk>/excluir/", views.ProdutoSoftDeleteView.as_view(), name="produto_delete"),
    path("lotes/", views.LoteListView.as_view(), name="lote_list"),
    path("lotes/novo/", views.LoteCreateView.as_view(), name="lote_create"),
    path("lotes/<int:pk>/editar/", views.LoteUpdateView.as_view(), name="lote_update"),
    path("lotes/<int:pk>/excluir/", views.LoteSoftDeleteView.as_view(), name="lote_delete"),
    path("lotes/<int:pk>/esgotado/", views.LoteToggleEsgotadoView.as_view(), name="lote_toggle_esgotado"),
    path("relatorios/prejuizo/", views.PrejuizoListView.as_view(), name="prejuizo_list"),
    path("descontos/regras/", views.RegraDescontoListView.as_view(), name="regra_desconto_list"),
    path("descontos/regras/novo/", views.RegraDescontoCreateView.as_view(), name="regra_desconto_create"),
    path("descontos/regras/<int:pk>/excluir/", views.RegraDescontoDeleteView.as_view(), name="regra_desconto_delete"),
    path("descontos/sugestoes/", views.SugestaoDescontoListView.as_view(), name="sugestao_desconto_list"),
]