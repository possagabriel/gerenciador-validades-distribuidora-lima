# Gerenciador de Validades — Distribuidora Lima (mobile)

App de consulta em React Native, Expo SDK 57 e TypeScript. Consome a API Django do arquivo `../MyStock.tar.gz`; não altera o backend.

## Pré-requisitos

- Node.js 22.13 ou superior e npm.
- Um Android/iPhone com Expo Go ou um emulador. Câmera requer dispositivo físico.
- API Django iniciada e acessível pelo dispositivo na mesma rede. O projeto Django precisa aceitar o IP da máquina em `ALLOWED_HOSTS`; em Android, tráfego HTTP local pode exigir um build de desenvolvimento ou HTTPS, conforme a plataforma.

## Configurar a API

```bash
cd mobile
cp .env.example .env
```

Edite `API_BASE_URL` com a origem da API, **sem** `/api` no fim. Exemplo: `API_BASE_URL=http://192.168.1.10:8000`. Em emulador Android, o host da máquina costuma ser `http://10.0.2.2:8000`; em simulador iOS, `http://localhost:8000`. `127.0.0.1` no celular aponta para o próprio celular. O Expo injeta a variável em `app.config.ts` via `expo-constants`; mudanças no `.env` exigem reiniciar o Metro ou gerar novo build. Um build com URL HTTP habilita tráfego sem TLS para a demonstração local. Para demonstração fora da rede local, use uma origem HTTPS acessível ao aparelho.

## Executar

```bash
npm install
npx expo start
```

Abra o QR code no Expo Go. O login usa as credenciais existentes do Django. Os JWTs ficam apenas no SecureStore; o app renova o access token e respeita o `exp` do refresh de sete dias.

## Verificação

```bash
npm run typecheck
npm test
npx expo install --check
```

## Build de demonstração

```bash
npm install --global eas-cli
eas login
eas build:configure
eas build --platform android --profile demo
eas build --platform ios --profile demo
```

O perfil `demo` gera APK para Android. O build iOS exige conta Apple e provisionamento para distribuição interna. Configure `API_BASE_URL` no ambiente do EAS Build (por exemplo, variável de ambiente do projeto EAS) antes de gerar o binário. Após mudar permissões nativas, gere um novo build.

## Contrato da API e limites

O arquivo `MyStock/EndpointsDocs.md` dentro do arquivo compactado define as rotas usadas aqui: `/api/lotes/relatorio-prejuizo/` e `/api/lotes/sugestoes-desconto/`. A API não expõe `/api/relatorios/` nem `/api/descontos/`. Lotes referenciam `produto`, não SKU, e o campo real é `data_validade`. Por isso a tela de um SKU mostra os lotes do produto correspondente.

O DRF atual retorna arrays sem paginação. A interface mostra 20 itens por página após buscar a lista. Se a API passar a paginar no servidor, será preciso trocar essa estratégia de consulta. Alertas locais são agendados para até 50 lotes críticos não esgotados quando o app abre e quando volta ao primeiro plano; não há push nem execução periódica em segundo plano. Para que o nível crítico esteja atualizado, execute a rotina de cálculo já existente no backend. O app só realiza GETs e os dois POSTs necessários ao JWT.
