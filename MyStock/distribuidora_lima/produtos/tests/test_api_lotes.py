from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from produtos.models import Categoria, Lote, Produto, RegraDesconto
from usuarios.models import Usuario


class LoteApiTestsBase(APITestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(
            nome="Frios", dias_atencao=15, dias_critico=5
        )
        self.produto = Produto.objects.create(
            nome="Iogurte", categoria=self.categoria, preco_venda=10.0
        )
        usuario = Usuario.objects.create_user(
            username="gerente1",
            password="senha-teste-123",
            cpf="22222222222",
            tipo_funcionario=Usuario.TipoFuncionario.GERENTE,
        )
        self.client.force_authenticate(user=usuario)

    def _criar_lote(
        self,
        dias_restantes=10,
        nivel=None,
        esgotado=False,
        custo=3.5,
        data_cadastro=None,
        produto=None,
    ):
        validade = timezone.now() + timedelta(days=dias_restantes)
        lote = Lote.objects.create(
            produto=produto or self.produto,
            quantidade=10,
            custo_unitario_compra=custo,
            data_validade=validade,
            nivel_vencimento=nivel,
            esgotado=esgotado,
        )
        if data_cadastro:
            # data_cadastro é auto_now_add, então só dá pra alterar via update().
            Lote.objects.filter(pk=lote.pk).update(data_cadastro=data_cadastro)
            lote.refresh_from_db()
        return lote


class LoteFiltrosApiTests(LoteApiTestsBase):
    def test_filtro_por_categoria(self):
        outra_categoria = Categoria.objects.create(nome="Limpeza")
        outro_produto = Produto.objects.create(
            nome="Detergente", categoria=outra_categoria, preco_venda=5.0
        )
        lote_frios = self._criar_lote()
        lote_limpeza = self._criar_lote(produto=outro_produto)

        response = self.client.get("/api/lotes/", {"categoria": self.categoria.pk})

        ids = [item["id"] for item in response.data["results"]] if "results" in response.data else [
            item["id"] for item in response.data
        ]
        self.assertIn(lote_frios.id, ids)
        self.assertNotIn(lote_limpeza.id, ids)

    def test_filtro_por_nivel_vencimento(self):
        lote_ok = self._criar_lote(nivel=Lote.NivelVencimento.OK)
        lote_critico = self._criar_lote(nivel=Lote.NivelVencimento.CRITICO)

        response = self.client.get("/api/lotes/", {"nivel_vencimento": Lote.NivelVencimento.CRITICO})

        ids = self._extrair_ids(response)
        self.assertIn(lote_critico.id, ids)
        self.assertNotIn(lote_ok.id, ids)

    def test_filtro_por_esgotado(self):
        lote_esgotado = self._criar_lote(esgotado=True)
        lote_normal = self._criar_lote(esgotado=False)

        response = self.client.get("/api/lotes/", {"esgotado": "true"})

        ids = self._extrair_ids(response)
        self.assertIn(lote_esgotado.id, ids)
        self.assertNotIn(lote_normal.id, ids)

    def test_filtro_por_ano_e_mes_de_cadastro(self):
        lote_junho = self._criar_lote(
            data_cadastro=timezone.make_aware(timezone.datetime(2026, 6, 15))
        )
        lote_julho = self._criar_lote(
            data_cadastro=timezone.make_aware(timezone.datetime(2026, 7, 15))
        )

        response = self.client.get("/api/lotes/", {"ano": "2026", "mes": "6"})

        ids = self._extrair_ids(response)
        self.assertIn(lote_junho.id, ids)
        self.assertNotIn(lote_julho.id, ids)

    def test_filtro_com_valor_invalido_e_ignorado_sem_quebrar(self):
        self._criar_lote()
        response = self.client.get("/api/lotes/", {"ano": "não-é-um-ano", "nivel_vencimento": "abc"})
        self.assertEqual(response.status_code, 200)

    def test_filtros_sao_combinaveis(self):
        lote_certo = self._criar_lote(nivel=Lote.NivelVencimento.CRITICO, esgotado=False)
        self._criar_lote(nivel=Lote.NivelVencimento.CRITICO, esgotado=True)
        self._criar_lote(nivel=Lote.NivelVencimento.OK, esgotado=False)

        response = self.client.get(
            "/api/lotes/",
            {"nivel_vencimento": Lote.NivelVencimento.CRITICO, "esgotado": "false"},
        )

        ids = self._extrair_ids(response)
        self.assertEqual(ids, [lote_certo.id])

    @staticmethod
    def _extrair_ids(response):
        dados = response.data["results"] if "results" in response.data else response.data
        return [item["id"] for item in dados]


class RelatorioPrejuizoApiTests(LoteApiTestsBase):
    def test_periodo_padrao_e_ultimos_30_dias(self):
        response = self.client.get("/api/lotes/relatorio-prejuizo/")
        hoje = timezone.now().date()
        self.assertEqual(response.data["periodo"]["data_fim"], hoje.isoformat())
        self.assertEqual(
            response.data["periodo"]["data_inicio"], (hoje - timedelta(days=30)).isoformat()
        )

    def test_lote_fora_do_periodo_nao_entra_no_total(self):
        self._criar_lote(
            dias_restantes=-90, nivel=Lote.NivelVencimento.VENCIDO, custo=10.0
        )  # venceu há 90 dias, fora dos 30 dias padrão
        response = self.client.get("/api/lotes/relatorio-prejuizo/")
        self.assertEqual(response.data["prejuizo_total"], 0.0)

    def test_lote_dentro_do_periodo_customizado_entra_no_total(self):
        lote = self._criar_lote(
            dias_restantes=-10, nivel=Lote.NivelVencimento.VENCIDO, custo=5.0
        )
        inicio = (timezone.now() - timedelta(days=15)).date().isoformat()
        fim = timezone.now().date().isoformat()

        response = self.client.get(
            "/api/lotes/relatorio-prejuizo/", {"data_inicio": inicio, "data_fim": fim}
        )

        self.assertEqual(response.data["prejuizo_total"], 10 * 5.0)  # quantidade=10

    def test_data_invalida_retorna_400(self):
        response = self.client.get(
            "/api/lotes/relatorio-prejuizo/", {"data_inicio": "não-é-uma-data"}
        )
        self.assertEqual(response.status_code, 400)

    def test_data_inicio_maior_que_data_fim_retorna_400(self):
        response = self.client.get(
            "/api/lotes/relatorio-prejuizo/",
            {"data_inicio": "2026-08-01", "data_fim": "2026-07-01"},
        )
        self.assertEqual(response.status_code, 400)


class SugestaoDescontoApiTests(LoteApiTestsBase):
    def test_lote_sem_regra_nao_aparece(self):
        self._criar_lote(dias_restantes=5)
        response = self.client.get("/api/lotes/sugestoes-desconto/")
        self.assertEqual(response.data["quantidade"], 0)

    def test_lote_com_regra_aplicavel_aparece_com_preco_sugerido(self):
        RegraDesconto.objects.create(
            categoria=self.categoria, percentual=25, dias_para_vencimento=10
        )
        lote = self._criar_lote(dias_restantes=5)  # preco_venda=10.0 -> sugerido 7.5

        response = self.client.get("/api/lotes/sugestoes-desconto/")

        self.assertEqual(response.data["quantidade"], 1)
        sugestao = response.data["sugestoes"][0]
        self.assertEqual(sugestao["lote_id"], lote.id)
        self.assertEqual(sugestao["preco_sugerido"], 7.5)
        self.assertEqual(sugestao["percentual_desconto"], 25)
        self.assertFalse(sugestao["abaixo_do_custo"])

    def test_aviso_abaixo_do_custo(self):
        RegraDesconto.objects.create(
            categoria=self.categoria, percentual=50, dias_para_vencimento=10
        )
        self._criar_lote(dias_restantes=5, custo=8.0)  # sugerido=5.0 < custo=8.0

        response = self.client.get("/api/lotes/sugestoes-desconto/")

        self.assertTrue(response.data["sugestoes"][0]["abaixo_do_custo"])

    def test_lote_esgotado_nao_aparece(self):
        RegraDesconto.objects.create(
            categoria=self.categoria, percentual=20, dias_para_vencimento=10
        )
        self._criar_lote(dias_restantes=5, esgotado=True)
        response = self.client.get("/api/lotes/sugestoes-desconto/")
        self.assertEqual(response.data["quantidade"], 0)

    def test_lote_vencido_nao_aparece(self):
        RegraDesconto.objects.create(
            categoria=self.categoria, percentual=20, dias_para_vencimento=30
        )
        self._criar_lote(dias_restantes=-1)
        response = self.client.get("/api/lotes/sugestoes-desconto/")
        self.assertEqual(response.data["quantidade"], 0)

    def test_filtro_por_categoria(self):
        outra_categoria = Categoria.objects.create(nome="Limpeza")
        outro_produto = Produto.objects.create(
            nome="Detergente", categoria=outra_categoria, preco_venda=5.0
        )
        RegraDesconto.objects.create(
            categoria=self.categoria, percentual=20, dias_para_vencimento=10
        )
        RegraDesconto.objects.create(
            categoria=outra_categoria, percentual=20, dias_para_vencimento=10
        )
        self._criar_lote(dias_restantes=5)
        self._criar_lote(dias_restantes=5, produto=outro_produto)

        response = self.client.get(
            "/api/lotes/sugestoes-desconto/", {"categoria": self.categoria.pk}
        )

        self.assertEqual(response.data["quantidade"], 1)
        self.assertEqual(response.data["sugestoes"][0]["categoria"], "Frios")


class UsuarioNaoAutenticadoApiTests(APITestCase):
    def test_endpoints_novos_exigem_autenticacao(self):
        for url in [
            "/api/lotes/relatorio-prejuizo/",
            "/api/lotes/sugestoes-desconto/",
            "/api/lotes/",
        ]:
            response = self.client.get(url)
            self.assertEqual(response.status_code, 401, url)