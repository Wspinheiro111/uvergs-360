-- =============================================================================
-- Migration 0001: Extensions e configurações base
-- UVERGS 360 · W9 Sistemas · v4.2
-- Idempotente: seguro para re-executar
-- =============================================================================

-- Extensions necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Schemas
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS public_ref;
CREATE SCHEMA IF NOT EXISTS audit;

-- Timezone UTC no banco (exibição em America/Sao_Paulo na aplicação)
-- Em Neon: configurado via connection string parameter

-- Funções auxiliares de RLS (idempotente)
CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, public
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
$$;

CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, public
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID
$$;

CREATE OR REPLACE FUNCTION app.is_service_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, public
AS $$
  -- current_role reflete o role ATIVO após SET ROLE (não o membership)
  SELECT current_role = 'service_role'
$$;

-- Função de updated_at automático
CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION app.current_tenant_id() IS
  'Retorna o tenant_id da sessão atual. NULL se não autenticado. Usada por políticas RLS.';
COMMENT ON FUNCTION app.set_updated_at() IS
  'Trigger para atualizar automaticamente updated_at em qualquer UPDATE.';
