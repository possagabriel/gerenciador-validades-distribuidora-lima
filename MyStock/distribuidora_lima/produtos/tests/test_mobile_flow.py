from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from produtos.models import Categoria, Lote, Produto, ProdutoSKU
from usuarios.models import Usuario


class MobileCadastroFlowTests(APITestCase):
    def setUp(self):
        usuario = Usuario.objects.create_user(
            username="mobile-teste",
            password="senha-teste-123",
            cpf="33333333333",
            tipo_funcionario=Usuario.TipoFuncionario.GERENTE,
        )
        self.client.force_authenticate(user=usuario)

    def test_categoria_produto_lote_e_codigo_ficam_disponiveis_nas_listas(self):
        categoria_response = self.client.post(
            "/api/categorias/", {"nome": "Bebidas"}, format="json"
        )
        self.assertEqual(categoria_response.status_code, 201)
        categoria_id = categoria_response.data["id"]

        produto_response = self.client.post(
            "/api/produtos/",
            {
                "nome": "Suco",
                "categoria": categoria_id,
                "preco_venda": 12.5,
                "lote_inicial": {
                    "quantidade": 20,
                    "custo_unitario_compra": 8.75,
                    "data_validade": (timezone.now() + timedelta(days=3)).isoformat(),
                },
            },
            format="json",
        )
        self.assertEqual(produto_response.status_code, 201)
        produto_id = produto_response.data["id"]

        codigo_response = self.client.post(
            "/api/produto-skus/",
            {"produto": produto_id, "codigo_barras": "7891234567890"},
            format="json",
        )
        self.assertEqual(codigo_response.status_code, 201)

        self.assertTrue(Categoria.objects.filter(pk=categoria_id).exists())
        self.assertTrue(Produto.objects.filter(pk=produto_id).exists())
        self.assertTrue(ProdutoSKU.objects.filter(produto_id=produto_id).exists())
        self.assertTrue(Lote.objects.filter(produto_id=produto_id, nivel_vencimento=2).exists())

        for path in ("/api/categorias/", "/api/produtos/", "/api/lotes/?nivel_vencimento=2"):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.data)

    def test_editar_e_excluir_produto_esconde_seus_lotes_sem_apagar_dados(self):
        categoria = Categoria.objects.create(nome="Bebidas")
        outra_categoria = Categoria.objects.create(nome="Mercearia")
        produto = Produto.objects.create(nome="Suco", categoria=categoria, preco_venda=12.5)
        lote = Lote.objects.create(
            produto=produto,
            quantidade=3,
            custo_unitario_compra=8,
            data_validade=timezone.now() - timedelta(days=1),
            nivel_vencimento=Lote.NivelVencimento.VENCIDO,
        )
        sku = ProdutoSKU.objects.create(produto=produto, codigo_barras="7891234567890")

        resposta = self.client.patch(
            f"/api/produtos/{produto.pk}/",
            {"nome": "Suco integral", "categoria": outra_categoria.pk, "preco_venda": 15.9},
            format="json",
        )
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data["nome"], "Suco integral")
        self.assertEqual(resposta.data["categoria_nome"], "Mercearia")
        self.assertEqual(resposta.data["preco_venda"], 15.9)

        resposta = self.client.delete(f"/api/produtos/{produto.pk}/")
        self.assertEqual(resposta.status_code, 204)
        self.assertFalse(Produto.objects.filter(pk=produto.pk).exists())
        self.assertTrue(Produto.all_objects.filter(pk=produto.pk).exists())
        self.assertTrue(Lote.all_objects.filter(pk=lote.pk).exists())
        self.assertTrue(ProdutoSKU.objects.filter(pk=sku.pk).exists())
        self.assertEqual(self.client.get(f"/api/produtos/{produto.pk}/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/lotes/{lote.pk}/").status_code, 404)

        for path in ("/api/produtos/", "/api/lotes/", "/api/produto-skus/"):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200)
            items = response.data["results"] if "results" in response.data else response.data
            self.assertEqual(len(items), 0)
        self.assertEqual(self.client.get("/api/lotes/relatorio-prejuizo/").data["prejuizo_total"], 0)

    def test_cadastro_rejeita_validade_passada_e_numeros_invalidos(self):
        categoria = Categoria.objects.create(nome="Bebidas")
        valido = {
            "nome": "Suco",
            "categoria": categoria.pk,
            "preco_venda": 12.5,
            "lote_inicial": {
                "quantidade": 10,
                "custo_unitario_compra": 8.75,
                "data_validade": (timezone.now() + timedelta(days=3)).isoformat(),
            },
        }
        casos = [
            {"preco_venda": -1},
            {"preco_venda": "NaN"},
            {"preco_venda": 1.234},
            {"preco_venda": 1000000000},
            {"lote_inicial": {**valido["lote_inicial"], "quantidade": 0}},
            {"lote_inicial": {**valido["lote_inicial"], "quantidade": 1000000000}},
            {"lote_inicial": {**valido["lote_inicial"], "custo_unitario_compra": -2}},
            {"lote_inicial": {**valido["lote_inicial"], "custo_unitario_compra": 8.123}},
            {"lote_inicial": {**valido["lote_inicial"], "data_validade": (timezone.now() - timedelta(days=365)).isoformat()}},
            {"lote_inicial": {**valido["lote_inicial"], "data_validade": "2027-13-01T12:00:00Z"}},
        ]
        for alteracao in casos:
            with self.subTest(alteracao=alteracao):
                resposta = self.client.post("/api/produtos/", {**valido, **alteracao}, format="json")
                self.assertEqual(resposta.status_code, 400, resposta.data)
                self.assertFalse(Produto.objects.filter(nome="Suco").exists())

        produto = Produto.objects.create(nome="Suco", categoria=categoria, preco_venda=12.5)
        resposta = self.client.patch(f"/api/produtos/{produto.pk}/", {"preco_venda": -5}, format="json")
        self.assertEqual(resposta.status_code, 400)
        produto.refresh_from_db()
        self.assertEqual(produto.preco_venda, 12.5)

        resposta = self.client.post("/api/lotes/", {
            "produto": produto.pk,
            "quantidade": 1,
            "custo_unitario_compra": 2,
            "data_validade": (timezone.now() - timedelta(days=2)).isoformat(),
        }, format="json")
        self.assertEqual(resposta.status_code, 400)
        self.assertFalse(Lote.objects.filter(produto=produto).exists())

    def test_categoria_nao_duplica_nome_com_maiusculas_diferentes(self):
        Categoria.objects.create(nome="Bebidas")
        resposta = self.client.post("/api/categorias/", {"nome": "bebidas"}, format="json")
        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(Categoria.objects.filter(nome__iexact="bebidas").count(), 1)
