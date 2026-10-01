from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from produtos.models import Categoria, Lote, Produto
from usuarios.models import Usuario


class PrejuizoAcessoTests(TestCase):
    """
    Controle de acesso: só GERENTE e superusuário podem ver essa tela
    (mesma regra do GerenteRequiredMixin usado nas outras telas).
    """

    def setUp(self):
        self.url = reverse("gerente:prejuizo_list")

    def test_usuario_nao_autenticado_e_redirecionado_para_login(self):
        response = self.client.get(self.url)
        self.assertRedirects(response, f"{reverse('gerente:login')}?next={self.url}")

    def test_usuario_caixa_recebe_403(self):
        usuario = Usuario.objects.create_user(
            username="caixa1",
            password="senha-teste-123",
            cpf="11111111111",
            tipo_funcionario=Usuario.TipoFuncionario.CAIXA,
        )
        self.client.force_login(usuario)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 403)

    def test_usuario_gerente_acessa_normalmente(self):
        usuario = Usuario.objects.create_user(
            username="gerente1",
            password="senha-teste-123",
            cpf="22222222222",
            tipo_funcionario=Usuario.TipoFuncionario.GERENTE,
        )
        self.client.force_login(usuario)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_superusuario_acessa_mesmo_sem_ser_gerente(self):
        usuario = Usuario.objects.create_superuser(
            username="admin1",
            password="senha-teste-123",
            cpf="33333333333",
            tipo_funcionario=Usuario.TipoFuncionario.CAIXA,
        )
        self.client.force_login(usuario)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)


class PrejuizoCalculoTests(TestCase):
    """
    Regras de negócio da tela: quais lotes entram na conta, como o valor é
    calculado e como o período (data_validade) filtra o resultado.

    Período padrão (sem filtro): últimos 30 dias até hoje.
    """

    def setUp(self):
        self.categoria = Categoria.objects.create(
            nome="Frios", dias_atencao=15, dias_critico=5
        )
        self.produto = Produto.objects.create(
            nome="Iogurte", categoria=self.categoria, preco_venda=5.99
        )
        self.gerente = Usuario.objects.create_user(
            username="gerente1",
            password="senha-teste-123",
            cpf="22222222222",
            tipo_funcionario=Usuario.TipoFuncionario.GERENTE,
        )
        self.client.force_login(self.gerente)
        self.url = reverse("gerente:prejuizo_list")

    def _criar_lote(
        self,
        dias_vencido,
        esgotado=False,
        custo=3.5,
        quantidade=10,
        nivel=Lote.NivelVencimento.VENCIDO,
        produto=None,
    ):
        # nivel_vencimento é passado direto na criação porque, nos testes,
        # não estamos rodando o management command calcular_nivel_vencimento
        # — só ele recalcula esse campo na aplicação real.
        validade = timezone.now() - timedelta(days=dias_vencido)
        return Lote.objects.create(
            produto=produto or self.produto,
            quantidade=quantidade,
            custo_unitario_compra=custo,
            data_validade=validade,
            nivel_vencimento=nivel,
            esgotado=esgotado,
        )

    # --- Quais lotes entram na conta ---

    def test_lote_vencido_nao_esgotado_aparece_na_lista(self):
        lote = self._criar_lote(dias_vencido=5)
        response = self.client.get(self.url)
        self.assertContains(response, lote.nome_lote)

    def test_lote_esgotado_nao_entra_no_calculo(self):
        lote = self._criar_lote(dias_vencido=5, esgotado=True)
        response = self.client.get(self.url)
        self.assertNotContains(response, lote.nome_lote)
        self.assertEqual(response.context["total_prejuizo"], 0)

    def test_lote_nao_vencido_nao_aparece(self):
        lote_ok = self._criar_lote(dias_vencido=5, nivel=Lote.NivelVencimento.OK)
        response = self.client.get(self.url)
        self.assertNotContains(response, lote_ok.nome_lote)

    def test_lote_soft_deletado_nao_aparece(self):
        lote = self._criar_lote(dias_vencido=5)
        lote.delete()  # soft delete
        response = self.client.get(self.url)
        self.assertNotContains(response, lote.nome_lote)

    # --- Cálculo do valor ---

    def test_valor_prejuizo_de_cada_lote_e_quantidade_vezes_custo(self):
        self._criar_lote(dias_vencido=5, custo=4.0, quantidade=20)
        response = self.client.get(self.url)
        self.assertEqual(response.context["lotes"][0].valor_prejuizo, 80.0)

    def test_total_prejuizo_soma_todos_os_lotes_do_periodo(self):
        self._criar_lote(dias_vencido=2, custo=2.0, quantidade=10)  # 20
        self._criar_lote(dias_vencido=4, custo=5.0, quantidade=4)  # 20
        response = self.client.get(self.url)
        self.assertEqual(response.context["total_prejuizo"], 40.0)

    def test_total_prejuizo_e_zero_quando_nao_ha_lotes(self):
        response = self.client.get(self.url)
        self.assertEqual(response.context["total_prejuizo"], 0)

    # --- Período: padrão e limites (off-by-one) ---

    def test_periodo_padrao_e_ultimos_30_dias_ate_hoje(self):
        response = self.client.get(self.url)
        hoje = timezone.now().date()
        self.assertEqual(response.context["data_inicio"], hoje - timedelta(days=30))
        self.assertEqual(response.context["data_fim"], hoje)

    def test_lote_no_limite_exato_do_periodo_padrao_aparece(self):
        lote = self._criar_lote(dias_vencido=30)
        response = self.client.get(self.url)
        self.assertContains(response, lote.nome_lote)

    def test_lote_um_dia_fora_do_periodo_padrao_nao_aparece(self):
        lote = self._criar_lote(dias_vencido=31)
        response = self.client.get(self.url)
        self.assertNotContains(response, lote.nome_lote)

    def test_filtro_de_periodo_customizado(self):
        lote_dentro = self._criar_lote(dias_vencido=10)
        lote_fora = self._criar_lote(dias_vencido=60)
        inicio = (timezone.now() - timedelta(days=15)).date()
        fim = timezone.now().date()

        response = self.client.get(
            self.url, {"data_inicio": inicio.isoformat(), "data_fim": fim.isoformat()}
        )

        self.assertContains(response, lote_dentro.nome_lote)
        self.assertNotContains(response, lote_fora.nome_lote)

    def test_data_inicio_maior_que_data_fim_e_invalido_e_cai_no_padrao(self):
        response = self.client.get(
            self.url, {"data_inicio": "2026-08-01", "data_fim": "2026-07-01"}
        )
        self.assertFalse(response.context["filtro_form"].is_valid())
        hoje = timezone.now().date()
        self.assertEqual(response.context["data_inicio"], hoje - timedelta(days=30))
        self.assertEqual(response.context["data_fim"], hoje)

    # --- Atalhos ---

    def test_atalho_ultimos_30_dias_calcula_datas_corretas(self):
        response = self.client.get(self.url)
        hoje = timezone.now().date()
        self.assertEqual(
            response.context["atalho_30_dias"]["data_inicio"], hoje - timedelta(days=30)
        )
        self.assertEqual(response.context["atalho_30_dias"]["data_fim"], hoje)

    def test_atalho_esta_semana_calcula_segunda_feira_ate_hoje(self):
        response = self.client.get(self.url)
        hoje = timezone.now().date()
        segunda_feira = hoje - timedelta(days=hoje.weekday())
        self.assertEqual(response.context["atalho_semana"]["data_inicio"], segunda_feira)
        self.assertEqual(response.context["atalho_semana"]["data_fim"], hoje)