# Zappfy Disparos — Web

Frontend Next.js 16 (App Router) para o sistema de disparos.

## Telas

- `/login` — login + cadastro de tenant
- `/grupos` — sync e listagem de grupos do WhatsApp
- `/midias` — biblioteca de mídias (imagens, vídeos, áudios, PDFs)
- `/mensagens` — templates de mensagem
- `/agendamentos` — lista + wizard de criação
- `/agendamentos/[id]` — detalhe + execuções (auto-refresh)
- `/group-updates` — agendar troca de nome/desc/foto de grupos
- `/settings` — timezone, webhook de falha, API Keys

## Subir em dev

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

## Deploy

Build via Dockerfile, expõe porta 3000. Configure `NEXT_PUBLIC_API_URL` como build arg e/ou runtime env.
