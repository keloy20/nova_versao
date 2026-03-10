# Ambiente Local (sem producao)

Este projeto esta configurado para usar **somente API local** no desenvolvimento:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:10000`
- Variavel: `NEXT_PUBLIC_API_URL=http://localhost:10000` em `.env.local`

## Rodar backend local

```bash
cd gerenciador-de-os
npm run db:up
npm run dev
```

Se nao usa Docker, instale MongoDB local e garanta a URL do `.env`:

```bash
MONGO_URI=mongodb://127.0.0.1:27017/gerenciador_os_local
```

## Rodar frontend local

```bash
npm run dev
```

## Importante

- Nao fazer deploy agora.
- Nao apontar `NEXT_PUBLIC_API_URL` para Render durante testes.
- O codigo novo de terceiros/dashboard/notificacoes foi adicionado para ambiente local de desenvolvimento.
