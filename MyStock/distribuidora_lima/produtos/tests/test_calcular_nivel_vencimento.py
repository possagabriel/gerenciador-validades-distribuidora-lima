from datetime import timedelta
from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from produtos.models import Categoria, Lote, Produto


class CalcularNivelVencimentoCommandTests(TestCase):
    """
    Categoria de referência usada na maioria dos testes:
        dias_atencao = 15
        dias_critico = 5

    Regra implementada no command:
        dias_restantes < 0                -> VENCIDO
        dias_restantes <= dias_critico    -> CRITICO
        dias_restantes <= dias_atencao    -> ATENCAO
        caso contrário                    -> OK
    """

    def setUp(self):
        self.categoria = Categoria.objects.create(
            nome="Frios", dias_atencao=15, dias_critico=5
        )
        self.produto = Produto.objects.create(
            nome="Iogurte", categoria=self.categoria, preco_venda=5.99
        )

    def _criar_lote(self, dias_restantes, produto=None):
        validade = timezone.now() + timedelta(days=dias_restantes)
        return Lote.objects.create(
            produto=produto or self.produto,
            quantidade=10,
            custo_unitario_compra=3.5,
            data_validade=validade,
        )

    def _rodar_comando(self):
        saida = StringIO()
        call_command("calcular_nivel_vencimento", stdout=saida)
        return saida.getvalue()

    # --- Casos centrais de cada nível ---

    def test_lote_muito_longe_do_vencimento_fica_ok(self):
        lote = self._criar_lote(dias_restantes=20)
        self._rodar_comando()
        lote.refresh_from_db()
        self.assertEqual(lote.nivel_vencimento, Lote.NivelVencimento.OK)

    def test_lote_vencido_fica_vencido(self):
        lote = self._criar_lote(dias_restantes=-3)
        self._rodar_comando()
        lote.refresh_from_db()
        self.assertEqual(lote.nivel_vencimento, Lote.NivelVencimento.VENCIDO)

    # --- Casos de borda (off-by-one) ---

    def test_lote_no_limite_exato_de_atencao_fica_atencao(self):
        lote = self._criar_lote(dias_restantes=15)
        self._rodar_comando()
        lote.refresh_from_db()
        self.assertEqual(lote.nivel_vencimento, Lote.NivelVencimento.ATENCAO)

    def test_lote_um_dia_antes_do_limite_de_atencao_fica_ok(self):
        lote = self._criar_lote(dias_restantes=16)
        self._rodar_comando()
        lote.refresh_from_db()
        self.assertEqual(lote.nivel_vencimento, Lote.NivelVencimento.OK)

    def test_lote_no_limite_exato_de_critico_fica_critico(self):
        lote = self._criar_lote(dias_restantes=5)
        self._rodar_comando()
        lote.refresh_from_db()
        self.assertEqual(lote.nivel_vencimento, Lote.NivelVencimento.CRITICO)

    def test_lote_logo_acima_do_limite_de_critico_fica_atencao(self):
        lote = self._criar_lote(dias_restantes=6)
        self._rodar_comando()
        lote.refresh_from_db()
        self.assertEqual(lote.nivel_vencimento, Lote.NivelVencimento.ATENCAO)

    def test_lote_que_vence_hoje_fica_critico(self):
        lote = self._criar_lote(dias_restantes=0)
        self._rodar_comando()
        lote.refresh_from_db()
        self.assertEqual(lote.nivel_vencimento, Lote.NivelVencimento.CRITICO)

    # --- Thresholds por categoria (via produto) ---

    def test_mesma_quantidade_de_dias_classifica_diferente_por_categoria(self):
        categoria_limpeza = Categoria.objects.create(
            nome="Limpeza", dias_atencao=60, dias_critico=20
        )
        produto_limpeza = Produto.objects.create(
            nome="Detergente", categoria=categoria_limpeza, preco_venda=3.5
        )
        lote_frios = self._criar_lote(dias_restantes=10)
        lote_limpeza = self._criar_lote(dias_restantes=10, produto=produto_limpeza)

        self._rodar_comando()

        lote_frios.refresh_from_db()
        lote_limpeza.refresh_from_db()
        # Frios (dias_critico=5, dias_atencao=15): 10 dias -> Atenção
        self.assertEqual(lote_frios.nivel_vencimento, Lote.NivelVencimento.ATENCAO)
        # Limpeza (dias_critico=20, dias_atencao=60): 10 dias -> Crítico
        self.assertEqual(lote_limpeza.nivel_vencimento, Lote.NivelVencimento.CRITICO)

    # --- Robustez do command ---

    def test_lote_esgotado_nao_e_recalculado(self):
        lote = self._criar_lote(dias_restantes=3)  # cairia em Crítico
        Lote.objects.filter(pk=lote.pk).update(esgotado=True)

        self._rodar_comando()

        lote.refresh_from_db()
        self.assertIsNone(lote.nivel_vencimento)  # nunca chegou a ser calculado

    def test_lote_esgotado_mantem_nivel_vencimento_anterior_congelado(self):
        lote = self._criar_lote(dias_restantes=20)  # OK
        self._rodar_comando()
        lote.refresh_from_db()
        self.assertEqual(lote.nivel_vencimento, Lote.NivelVencimento.OK)

        # Marca como esgotado e "avança" a validade pra Vencido manualmente,
        # simulando o tempo passando sem o command ter rodado de novo.
        Lote.objects.filter(pk=lote.pk).update(
            esgotado=True, data_validade=timezone.now() - timedelta(days=5)
        )

        self._rodar_comando()

        lote.refresh_from_db()
        # Continua OK (valor antigo), não vira Vencido, porque foi pulado.
        self.assertEqual(lote.nivel_vencimento, Lote.NivelVencimento.OK)

    def test_ignora_lote_sem_data_validade_sem_quebrar(self):
        lote = self._criar_lote(dias_restantes=20)
        # Força data_validade nula direto no banco (bypassa a validação do
        # model), simulando um dado legado/inconsistente.
        Lote.objects.filter(pk=lote.pk).update(data_validade=None)

        self._rodar_comando()  # não deve levantar exceção

        lote.refresh_from_db()
        self.assertIsNone(lote.nivel_vencimento)

    def test_segunda_execucao_nao_reprocessa_lotes_ja_corretos(self):
        self._criar_lote(dias_restantes=20)

        primeira_saida = self._rodar_comando()
        segunda_saida = self._rodar_comando()

        self.assertIn("1 atualizados", primeira_saida)
        self.assertIn("0 atualizados", segunda_saida)