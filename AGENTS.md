# Gerenciador de Validades — app mobile

Este repositório versiona o aplicativo Expo/React Native e o material de replicação do TCC. O backend Django é mantido separadamente. Um snapshot do backend usado no caso demonstrativo é distribuído no ZIP da pasta `replicacao`, acompanhado de dados sintéticos e instruções.

## Desenvolvimento

- Configure `EXPO_PUBLIC_API_BASE_URL` em `.env` com a origem de uma API compatível, sem `/api` no fim.
- Use `npm install` e `npm start` para executar o app.
- Antes de publicar alterações, execute `npm run typecheck` e `npm test`.
- Não adicione segredos, bancos de dados, backups, builds ou uma cópia do backend ao Git.
