# UVERGS 360 — Como rodar localmente

**W9 Sistemas · Guia para desenvolvimento**

---

## Pré-requisitos

| Ferramenta | Versão mínima | Como instalar |
|---|---|---|
| Node.js | 22+ | https://nodejs.org |
| pnpm | 9+ | `npm install -g pnpm` |
| Docker Desktop | 4+ | https://docker.com/products/docker-desktop |
| Git | qualquer | https://git-scm.com |

---

## Passo a passo

### 1. Extrair o ZIP

Extraia o ZIP `uvergs-360-F0-GATE-GO.zip` numa pasta:

```bash
# Exemplo
cd ~/projetos
unzip uvergs-360-F0-GATE-GO.zip
cd uvergs-360
```

### 2. Instalar dependências

```bash
pnpm install
```

> Instala Next.js, tRPC, Drizzle ORM, BullMQ e tudo mais.

### 3. Subir banco e Redis via Docker

```bash
docker compose up -d
```

Isso sobe:
- **PostgreSQL 16** em `localhost:5432`
- **Redis 7** em `localhost:6379`
- **MinIO** em `localhost:9000` (console: `localhost:9001`)

Verificar se subiu:

```bash
docker compose ps
```

Aguardar até todos os `STATUS` serem `healthy`.

### 4. Configurar variáveis de ambiente

```bash
# Copiar o arquivo de exemplo
cp apps/web/.env.local.example apps/web/.env.local
```

Para desenvolvimento local **não precisa alterar nada** — as senhas padrão já estão configuradas.

### 5. Aplicar as migrations (criar as tabelas)

```bash
# Inicializar roles e extensions
psql postgresql://uvergs360:uvergs360_dev_secret@localhost:5432/uvergs360_dev \
  -f packages/db/init/00_roles_and_extensions.sql

# Aplicar migrations em ordem
for m in packages/db/migrations/*.sql; do
  echo "Aplicando $m..."
  psql postgresql://uvergs360:uvergs360_dev_secret@localhost:5432/uvergs360_dev -f "$m"
done
```

**No Windows (PowerShell):**
```powershell
$db = "postgresql://uvergs360:uvergs360_dev_secret@localhost:5432/uvergs360_dev"
psql $db -f packages/db/init/00_roles_and_extensions.sql
Get-ChildItem packages/db/migrations/*.sql | ForEach-Object {
  Write-Host "Aplicando $($_.Name)..."
  psql $db -f $_.FullName
}
```

> **Sem psql instalado?** Use o psql dentro do Docker:
> ```bash
> docker compose exec postgres psql -U uvergs360 -d uvergs360_dev
> ```

### 6. Popular o banco com dados de desenvolvimento

```bash
# Cria tenant UVERGS, admin, roles e flags VAL-LEGAL
node packages/db/seed/dev.seed.mjs
```

Resultado esperado:
```
✅ Tenant: uvergs
✅ 6 flags VAL-LEGAL criadas (todas desligadas)
✅ 10 roles criados
✅ Admin: admin@uvergs360.dev / Admin@360Dev!
```

### 7. Rodar o frontend

```bash
cd apps/web
pnpm dev
```

Acesse: **http://localhost:3000**

---

## O que você vai ver

### Tela de login — `http://localhost:3000/login`

**Credenciais de desenvolvimento:**

| Campo | Valor |
|---|---|
| Organização | `uvergs` |
| E-mail | `admin@uvergs360.dev` |
| Senha | `Admin@360Dev!` |

> 2FA: o admin de dev **não tem 2FA configurado**, então entra direto.
> Para testar com 2FA, use um usuário com `totp_enabled = true`.

### Dashboard admin — `http://localhost:3000/admin`

- Status do Gate F0
- Cards de navegação (Feature Flags, Usuários, Auditoria)
- Stack técnica resumida

### Feature Flags — `http://localhost:3000/admin/flags`

- Lista as 6 flags VAL-LEGAL (todas desligadas)
- Toggle visual (ação real em breve via tRPC)
- Aviso de aprovação jurídica para flags VAL-LEGAL

### Health Check — `http://localhost:3000/api/health`

Retorna JSON:
```json
{
  "status": "ok",
  "timestamp": "2026-09-05T...",
  "services": [
    { "name": "postgresql", "status": "ok", "latencyMs": 1 },
    { "name": "redis", "status": "ok" },
    { "name": "object_storage", "status": "ok" }
  ],
  "uptime": 42
}
```

---

## Rodar os testes de isolamento

Os testes validam o isolamento RLS (Gate F0):

```bash
# Precisa de Node.js e postgres instalado localmente, OU:
# Use o banco dentro do Docker:

# 1. Criar banco de teste
docker compose exec postgres psql -U uvergs360 -c "CREATE DATABASE uvergs360_test;"
docker compose exec postgres psql -U uvergs360 -d uvergs360_test \
  -f /docker-entrypoint-initdb.d/00_roles_and_extensions.sql

# 2. Aplicar migrations no banco de teste
for m in packages/db/migrations/*.sql; do
  docker compose exec -T postgres psql -U uvergs360 -d uvergs360_test < "$m"
done

# 3. Rodar testes (requer npm install do postgres)
npm install postgres --prefix /tmp/test-deps
DATABASE_URL_TEST="postgresql://uvergs360:uvergs360_dev_secret@localhost:5432/uvergs360_test" \
  node --experimental-vm-modules tests/isolation/rls-isolation.standalone.mjs
```

Resultado esperado: `22 passou | 0 falhou`

---

## Rodar o worker (BullMQ)

```bash
cd apps/worker
pnpm dev
```

O worker processa o outbox a cada 2 segundos.

---

## MinIO (object storage local)

Console web: **http://localhost:9001**
- Usuário: `uvergs360_minio`
- Senha: `uvergs360_minio_secret`

Buckets criados automaticamente:
- `uvergs360-private` — certificados, empenhos
- `uvergs360-public` — logos, arquivos públicos

---

## Troubleshooting

**`Cannot connect to database`**
→ Verifique se o Docker está rodando: `docker compose ps`

**`Module not found: @uvergs360/db`**
→ Rode `pnpm install` na raiz do projeto

**`AUTH_SECRET not set`**
→ Copie o `.env.local.example`: `cp apps/web/.env.local.example apps/web/.env.local`

**Tela branca no `/admin`**
→ Verifique o console do navegador (F12). Provavelmente falta o `.env.local`.

**Login não funciona (volta para /login)**
→ O Auth.js precisa do banco rodando. Verifique `docker compose ps` e se as migrations foram aplicadas.
