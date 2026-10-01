from rest_framework.routers import DefaultRouter

from .views import (
    CategoriaViewSet,
    LoteViewSet,
    ProdutoSKUViewSet,
    ProdutoViewSet,
    RegraDescontoViewSet,
)

router = DefaultRouter()
router.register("categorias", CategoriaViewSet, basename="categoria")
router.register("produtos", ProdutoViewSet, basename="produto")
router.register("produto-skus", ProdutoSKUViewSet, basename="produto-sku")
router.register("lotes", LoteViewSet, basename="lote")
router.register("regras-desconto", RegraDescontoViewSet, basename="regradesconto")

urlpatterns = router.urls