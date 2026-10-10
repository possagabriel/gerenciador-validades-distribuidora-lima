from django.utils import timezone
from rest_framework.test import APITestCase

from produtos.models import Categoria, Lote, Produto
from usuarios.models import Usuario


class PermissoesApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.usuarios = {}
        for index, papel in enumerate(Usuario.TipoFuncionario.values, start=1):
            cls.usuarios[papel] = Usuario.objects.create_user(
                username=f"funcionario-{index}",
                password="SenhaSeguraTeste#2026",
                cpf=f"{index:011d}",
                tipo_funcionario=papel,
            )
        cls.categoria = Categoria.objects.create(nome="Bebidas")
        cls.produto = Produto.objects.create(nome="Suco", categoria=cls.categoria, preco_venda=12)
        cls.lote = Lote.objects.create(
            produto=cls.produto, quantidade=10, custo_unitario_compra=5,
            data_validade=timezone.now() + timezone.timedelta(days=10),
        )

    def autenticar(self, papel):
        self.client.force_authenticate(user=self.usuarios[papel])

    def test_cadastro_publico_de_admin_esta_fechado(self):
        self.client.force_authenticate(user=None)
        resposta = self.client.post("/api/usuarios/", {
            "username": "intruso", "cpf": "12345678901",
            "tipo_funcionario": "ADMIN", "password": "SenhaSeguraTeste#2026",
        })
        self.assertIn(resposta.status_code, (401, 403))
        self.assertFalse(Usuario.objects.filter(username="intruso").exists())

    def test_somente_admin_gerencia_usuarios(self):
        for papel in ("CAIXA", "ESTOQUISTA", "GERENTE"):
            with self.subTest(papel=papel):
                self.autenticar(papel)
                self.assertEqual(self.client.get("/api/usuarios/").status_code, 403)
                self.assertEqual(self.client.get(f"/api/usuarios/{self.usuarios['ADMIN'].pk}/").status_code, 403)
                self.assertEqual(self.client.patch(f"/api/usuarios/{self.usuarios['ADMIN'].pk}/", {"tipo_funcionario": "CAIXA"}).status_code, 403)
                self.assertEqual(self.client.delete(f"/api/usuarios/{self.usuarios['ADMIN'].pk}/").status_code, 403)
                self.assertEqual(self.client.post("/api/usuarios/", {"username": "novo"}).status_code, 403)
        self.autenticar("ADMIN")
        self.assertEqual(self.client.get("/api/usuarios/").status_code, 200)

    def test_perfil_proprio_nao_permite_mudar_cargo_ou_cpf(self):
        self.autenticar("CAIXA")
        caminho = "/api/usuarios/me/"
        self.assertEqual(self.client.get(caminho).data["tipo_funcionario"], "CAIXA")
        resposta = self.client.patch(caminho, {
            "first_name": "Novo", "tipo_funcionario": "ADMIN", "cpf": "99999999999",
            "is_active": False, "is_superuser": True,
        })
        self.assertEqual(resposta.status_code, 200)
        usuario = self.usuarios["CAIXA"]
        usuario.refresh_from_db()
        self.assertEqual(usuario.first_name, "Novo")
        self.assertEqual(usuario.tipo_funcionario, "CAIXA")
        self.assertEqual(usuario.cpf, "00000000001")
        self.assertTrue(usuario.is_active)
        self.assertFalse(usuario.is_superuser)

    def test_admin_pode_criar_e_rebaixar_admin(self):
        self.autenticar("ADMIN")
        resposta = self.client.post("/api/usuarios/", {
            "username": "nova-admin", "cpf": "98765432101",
            "tipo_funcionario": "ADMIN", "password": "SenhaSeguraTeste#2026",
        })
        self.assertEqual(resposta.status_code, 201, resposta.data)
        usuario = Usuario.objects.get(username="nova-admin")
        self.assertTrue(usuario.is_superuser)
        resposta = self.client.patch(f"/api/usuarios/{usuario.pk}/", {"tipo_funcionario": "ESTOQUISTA"})
        self.assertEqual(resposta.status_code, 200)
        usuario.refresh_from_db()
        self.assertFalse(usuario.is_superuser)
        self.assertFalse(usuario.is_staff)

    def test_cargos_nos_cadastros(self):
        casos = [
            ("/api/categorias/", {"nome": "Higiene"}, {"nome": "Novo nome"}, self.categoria.pk,
             {"ADMIN", "GERENTE"}, {"ADMIN", "GERENTE"}),
            ("/api/produtos/", {"nome": "Água", "categoria": self.categoria.pk, "preco_venda": 2},
             {"nome": "Suco novo"}, self.produto.pk, {"ADMIN", "GERENTE", "ESTOQUISTA"}, {"ADMIN", "GERENTE"}),
            ("/api/lotes/", {"produto": self.produto.pk, "quantidade": 2, "custo_unitario_compra": 1,
                              "data_validade": (timezone.now() + timezone.timedelta(days=20)).isoformat()},
             {"custo_unitario_compra": 3}, self.lote.pk, {"ADMIN", "GERENTE", "ESTOQUISTA"}, {"ADMIN", "GERENTE"}),
        ]
        for caminho, dados_criacao, dados_edicao, pk, escritores, excluidores in casos:
            for papel in Usuario.TipoFuncionario.values:
                with self.subTest(caminho=caminho, papel=papel):
                    self.autenticar(papel)
                    self.assertEqual(self.client.get(caminho).status_code, 200)
                    dados = dict(dados_criacao)
                    if caminho == "/api/categorias/":
                        dados["nome"] = f"Higiene {papel}"
                    self.assertEqual(self.client.post(caminho, dados).status_code in (200, 201), papel in escritores)
                    self.assertEqual(self.client.patch(f"{caminho}{pk}/", dados_edicao).status_code == 200, papel in escritores)
                    # A exclusão é testada em um registro separado para não alterar os demais casos.
                    if papel not in excluidores:
                        self.assertEqual(self.client.delete(f"{caminho}{pk}/").status_code, 403)

    def test_relatorios_financeiros_restritos_a_gerencia(self):
        for papel in ("CAIXA", "ESTOQUISTA"):
            self.autenticar(papel)
            self.assertEqual(self.client.get("/api/lotes/relatorio-prejuizo/").status_code, 403)
            self.assertEqual(self.client.get("/api/lotes/sugestoes-desconto/").status_code, 403)
            self.assertEqual(self.client.get("/api/regras-desconto/").status_code, 403)
        self.autenticar("GERENTE")
        self.assertEqual(self.client.get("/api/lotes/relatorio-prejuizo/").status_code, 200)

    def test_caixa_so_registra_saida_e_nao_acessa_lixeira(self):
        self.autenticar("CAIXA")
        caminho = f"/api/lotes/{self.lote.pk}/movimentos/"
        self.assertEqual(self.client.post(caminho, {"tipo": "ENTRADA", "quantidade": 1, "motivo": "Compra"}).status_code, 403)
        resposta = self.client.post(caminho, {"tipo": "SAIDA", "quantidade": 2, "motivo": "Venda no caixa"})
        self.assertEqual(resposta.status_code, 201, resposta.data)
        self.assertEqual(resposta.data["lote"]["quantidade"], 8)
        self.assertEqual(self.client.get("/api/produtos/lixeira/").status_code, 403)
        self.assertEqual(self.client.get("/api/lotes/lixeira/").status_code, 403)
