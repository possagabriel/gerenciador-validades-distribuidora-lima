# Gerenciador de Validades — app mobile

Este repositório versiona apenas o aplicativo Expo/React Native. O backend Django é mantido separadamente e não deve ser incluído em commits deste repositório.

## Desenvolvimento

- Configure `EXPO_PUBLIC_API_BASE_URL` em `.env` com a origem de uma API compatível, sem `/api` no fim.
- Use `npm install` e `npm start` para executar o app.
- Antes de publicar alterações, execute `npm run typecheck` e `npm test`.
- Não adicione segredos, bancos de dados, backups, builds ou uma cópia do backend ao Git.
