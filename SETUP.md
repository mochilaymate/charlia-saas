# Setup del Agente WhatsApp — Instrucciones Rápidas

## Para Desarrollo Local

### 1. Instalar dependencias
```bash
npm install
```

### 2. Variables de entorno
Copia `.env.local.example` a `.env.local` y llena con tus datos:
```bash
cp .env.local.example .env.local
```

Necesitas:
- `NEXT_PUBLIC_SUPABASE_URL` — de Supabase (Settings → API)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — de Supabase (Settings → API)
- `SUPABASE_SERVICE_ROLE_KEY` — de Supabase (Settings → API)
- `OPENROUTER_API_KEY` — de OpenRouter (https://openrouter.ai/keys)

### 3. Dev server
```bash
npm run dev
```

Abre http://localhost:3000

---

## Para Producción (Vercel)

### 1. Login en Vercel
```bash
vercel login
```

### 2. Link al proyecto
```bash
vercel link
```

### 3. Push environment variables
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add OPENROUTER_API_KEY production
vercel env add OPENROUTER_DEFAULT_MODEL production
vercel env add ENCRYPTION_KEY production
vercel env add BUFFER_PROCESS_SECRET production
vercel env add CRON_SECRET production
```

### 4. Deploy
```bash
vercel --prod
```

---

## Troubleshooting

**Error: "Cannot convert argument to a ByteString"**
- Las variables de entorno tienen caracteres especiales (BOM)
- Solución: Re-sube las variables en Vercel sin copiar/pegar desde editores que agregan BOM
- Usa: `echo -n "valor-limpio" | vercel env add VAR_NAME production`

**El agente no responde**
- Verifica que `OPENROUTER_API_KEY` sea válido en Vercel
- Confirma que tu cuenta de OpenRouter tenga saldo
- Revisa los logs: `vercel logs`

**Cron no ejecuta**
- El cron necesita `CRON_SECRET` igual en Vercel y en Supabase
- Re-corre: `node scripts/setup.mjs cron-apply`

---

## Documentación completa
Véase `INSTALAR.md` para pasos detallados de instalación inicial.
