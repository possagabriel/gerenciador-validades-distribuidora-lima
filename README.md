# Gerenciador de Validades — Distribuidora Lima (mobile)

App de gestão em React Native, Expo SDK 57 e TypeScript. Consome a API Django em `MyStock/distribuidora_lima`.

## Pré-requisitos

- Node.js 22.13 ou superior e npm.
- Um Android/iPhone com Expo Go ou um emulador. Câmera requer dispositivo físico.
- API Django iniciada e acessível pelo dispositivo na mesma rede. O projeto Django precisa aceitar o IP da máquina em `ALLOWED_HOSTS`; em Android, tráfego HTTP local pode exigir um build de desenvolvimento ou HTTPS, conforme a plataforma.

## Configurar a API

```bash
cp .env.example .env
```

Edite `API_BASE_URL` com a origem da API, **sem** `/api` no fim. Exemplo: `API_BASE_URL=http://192.168.1.10:8000`. Em emulador Android, o host da máquina costuma ser `http://10.0.2.2:8000`; em simulador iOS, `http://localhost:8000`. `127.0.0.1` no celular aponta para o próprio celular. O Expo injeta a variável em `app.config.ts` via `expo-constants`; mudanças no `.env` exigem reiniciar o Metro ou gerar novo build. Um build com URL HTTP habilita tráfego sem TLS para a demonstração local. Para demonstração fora da rede local, use uma origem HTTPS acessível ao aparelho.

## Executar

Entre na pasta deste projeto, a que contém `package.json` e `src/`:

```bash
npm install
npx expo start
```

Abra o QR code no Expo Go. Se o aparelho mostrar uma versão antiga, encerre o Expo com `Ctrl+C`, rode `npx expo start --clear --lan` nesta pasta e leia o QR novo. O APK antigo não recebe mudanças do código automaticamente.

O login usa as credenciais existentes do Django. Os JWTs são persistidos no SecureStore e reutilizados em memória durante a sessão. Uma falha temporária da rede na renovação não apaga a conta; um refresh expirado ou recusado pela API encerra a sessão.

O app usa quatro abas: **Início**, **Produtos**, **Lotes** e **Mais**. Na tela **Produtos**, toque em **Adicionar produto** para cadastrar nome, categoria e preço. É possível criar uma categoria no próprio formulário e adicionar um código de barras opcional. O detalhe do produto também permite adicionar códigos depois. **Relatórios** e **Descontos** ficam em **Mais**. O mapa e os tokens visuais estão em [DESIGN.md](DESIGN.md).

A busca aguarda 300 ms após a digitação antes de consultar a API. Ao voltar a uma lista ou análise, dados recentes são reutilizados; depois de 90 segundos, a tela atualiza. Puxe para atualizar a qualquer momento. Se a atualização falhar, os últimos dados disponíveis continuam visíveis com uma opção de tentar novamente.

No Expo Go, os alertas locais ficam desativados porque o módulo de notificações pode impedir a abertura do app no Android. Para testar os alertas, use um build próprio do app.

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

O arquivo `MyStock/EndpointsDocs.md` define as rotas usadas aqui: `/api/lotes/relatorio-prejuizo/`, `/api/lotes/sugestoes-desconto/`, `/api/produtos/`, `/api/categorias/` e `/api/produto-skus/`. A API não expõe `/api/relatorios/` nem `/api/descontos/`. Lotes referenciam `produto`, não SKU, e o campo real é `data_validade`. Por isso a tela de um SKU mostra os lotes do produto correspondente.

O DRF atual retorna arrays sem paginação. A interface mostra 20 itens por página após buscar a lista. Se a API passar a paginar no servidor, será preciso trocar essa estratégia de consulta. Em builds próprios, alertas locais são agendados para até 50 lotes críticos não esgotados quando o app abre e quando volta ao primeiro plano; não há push nem execução periódica em segundo plano. Para que o nível crítico esteja atualizado, execute a rotina de cálculo já existente no backend. O app consulta dados e usa POST para JWT, produtos, categorias e códigos de barras.
