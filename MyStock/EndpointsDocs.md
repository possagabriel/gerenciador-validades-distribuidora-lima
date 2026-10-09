# Documentação dos Endpoints da API — Distribuidora Lima

## Base URL

```
http://<host>:<port>/api/
```

---

## Autenticação

**Todas as requisições exigem** header `Authorization: Bearer <access_token>`, exceto criar usuário (`POST /api/usuarios/`) e obter/renovar token.

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| `POST` | `/api/token/` | Obter token JWT | pública |
| `POST` | `/api/token/refresh/` | Renovar access token | pública |

**Request — `POST /api/token/`:**
```json
{ "username": "string", "password": "string" }
```

**Response — `POST /api/token/`:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIs...",
  "refresh": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Request — `POST /api/token/refresh/`:**
```json
{ "refresh": "eyJ..." }
```

**Response — `POST /api/token/refresh/`:**
```json
{ "access": "eyJ..." }
```

**Configuração JWT:**
- Access token: 60 minutos
- Refresh token: 7 dias
- Rotação de refresh tokens: habilitada
- Blacklist após rotação: habilitada

---

## Usuários — `/api/usuarios/`

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| `GET` | `/api/usuarios/` | Listar todos | requer token |
| `POST` | `/api/usuarios/` | Criar usuário | **pública** |
| `GET` | `/api/usuarios/{id}/` | Detalhar | requer token |
| `PUT` | `/api/usuarios/{id}/` | Atualizar | requer token |
| `PATCH` | `/api/usuarios/{id}/` | Atualizar parcialmente | requer token |
| `DELETE` | `/api/usuarios/{id}/` | Excluir | requer token |

**Campos:**

| Campo | Tipo | Leitura | Escrita | Observações |
|-------|------|---------|---------|-------------|
| `id` | integer | sim | não | autoincrement |
| `username` | string | sim | sim | único, máx. 150 |
| `first_name` | string | sim | sim | |
| `last_name` | string | sim | sim | |
| `cpf` | string | sim | sim | único, 11 dígitos |
| `tipo_funcionario` | string | sim | sim | enum: `CAIXA`, `GERENTE`, `ESTOQUISTA`, `ADMIN` |
| `is_active` | boolean | sim | não | |
| `password` | string | não | sim | só no registro, mín. 8 chars |

**Nota:** Usuários do tipo `ADMIN` recebem automaticamente `is_staff=true` e `is_superuser=true`.

---

## Categorias — `/api/categorias/`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/categorias/` | Listar todas |
| `POST` | `/api/categorias/` | Criar |
| `GET` | `/api/categorias/{id}/` | Detalhar |
| `PUT` | `/api/categorias/{id}/` | Atualizar |
| `PATCH` | `/api/categorias/{id}/` | Atualizar parcialmente |
| `DELETE` | `/api/categorias/{id}/` | Excluir (soft delete) |

**Campos:**

| Campo | Tipo | Leitura | Escrita | Observações |
|-------|------|---------|---------|-------------|
| `id` | integer | sim | não | autoincrement |
| `nome` | string | sim | sim | único, máx. 100 |
| `dias_atencao` | integer | sim | sim | padrão: 30 |
| `dias_critico` | integer | sim | sim | padrão: 7 |

**Validação:** `dias_critico` deve ser menor que `dias_atencao`.

---

## Produtos — `/api/produtos/`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/produtos/` | Listar todos |
| `POST` | `/api/produtos/` | Criar |
| `GET` | `/api/produtos/{id}/` | Detalhar |
| `PUT` | `/api/produtos/{id}/` | Atualizar |
| `PATCH` | `/api/produtos/{id}/` | Atualizar parcialmente |
| `DELETE` | `/api/produtos/{id}/` | Excluir (soft delete) |

**Campos:**

| Campo | Tipo | Leitura | Escrita | Observações |
|-------|------|---------|---------|-------------|
| `id` | integer | sim | não | autoincrement |
| `nome` | string | sim | sim | máx. 255 |
| `categoria` | integer (FK) | sim | sim | ID da categoria |
| `categoria_nome` | string | sim | não | nome da categoria (read-only) |
| `preco_venda` | float | sim | sim | valor em R$ |
| `skus` | array | sim | não | lista de SKUs (read-only) |
| `lote_inicial` | object | não | sim | opcional; cria o primeiro lote na mesma transação |

O objeto `lote_inicial` aceita `quantidade`, `custo_unitario_compra` e `data_validade`. O nível de vencimento é calculado automaticamente na criação.

**Exemplo de criação com lote inicial:**
```json
{
  "nome": "Presunto Fatiado",
  "categoria": 2,
  "preco_venda": 19.90,
  "lote_inicial": {
    "quantidade": 24,
    "custo_unitario_compra": 13.50,
    "data_validade": "2026-12-20T12:00:00Z"
  }
}
```

**Filtros:**
- `?search=` — busca por nome do produto ou código de barras dos SKUs
- `?ordering=` — ordenar por `nome` ou `preco_venda`

**Exemplo de resposta:**
```json
{
  "id": 5,
  "nome": "Presunto Fatiado",
  "categoria": 2,
  "categoria_nome": "Frios",
  "preco_venda": 19.90,
  "skus": [
    { "id": 11, "produto": 5, "codigo_barras": "7891000500507" },
    { "id": 12, "produto": 5, "codigo_barras": "7891000500514" }
  ]
}
```

---

## SKUs / Códigos de Barras — `/api/produto-skus/`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/produto-skus/` | Listar todos |
| `POST` | `/api/produto-skus/` | Criar |
| `GET` | `/api/produto-skus/{id}/` | Detalhar |
| `PUT` | `/api/produto-skus/{id}/` | Atualizar |
| `PATCH` | `/api/produto-skus/{id}/` | Atualizar parcialmente |
| `DELETE` | `/api/produto-skus/{id}/` | Excluir |

**Campos:**

| Campo | Tipo | Leitura | Escrita | Observações |
|-------|------|---------|---------|-------------|
| `id` | integer | sim | não | autoincrement |
| `produto` | integer (FK) | sim | sim | ID do produto |
| `codigo_barras` | string | sim | sim | único, máx. 50 |

**Filtros:**
- `?search=` — busca por código de barras ou nome do produto

---

## Regras de Desconto — `/api/regras-desconto/`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/regras-desconto/` | Listar todas |
| `POST` | `/api/regras-desconto/` | Criar |
| `GET` | `/api/regras-desconto/{id}/` | Detalhar |
| `PUT` | `/api/regras-desconto/{id}/` | Atualizar |
| `PATCH` | `/api/regras-desconto/{id}/` | Atualizar parcialmente |
| `DELETE` | `/api/regras-desconto/{id}/` | Excluir |

**Campos:**

| Campo | Tipo | Leitura | Escrita | Observações |
|-------|------|---------|---------|-------------|
| `id` | integer | sim | não | autoincrement |
| `categoria` | integer (FK) | sim | sim | ID da categoria |
| `categoria_nome` | string | sim | não | nome da categoria (read-only) |
| `percentual` | float | sim | sim | 0 < percentual <= 100 |
| `dias_para_vencimento` | integer | sim | sim | janela de aplicação |

**Validação:** uniqueness em (`categoria`, `percentual`, `dias_para_vencimento`).

**Filtros:**
- `?ordering=` — ordenar por `categoria`, `percentual` ou `dias_para_vencimento`

---

## Lotes — `/api/lotes/`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/lotes/` | Listar todos |
| `POST` | `/api/lotes/` | Criar |
| `GET` | `/api/lotes/{id}/` | Detalhar |
| `PUT` | `/api/lotes/{id}/` | Atualizar |
| `PATCH` | `/api/lotes/{id}/` | Atualizar parcialmente |
| `DELETE` | `/api/lotes/{id}/` | Excluir (soft delete) |

**Campos:**

| Campo | Tipo | Leitura | Escrita | Observações |
|-------|------|---------|---------|-------------|
| `id` | integer | sim | não | autoincrement |
| `produto` | integer (FK) | sim | sim | ID do produto |
| `produto_nome` | string | sim | não | nome do produto (read-only) |
| `nome_lote` | string | sim | não | formato `AAAAMMDD-P{id}-{seq}` (read-only) |
| `quantidade` | integer | sim | sim | >= 0 |
| `custo_unitario_compra` | float | sim | sim | custo de aquisição |
| `nivel_vencimento` | integer | sim | não | 0=OK, 1=Atenção, 2=Crítico, 3=Vencido (read-only) |
| `esgotado` | boolean | sim | sim | padrão: false |
| `dias_vencido` | integer/null | sim | não | dias desde vencimento (read-only) |
| `data_cadastro` | datetime | sim | não | auto_now_add (read-only) |
| `data_validade` | datetime/null | sim | sim | um dos dois obrigatório |
| `tempo_vencimento` | integer/null | sim | sim | dias até vencimento; se único, `data_validade` é derivada |

**Regra de criação:** Informar `data_validade` OU `tempo_vencimento` (pelo menos um). Se só `tempo_vencimento`, `data_validade` = `data_cadastro` + dias.

**Filtros:**
- `?search=` — busca por nome do lote ou nome do produto
- `?ordering=` — ordenar por `data_validade`, `nivel_vencimento` ou `data_cadastro`
- `?categoria=<id>` — filtrar por categoria do produto
- `?nivel_vencimento=<0|1|2|3>` — filtrar por nível
- `?esgotado=<true|false>` — filtrar por esgotado
- `?ano=<AAAA>` — filtrar por ano de cadastro
- `?mes=<MM>` — filtrar por mês de cadastro (1–12)

**Exemplo de resposta:**
```json
{
  "id": 1,
  "produto": 5,
  "produto_nome": "Presunto Fatiado",
  "nome_lote": "20260730-P5-001",
  "quantidade": 20,
  "custo_unitario_compra": 12.00,
  "nivel_vencimento": 2,
  "esgotado": false,
  "dias_vencido": null,
  "data_cadastro": "2026-07-30T09:00:00Z",
  "data_validade": "2026-08-18T00:00:00Z",
  "tempo_vencimento": null
}
```

---

## Actions Customizadas em Lotes

### `GET /api/lotes/relatorio-prejuizo/`

Relatório de prejuízo de lotes vencidos dentro de um período.

**Parâmetros (query string):**

| Parâmetro | Obrigatório | Formato | Descrição |
|-----------|-------------|---------|-----------|
| `data_inicio` | não | `AAAA-MM-DD` | Início do período |
| `data_fim` | não | `AAAA-MM-DD` | Fim do período |

**Comportamento:**
- Se nenhum período informado: últimos 30 dias
- Valida: `data_inicio` não pode ser maior que `data_fim`
- Erro 400 se data inválida

**Response:**
```json
{
  "periodo": {
    "data_inicio": "2026-07-15",
    "data_fim": "2026-08-14"
  },
  "prejuizo_total": 1500.00,
  "quantidade_lotes_considerados": 5,
  "lotes_considerados": [ /* array de LoteSerializer */ ],
  "quantidade_lotes_sem_custo_cadastrado": 2,
  "lotes_sem_custo_cadastrado": [ /* array de LoteSerializer */ ]
}
```

---

### `GET /api/lotes/sugestoes-desconto/`

Sugestões de desconto aplicáveis a lotes não vencidos e não esgotados, com base nas regras de desconto da categoria.

**Parâmetros (query string):**

| Parâmetro | Obrigatório | Formato | Descrição |
|-----------|-------------|---------|-----------|
| `categoria` | não | integer | Filtrar por ID da categoria |

**Filtros internos:** Apenas lotes não esgotados e com `data_validade >= hoje`.

**Response:**
```json
{
  "quantidade": 3,
  "sugestoes": [
    {
      "lote_id": 1,
      "nome_lote": "20260730-P5-001",
      "quantidade": 20,
      "produto": "Presunto Fatiado",
      "categoria": "Frios",
      "preco_venda": 19.90,
      "custo_unitario_compra": 12.00,
      "percentual_desconto": 25,
      "preco_sugerido": 14.93,
      "abaixo_do_custo": false
    }
  ]
}
```

**Campo `abaixo_do_custo`:** `true` quando o `preco_sugerido` é menor que o `custo_unitario_compra` (alerta de prejuízo na venda).

---

## Soft Delete

Os modelos `Categoria`, `Produto` e `Lote` utilizam **soft delete**. Ao deletar via API (`DELETE`), o registro é marcado com `deletado_em` e deixa de aparecer nas consultas padrão. A exclusão física (`hard_delete`) só é possível pelo Django Admin.

---

## Resumo de Todos os Endpoints

```
# Autenticação
POST   /api/token/                         → obter JWT
POST   /api/token/refresh/                 → renovar JWT

# CRUDs
CRUD   /api/usuarios/                      → gestão de funcionários
CRUD   /api/categorias/                    → categorias de produtos
CRUD   /api/produtos/                      → produtos
CRUD   /api/produto-skus/                  → códigos de barras
CRUD   /api/lotes/                         → lotes de estoque
CRUD   /api/regras-desconto/               → regras de desconto

# Actions customizadas (Lotes)
GET    /api/lotes/relatorio-prejuizo/      → relatório de prejuízo
GET    /api/lotes/sugestoes-desconto/      → sugestões de desconto
```

**Total: 7 endpoints CRUD + 2 actions customizadas + 2 de autenticação = 11 rotas base.**

---

## Casos de Uso para App Mobile (READ)

| Funcionalidade | Endpoint(s) | Parâmetros |
|---|---|---|
| **Login** | `POST /api/token/` | `username`, `password` |
| **Listar produtos** | `GET /api/produtos/` | `?search=`, `?ordering=` |
| **Detalhar produto** | `GET /api/produtos/{id}/` | — |
| **Verificar validade dos lotes** | `GET /api/lotes/` | `?ordering=data_validade`, `?nivel_vencimento=`, `?categoria=` |
| **Consultar prejuízos** | `GET /api/lotes/relatorio-prejuizo/` | `?data_inicio=`, `?data_fim=` |
| **Sugerir descontos** | `GET /api/lotes/sugestoes-desconto/` | `?categoria=` |
| **Ver regras de desconto** | `GET /api/regras-desconto/` | `?ordering=` |
| **Ver categorias** | `GET /api/categorias/` | — |
| **Buscar produto por código de barras** | `GET /api/produtos/?search={codigo}` | código de barras |
| **Lotes por período de cadastro** | `GET /api/lotes/` | `?ano=2026&mes=7` |
| **Lotes esgotados** | `GET /api/lotes/` | `?esgotado=true` |
