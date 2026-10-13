# Gerenciador de Validades — Distribuidora Lima (mobile)

App de gestão em React Native, Expo SDK 57 e TypeScript. Este repositório contém apenas o aplicativo mobile. Para login, catálogo, lotes e relatórios, o app precisa de uma API Django compatível executada separadamente.

## Pré-requisitos

- Node.js 22.13 ou superior e npm.
- Um Android/iPhone com Expo Go ou um emulador. A câmera requer dispositivo físico.
- Uma API acessível pelo aparelho. O servidor precisa aceitar seu endereço em `ALLOWED_HOSTS`; em Android, tráfego HTTP local pode exigir um build de desenvolvimento ou HTTPS, conforme a plataforma.

## Configurar a API

```bash
cp .env.example .env
```

Edite `EXPO_PUBLIC_API_BASE_URL` com a origem da API, **sem** `/api` no fim. Exemplo: `EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8000`. Em emulador Android, o host da máquina costuma ser `http://10.0.2.2:8000`; em simulador iOS, `http://localhost:8000`. `127.0.0.1` no celular aponta para o próprio celular. O Expo incorpora essa variável no código do app; depois de alterá-la, recarregue o app no Expo Go ou gere um novo build. Para demonstração fora da rede local, use uma origem HTTPS acessível ao aparelho.

## Executar

Inicie a API separadamente e confirme que `http://SEU_IP_DA_REDE:8000/api/` responde no celular. Depois, na raiz deste repositório:

```bash
npm install
npm start
```

Abra o QR code no Expo Go. O comando padrão usa a rede local; conecte o aparelho e o computador à mesma rede Wi-Fi. Se o aparelho mostrar uma versão antiga, encerre o Expo com `Ctrl+C`, rode `npm start -- --clear` nesta pasta e leia o QR novo. O APK antigo não recebe mudanças do código automaticamente.

O login usa as credenciais existentes da API. Os JWTs são persistidos no SecureStore e reutilizados em memória durante a sessão. Uma falha temporária da rede na renovação não apaga a conta; um refresh expirado ou recusado pela API encerra a sessão.

O app usa quatro abas: **Início**, **Produtos**, **Lotes** e **Mais**. Na tela **Produtos**, toque em **Adicionar produto** para cadastrar nome, categoria, preço e o lote inicial com validade, quantidade e custo. É possível criar uma categoria no próprio formulário e adicionar um código de barras opcional. O detalhe do produto também permite adicionar códigos depois. **Relatórios** e **Descontos** ficam em **Mais**. O mapa e os tokens visuais estão em [DESIGN.md](DESIGN.md).

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

O perfil `demo` gera APK para Android. O build iOS exige conta Apple e provisionamento para distribuição interna. Configure `EXPO_PUBLIC_API_BASE_URL` no ambiente do EAS Build antes de gerar o binário. Após mudar permissões nativas, gere um novo build.

## Contrato da API e limites

A API precisa oferecer autenticação JWT e as rotas `/api/produtos/`, `/api/categorias/`, `/api/produto-skus/`, `/api/lotes/`, `/api/lotes/relatorio-prejuizo/` e `/api/lotes/sugestoes-desconto/`. Lotes referenciam `produto`, não SKU, e o campo real é `data_validade`. Por isso a tela de um SKU mostra os lotes do produto correspondente.

O DRF atual retorna arrays sem paginação. A interface mostra 20 itens por página após buscar a lista. Se a API passar a paginar no servidor, será preciso trocar essa estratégia de consulta. Em builds próprios, alertas locais são agendados para até 50 lotes críticos não esgotados quando o app abre e quando volta ao primeiro plano; não há push nem execução periódica em segundo plano.
