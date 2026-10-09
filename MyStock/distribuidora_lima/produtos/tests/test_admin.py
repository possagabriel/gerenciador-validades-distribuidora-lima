from unittest.mock import Mock

from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory, TestCase

from produtos.admin import CategoriaAdmin
from produtos.models import Categoria


class CategoriaAdminTest(TestCase):

    def setUp(self):
        self.site = AdminSite()
        self.factory = RequestFactory()

        self.admin = CategoriaAdmin(Categoria, self.site)
        self.admin.message_user = Mock()

        self.categoria = Categoria.objects.create(
            nome="Limpeza",
            dias_atencao=30,
            dias_critico=7,
        )

    def test_get_queryset_retorna_registros_soft_deletados(self):
        self.categoria.delete()

        # Manager padrão não enxerga registros excluídos
        self.assertFalse(Categoria.objects.filter(pk=self.categoria.pk).exists())

        request = self.factory.get("/admin/")
        queryset = self.admin.get_queryset(request)

        self.assertEqual(queryset.filter(pk=self.categoria.pk).count(), 1)

    def test_excluido_retorna_true_quando_soft_deletado(self):
        self.categoria.delete()

        self.assertTrue(self.admin.excluido(self.categoria))

    def test_excluido_retorna_false_quando_ativo(self):
        self.assertFalse(self.admin.excluido(self.categoria))

    def test_restaurar_selecionados(self):
        self.categoria.delete()

        request = self.factory.post("/admin/")

        queryset = Categoria.all_objects.filter(pk=self.categoria.pk)

        self.admin.restaurar_selecionados(request, queryset)

        self.categoria.refresh_from_db()

        self.assertFalse(self.categoria.esta_excluido)

    def test_excluir_definitivamente(self):
        request = self.factory.post("/admin/")

        queryset = Categoria.all_objects.filter(pk=self.categoria.pk)

        self.admin.excluir_definitivamente(request, queryset)

        self.assertFalse(
            Categoria.all_objects.filter(pk=self.categoria.pk).exists()
        )
