# Distribuidora Lima — Gerenciador de Validades

Sistema de gestão de estoque e controle de validade para distribuidoras. Django 6.0.7 + Django REST Framework + PostgreSQL.

---

## Pré-requisitos (Fedora)

```bash
sudo dnf install python3 python3-pip python3-virtualenv postgresql postgresql-server
```

---

## Instalação

### 1. Descompactar e entrar no diretório

```bash
tar -xzf MyStock.tar.gz
cd MyStock/distribuidora_lima
```

### 2. Criar e ativar ambiente virtual

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Instalar dependências

```bash
pip install -r requirements.txt
```

### 4. Configurar SECRET_KEY

A `SECRET_KEY` é lida via variável de ambiente (`os.environ.get`). Para gerar uma chave segura:

```python
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Atribua o valor no arquivo `.env` (linha `SECRET_KEY=...`).

### 5. Configurar variáveis de ambiente

Crie o arquivo `.env` na raiz do projeto (`distribuidora_lima/`):

```
SECRET_KEY=sua_chave_aqui
DB_NAME=gerenciador_validades
DB_USER=cliente_py
DB_PASSWORD=sua_senha_aqui
DB_HOST=localhost
DB_PORT=5432
```

> **Nota:** O `.env` não é lido automaticamente pelo Django. As configurações de banco estão em `mysite/settings.py` usando `os.environ.get()`. Caso queira que o `.env` seja carregado, instale `python-dotenv` e adicione `load_dotenv()` no topo de `settings.py` (já disponível no projeto).

### 6. Configurar PostgreSQL

```bash
# Inicializar o banco (primeira vez)
sudo postgresql-setup --initdb

# Iniciar o serviço
sudo systemctl start postgresql

# Criar usuário e banco
sudo -u postgres psql
```

```sql
-- Dentro do psql:
CREATE USER cliente_py WITH PASSWORD 'sua_senha_aqui' CREATEDB;
CREATE DATABASE gerenciador_validades OWNER cliente_py;
\q
```

### 7. Configurar autenticação do PostgreSQL

Edite `/var/lib/pgsql/data/pg_hba.conf` para permitir login com senha via TCP:

```
# Trocar "ident" por "md5" na linha do localhost:
host    all    all    127.0.0.1/32    md5
```

Reinicie o serviço:

```bash
sudo systemctl restart postgresql
```

### 8. Rodar migrações

```bash
python3 manage.py migrate
```

### 9. Criar superusuário (opcional)

```bash
python3 manage.py createsuperuser
```

### 10. Rodar o servidor de desenvolvimento

```bash
python3 manage.py runserver
```

O projeto estará disponível em `http://127.0.0.1:8000/`.

---


## Banco de Dados

- **Engine:** PostgreSQL
- **Nome padrão:** `gerenciador_validades`
- **7 tabelas de domínio:** `usuarios`, `categorias`, `regras_desconto`, `produtos`, `produto_skus`, `contadores_lote`, `lotes`

---

## Testes

```bash
# Rodar todos os testes (62 testes)
python3 manage.py test produtos gerente

# Rodar com cobertura
pip install coverage
coverage run --source='.' manage.py test produtos gerente
coverage report
```

---

## API REST

A API está exposta em `/api/` e usa autenticação JWT.

- Documentação completa dos endpoints: [EndpointsDocs.md](EndpointsDocs.md)
- Token JWT: `POST /api/token/` com `{"username": "...", "password": "..."}`
- Usar header `Authorization: Bearer <token>` em todas as requisições autenticadas
