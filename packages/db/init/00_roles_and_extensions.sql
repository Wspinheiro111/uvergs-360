-- =============================================================================
-- UVERGS 360 — Inicialização do PostgreSQL
-- W9 Sistemas · v4.2 baseline
--
-- Este script é executado UMA VEZ na criação do banco Docker.
-- Em produção (Neon), executar manualmente antes das migrations.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- crypt(), gen_salt()
CREATE EXTENSION IF NOT EXISTS "vector";         -- pgvector (busca semântica F7)
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- métricas de queries
-- pg_partman: instalado separadamente se disponível no provider
-- Em Neon: particionamento manual sem pg_partman

-- ---------------------------------------------------------------------------
-- ROLES DE APLICAÇÃO
-- ADR-002: isolamento multi-tenant via RLS
-- ---------------------------------------------------------------------------

-- Role da aplicação (API/frontend) — RLS ATIVO, sem bypass
-- Toda query da aplicação usa este role via connection pool
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

-- Role de serviço (worker, migrations, jobs) — RLS BYPASS
-- NUNCA expor via API pública ou frontend
-- Usar apenas em contextos controlados de backend
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
  END IF;
END
$$;

-- Role de leitura para auditoria externa / DBA
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'readonly_role') THEN
    CREATE ROLE readonly_role NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

-- Conceder roles ao usuário da aplicação
GRANT app_user TO uvergs360;
GRANT service_role TO uvergs360;
GRANT readonly_role TO uvergs360;

-- ---------------------------------------------------------------------------
-- SCHEMAS
-- ---------------------------------------------------------------------------

-- Schema principal de domínio (tenant-scoped)
CREATE SCHEMA IF NOT EXISTS app;

-- Schema de referência global somente-leitura (sem tenant_id)
-- Apenas: Municipality, Party, Election (metadados)
-- NUNCA: Person, Candidacy, ContactPoint ou qualquer PII
CREATE SCHEMA IF NOT EXISTS public_ref;

-- Schema de auditoria (append-only, acesso restrito)
CREATE SCHEMA IF NOT EXISTS audit;

-- Permissões de schema por role
GRANT USAGE ON SCHEMA app TO app_user, service_role, readonly_role;
GRANT USAGE ON SCHEMA public_ref TO app_user, service_role, readonly_role;
GRANT USAGE ON SCHEMA audit TO service_role, readonly_role;
-- app_user NÃO tem acesso direto ao schema audit (apenas via service_role)

-- ---------------------------------------------------------------------------
-- CONFIGURAÇÕES DE SEGURANÇA
-- ---------------------------------------------------------------------------

-- Timezone padrão: UTC (exibição em America/Sao_Paulo na aplicação)
ALTER DATABASE uvergs360_dev SET timezone = 'UTC';

-- Desabilitar acesso a tabelas sem permissão explícita
ALTER DEFAULT PRIVILEGES IN SCHEMA app
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit
  REVOKE ALL ON TABLES FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- VARIÁVEIS DE SESSÃO (usadas pelo RLS)
-- ---------------------------------------------------------------------------
-- app.current_tenant_id  → UUID do tenant autenticado
-- app.current_user_id    → UUID do usuário autenticado
-- app.current_role       → role do usuário (para políticas granulares)
--
-- Definidas pelo middleware da aplicação antes de cada query:
--   SET LOCAL app.current_tenant_id = '<uuid>';
--   SET LOCAL app.current_user_id = '<uuid>';
--   SET LOCAL app.current_role = '<role_name>';
--
-- Políticas RLS lêem via: current_setting('app.current_tenant_id', true)::UUID
-- O segundo parâmetro 'true' evita erro se a variável não estiver definida

-- ---------------------------------------------------------------------------
-- FUNÇÕES AUXILIARES DE RLS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
$$;

CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID
$$;

CREATE OR REPLACE FUNCTION app.is_service_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT current_setting('role', true) = 'service_role'
     OR pg_has_role(current_user, 'service_role', 'MEMBER')
$$;

COMMENT ON FUNCTION app.current_tenant_id() IS
  'Retorna o tenant_id da sessão atual. NULL se não autenticado. Usada por políticas RLS.';

COMMENT ON FUNCTION app.is_service_role() IS
  'Retorna true se a sessão está rodando como service_role (worker/migrations). '
  'Usado para bypass de RLS em operações administrativas.';
