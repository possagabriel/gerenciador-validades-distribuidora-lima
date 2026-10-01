from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from django.utils import timezone

from produtos.models import (
    Categoria,
    ContadorLote,
    Lote,
    Produto,
    ProdutoSKU,
    get_categoria_padrao,
)


class CategoriaModelTests(TestCase):
    def test_str_retorna_nome(self):
        categoria = Categoria.objects.create(nome="Frios")
        self.assertEqual(str(categoria), "Frios")

    def test_valores_padrao_de_threshold(self):
        categoria = Categoria.objects.create(nome="Limpeza")
        self.assertEqual(categoria.dias_atencao, 30)
        self.assertEqual(categoria.dias_critico, 7)

    def test_dias_critico_maior_ou_igual_a_dias_atencao_levanta_erro(self):
        categoria = Categoria(nome="Inválida", dias_atencao=5, dias_critico=10)
        with self.assertRaises(ValidationError):
            categoria.clean()

    def test_get_categoria_padrao_e_idempotente(self):
        id_1 = get_categoria_padrao()
        id_2 = get_categoria_padrao()
        self.assertEqual(id_1, id_2)
        self.assertEqual(Categoria.objects.filter(nome="Sem Categoria").count(), 1)


class ProdutoModelTests(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(
            nome="Frios", dias_atencao=15, dias_critico=5
        )

    def test_str_retorna_nome(self):
        produto = Produto.objects.create(
            nome="Iogurte", categoria=self.categoria, preco_venda=5.99
        )
        self.assertEqual(str(produto), "Iogurte")

    def test_categoria_usa_default_quando_nao_informada(self):
        produto = Produto.objects.create(nome="Genérico", preco_venda=1.0)
        self.assertEqual(produto.categoria.nome, "Sem Categoria")

    def test_delete_e_soft_apenas_marca_deletado_em(self):
        produto = Produto.objects.create(
            nome="Iogurte", categoria=self.categoria, preco_venda=5.99
        )
        produto.delete()

        self.assertTrue(Produto.all_objects.filter(pk=produto.pk).exists())
        self.assertFalse(Produto.objects.filter(pk=produto.pk).exists())
        produto.refresh_from_db()
        self.assertTrue(produto.esta_excluido)

    def test_restore_desfaz_soft_delete(self):
        produto = Produto.objects.create(
            nome="Iogurte", categoria=self.categoria, preco_venda=5.99
        )
        produto.delete()
        produto.restore()
        self.assertTrue(Produto.objects.filter(pk=produto.pk).exists())


class ProdutoSKUModelTests(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(nome="Frios")
        self.produto = Produto.objects.create(
            nome="Iogurte", categoria=self.categoria, preco_venda=5.99
        )

    def test_str(self):
        sku = ProdutoSKU.objects.create(
            produto=self.produto, codigo_barras="789123000111"
        )
        self.assertEqual(str(sku), "789123000111 (Iogurte)")

    def test_codigo_barras_deve_ser_unico(self):
        ProdutoSKU.objects.create(produto=self.produto, codigo_barras="789123000111")
        with self.assertRaises(IntegrityError):
            ProdutoSKU.objects.create(
                produto=self.produto, codigo_barras="789123000111"
            )

    def test_hard_delete_do_produto_remove_skus_em_cascata(self):
        sku = ProdutoSKU.objects.create(
            produto=self.produto, codigo_barras="789123000111"
        )
        self.produto.hard_delete()
        self.assertFalse(ProdutoSKU.objects.filter(pk=sku.pk).exists())


class LoteModelTests(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(
            nome="Frios", dias_atencao=15, dias_critico=5
        )
        self.produto = Produto.objects.create(
            nome="Iogurte", categoria=self.categoria, preco_venda=5.99
        )

    def _criar_lote(self, **overrides):
        dados = {"produto": self.produto, "quantidade": 10, "custo_unitario_compra": 3.5}
        dados.update(overrides)
        return Lote.objects.create(**dados)

    def test_sem_data_validade_e_sem_tempo_vencimento_levanta_erro(self):
        with self.assertRaises(ValidationError):
            self._criar_lote()

    def test_nome_lote_e_gerado_automaticamente_no_formato_esperado(self):
        lote = self._criar_lote(tempo_vencimento=5)
        hoje = timezone.now().date()
        self.assertEqual(
            lote.nome_lote, f"{hoje:%Y%m%d}-P{self.produto.pk}-001"
        )

    def test_nome_lote_incrementa_por_produto_e_dia(self):
        lote_1 = self._criar_lote(tempo_vencimento=5)
        lote_2 = self._criar_lote(tempo_vencimento=5)
        hoje = timezone.now().date()
        self.assertEqual(lote_1.nome_lote, f"{hoje:%Y%m%d}-P{self.produto.pk}-001")
        self.assertEqual(lote_2.nome_lote, f"{hoje:%Y%m%d}-P{self.produto.pk}-002")

    def test_nome_lote_reinicia_sequencial_para_outro_produto(self):
        outro_produto = Produto.objects.create(
            nome="Queijo", categoria=self.categoria, preco_venda=10.0
        )
        self._criar_lote(tempo_vencimento=5)
        lote_outro = self._criar_lote(tempo_vencimento=5, produto=outro_produto)
        hoje = timezone.now().date()
        self.assertEqual(
            lote_outro.nome_lote, f"{hoje:%Y%m%d}-P{outro_produto.pk}-001"
        )

    def test_nome_lote_permanece_igual_apos_atualizar_outros_campos(self):
        lote = self._criar_lote(tempo_vencimento=5)
        nome_original = lote.nome_lote

        lote.quantidade = 20
        lote.save()
        lote.refresh_from_db()

        self.assertEqual(lote.nome_lote, nome_original)
        self.assertEqual(lote.quantidade, 20)

    def test_nome_lote_e_unico(self):
        lote_1 = self._criar_lote(tempo_vencimento=5)
        lote_2 = self._criar_lote(tempo_vencimento=5)
        self.assertNotEqual(lote_1.nome_lote, lote_2.nome_lote)

    def test_tempo_vencimento_calcula_data_validade_automaticamente(self):
        antes = timezone.now()
        lote = self._criar_lote(tempo_vencimento=7)
        depois = timezone.now()
        self.assertGreaterEqual(lote.data_validade, antes + timedelta(days=7))
        self.assertLessEqual(
            lote.data_validade, depois + timedelta(days=7, seconds=5)
        )

    def test_hard_delete_nao_permite_excluir_produto_com_lotes_vinculados(self):
        self._criar_lote(tempo_vencimento=5)
        with self.assertRaises(ProtectedError):
            self.produto.hard_delete()

    def test_delete_e_soft_nao_remove_a_linha(self):
        lote = self._criar_lote(tempo_vencimento=5)
        lote.delete()
        self.assertFalse(Lote.objects.filter(pk=lote.pk).exists())
        self.assertTrue(Lote.all_objects.filter(pk=lote.pk).exists())

    def test_esgotado_e_false_por_padrao(self):
        lote = self._criar_lote(tempo_vencimento=5)
        self.assertFalse(lote.esgotado)

    def test_dias_vencido_e_none_quando_lote_ainda_nao_venceu(self):
        lote = self._criar_lote(tempo_vencimento=10)
        self.assertIsNone(lote.dias_vencido)

    def test_dias_vencido_e_none_quando_vence_exatamente_hoje(self):
        lote = self._criar_lote(data_validade=timezone.now())
        self.assertIsNone(lote.dias_vencido)

    def test_dias_vencido_calcula_dias_desde_o_vencimento(self):
        validade = timezone.now() - timedelta(days=4)
        lote = self._criar_lote(data_validade=validade)
        self.assertEqual(lote.dias_vencido, 4)

    def test_dias_vencido_e_none_sem_data_validade(self):
        lote = Lote(produto=self.produto, quantidade=1)
        self.assertIsNone(lote.dias_vencido)


class ContadorLoteTests(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(nome="Frios")
        self.produto = Produto.objects.create(
            nome="Iogurte", categoria=self.categoria, preco_venda=5.99
        )

    def test_proximo_sequencial_incrementa_a_cada_chamada(self):
        hoje = timezone.now().date()
        self.assertEqual(ContadorLote.proximo_sequencial(self.produto, hoje), 1)
        self.assertEqual(ContadorLote.proximo_sequencial(self.produto, hoje), 2)
        self.assertEqual(ContadorLote.proximo_sequencial(self.produto, hoje), 3)

    def test_proximo_sequencial_e_independente_por_data(self):
        hoje = timezone.now().date()
        ontem = hoje - timedelta(days=1)
        self.assertEqual(ContadorLote.proximo_sequencial(self.produto, hoje), 1)
        self.assertEqual(ContadorLote.proximo_sequencial(self.produto, ontem), 1)