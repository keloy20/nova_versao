# Deploy Producao (Banco Real)

## 1) Backend (Render)

Defina as variaveis de ambiente no serviço backend:

- `NODE_ENV=production`
- `PORT=10000` (ou a porta do provedor)
- `JWT_SECRET=<segredo-forte>`
- `MONGO_URI=<URI_DO_BANCO_REAL>`

Importante:
- Em producao, o backend agora exige `MONGO_URI`.
- Sem essa variavel, o processo encerra no boot para evitar uso de banco local/teste.
- Rotas de compatibilidade local (`devCompatRoutes`) ficam desativadas em producao.

## 2) Frontend (Vercel/Render)

Defina:

- `NEXT_PUBLIC_API_URL=<URL_PUBLICA_DO_BACKEND>`
- `BACKEND_URL=<URL_PUBLICA_DO_BACKEND>`

## 3) Smoke test apos deploy

1. Abrir `/login` e autenticar admin.
2. Criar uma OS.
3. Editar OS e trocar tecnico.
4. Validar OS e confirmar abertura do WhatsApp web.
5. Baixar PDF no dashboard e na tela de detalhe.

## 4) Observacao funcional

- Canal de envio por email esta desativado temporariamente.
- Fluxo atual usa WhatsApp web (`wa.me`) no frontend.
