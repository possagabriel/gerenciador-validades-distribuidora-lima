from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from produtos.models import Categoria, Lote, MovimentoEstoque, Produto, ProdutoSKU
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

    def test_edicao_nao_aceita_lote_aninhado_nem_esgotamento_direto(self):
        categoria = Categoria.objects.create(nome="Bebidas")
        produto = Produto.objects.create(nome="Suco", categoria=categoria, preco_venda=12.5)
        lote = Lote.objects.create(
            produto=produto, quantidade=3, custo_unitario_compra=8,
            data_validade=timezone.now() + timedelta(days=30),
        )
        resposta = self.client.patch(
            f"/api/produtos/{produto.pk}/", {"codigo_barras": "7891234567890"}, format="json"
        )
        self.assertEqual(resposta.status_code, 400)
        self.assertFalse(ProdutoSKU.objects.filter(codigo_barras="7891234567890").exists())
        resposta = self.client.patch(f"/api/lotes/{lote.pk}/", {"esgotado": True}, format="json")
        self.assertEqual(resposta.status_code, 400)
        lote.refresh_from_db()
        self.assertFalse(lote.esgotado)

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

    def test_produto_lote_e_codigo_sao_gravados_juntos(self):
        categoria = Categoria.objects.create(nome="Bebidas")
        dados = {
            "nome": "Suco", "categoria": categoria.pk, "preco_venda": 12.5,
            "codigo_barras": "7891234567890",
            "lote_inicial": {
                "quantidade": 20, "custo_unitario_compra": 8.75,
                "data_validade": (timezone.now() + timedelta(days=3)).isoformat(),
            },
        }
        resposta = self.client.post("/api/produtos/", dados, format="json")
        self.assertEqual(resposta.status_code, 201, resposta.data)
        self.assertEqual(resposta.data["estoque_total"], 20)
        self.assertEqual(resposta.data["skus"][0]["codigo_barras"], dados["codigo_barras"])
        self.assertTrue(resposta.data["proxima_validade"])
        self.assertEqual(ProdutoSKU.objects.filter(produto_id=resposta.data["id"]).count(), 1)

        resposta = self.client.post("/api/produtos/", {**dados, "nome": "Outro suco"}, format="json")
        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(Produto.objects.filter(nome="Outro suco").count(), 0)

        busca = self.client.get("/api/produto-skus/", {"codigo_barras": dados["codigo_barras"]})
        self.assertEqual(busca.status_code, 200)
        self.assertEqual(len(busca.data), 1)
        self.assertEqual(busca.data[0]["produto"], Produto.objects.get(nome="Suco").pk)

    def test_movimentacao_registra_autor_motivo_e_saldo(self):
        categoria = Categoria.objects.create(nome="Bebidas")
        produto = Produto.objects.create(nome="Suco", categoria=categoria, preco_venda=12)
        lote = Lote.objects.create(produto=produto, quantidade=10, custo_unitario_compra=5,
                                   data_validade=timezone.now() + timedelta(days=10))
        caminho = f"/api/lotes/{lote.pk}/movimentos/"
        for tipo, quantidade, saldo in (("ENTRADA", 4, 14), ("SAIDA", 3, 11), ("AJUSTE", 0, 0)):
            resposta = self.client.post(caminho, {"tipo": tipo, "quantidade": quantidade, "motivo": "Conferência do estoque"}, format="json")
            self.assertEqual(resposta.status_code, 201, resposta.data)
            self.assertEqual(resposta.data["movimento"]["quantidade_depois"], saldo)
        lote.refresh_from_db()
        self.assertEqual(lote.quantidade, 0)
        self.assertTrue(lote.esgotado)
        self.assertEqual(MovimentoEstoque.objects.filter(lote=lote).count(), 3)
        self.assertEqual(self.client.patch(f"/api/lotes/{lote.pk}/", {"quantidade": 500}).status_code, 400)
        self.assertEqual(self.client.post(caminho, {"tipo": "SAIDA", "quantidade": 1, "motivo": "Venda"}).status_code, 400)

    def test_lixeira_restaura_produto_e_lote(self):
        categoria = Categoria.objects.create(nome="Bebidas")
        produto = Produto.objects.create(nome="Suco", categoria=categoria, preco_venda=12)
        lote = Lote.objects.create(produto=produto, quantidade=10, custo_unitario_compra=5,
                                   data_validade=timezone.now() + timedelta(days=10))
        self.assertEqual(self.client.delete(f"/api/lotes/{lote.pk}/").status_code, 204)
        self.assertEqual(self.client.delete(f"/api/produtos/{produto.pk}/").status_code, 204)
        self.assertEqual(len(self.client.get("/api/lotes/lixeira/").data), 1)
        self.assertEqual(len(self.client.get("/api/produtos/lixeira/").data), 1)
        self.assertEqual(self.client.post(f"/api/lotes/{lote.pk}/restaurar/").status_code, 400)
        self.assertEqual(self.client.post(f"/api/produtos/{produto.pk}/restaurar/").status_code, 200)
        self.assertEqual(self.client.post(f"/api/lotes/{lote.pk}/restaurar/").status_code, 200)
        self.assertTrue(Produto.objects.filter(pk=produto.pk).exists())
        self.assertTrue(Lote.objects.filter(pk=lote.pk).exists())

    def test_catalogo_paginar_no_servidor_e_prioridade_resumida(self):
        categoria = Categoria.objects.create(nome="Bebidas")
        for indice in range(25):
            produto = Produto.objects.create(nome=f"Produto {indice:02d}", categoria=categoria, preco_venda=5)
            Lote.objects.create(produto=produto, quantidade=1, custo_unitario_compra=1,
                                data_validade=timezone.now() + timedelta(days=2), nivel_vencimento=2)
        produtos = self.client.get("/api/produtos/")
        self.assertEqual(produtos.data["count"], 25)
        self.assertEqual(len(produtos.data["results"]), 20)
        self.assertEqual(len(self.client.get("/api/produtos/", {"page": 2}).data["results"]), 5)
        lotes = self.client.get("/api/lotes/")
        self.assertEqual(lotes.data["count"], 25)
        self.assertEqual(len(lotes.data["results"]), 20)
        prioridade = self.client.get("/api/lotes/prioridade/")
        self.assertEqual(prioridade.data["count"], 25)
        self.assertEqual(len(prioridade.data["results"]), 3)

    def test_filtros_e_exportacao_csv_escapam_formulas(self):
        categoria = Categoria.objects.create(nome="Bebidas")
        produto = Produto.objects.create(nome="=SUM(1+1)", categoria=categoria, preco_venda=5)
        Lote.objects.create(produto=produto, quantidade=3, custo_unitario_compra=2,
                            data_validade=timezone.now() + timedelta(days=2))
        lista = self.client.get("/api/lotes/", {"produto": produto.pk, "esgotado": "false"})
        self.assertEqual(lista.data["count"], 1)
        self.assertEqual(self.client.get("/api/lotes/", {"data_inicio": "2026-13-01"}).status_code, 400)
        resposta = self.client.get("/api/lotes/exportar-csv/", {"produto": produto.pk})
        self.assertEqual(resposta.status_code, 200)
        texto = b"".join(resposta.streaming_content).decode("utf-8-sig")
        self.assertIn("'=SUM(1+1)", texto)
