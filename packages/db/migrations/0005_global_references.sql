-- =============================================================================
-- Migration 0005: Referências Globais Somente-leitura
-- Municipality, Party, Election (metadados do pleito)
--
-- REGRA ABSOLUTA (§17.11A v4.2):
--   Nenhuma entidade que identifique ou referencie pessoa física pode estar aqui.
--   Candidacy, Person, SuccessionOrder, ContactPoint → SEMPRE por tenant.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- MUNICIPALITY — 497 municípios do RS + demais quando multi-tenant expand
-- Global somente-leitura: não carrega tenant_id
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public_ref.municipalities (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Código IBGE (identificador oficial)
  ibge_code       TEXT NOT NULL,
  -- Código TRE (para correlação eleitoral)
  tre_code        TEXT,
  name            TEXT NOT NULL,
  state_code      TEXT NOT NULL DEFAULT 'RS',
  -- Mesorregião e microrregião IBGE
  mesoregion      TEXT,
  microregion     TEXT,
  -- População (último censo disponível)
  population      INTEGER,
  census_year     INTEGER,
  -- Coordenadas para mapa institucional (§15.2 v4.2)
  latitude        DECIMAL(10, 8),
  longitude       DECIMAL(11, 8),
  -- Área territorial (km²)
  area_km2        DECIMAL(10, 2),
  -- Status
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  -- Metadados de importação
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  import_source   TEXT NOT NULL DEFAULT 'ibge',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT municipalities_ibge_code_state_unique UNIQUE (ibge_code, state_code)
);

CREATE TRIGGER municipalities_updated_at
  BEFORE UPDATE ON public_ref.municipalities
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE INDEX IF NOT EXISTS municipalities_ibge_code_idx
  ON public_ref.municipalities (ibge_code);
CREATE INDEX IF NOT EXISTS municipalities_state_idx
  ON public_ref.municipalities (state_code);
CREATE INDEX IF NOT EXISTS municipalities_name_idx
  ON public_ref.municipalities (name);
-- Índice GiST para queries geoespaciais (mapa §15.2)
CREATE INDEX IF NOT EXISTS municipalities_geo_idx
  ON public_ref.municipalities (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Permissões: SELECT para todos, INSERT/UPDATE apenas service_role
GRANT SELECT ON public_ref.municipalities TO app_user, readonly_role;
GRANT ALL ON public_ref.municipalities TO service_role;

COMMENT ON TABLE public_ref.municipalities IS
  'Municípios brasileiros — referência global somente-leitura. '
  'Sem tenant_id. Dados do IBGE/TSE. '
  'NUNCA incluir dados de pessoa física nesta tabela.';

-- ---------------------------------------------------------------------------
-- PARTY — partidos políticos (referência global)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public_ref.parties (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Número eleitoral TSE
  tse_number      INTEGER NOT NULL,
  acronym         TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  -- Federação/coligação quando aplicável (por eleição — armazenado em Election)
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  -- Vigência (partidos extintos preservados para histórico)
  valid_from      DATE,
  valid_until     DATE,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  import_source   TEXT NOT NULL DEFAULT 'tse',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT parties_tse_number_unique UNIQUE (tse_number)
);

CREATE TRIGGER parties_updated_at
  BEFORE UPDATE ON public_ref.parties
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE INDEX IF NOT EXISTS parties_acronym_idx ON public_ref.parties (acronym);
CREATE INDEX IF NOT EXISTS parties_active_idx ON public_ref.parties (active);

GRANT SELECT ON public_ref.parties TO app_user, readonly_role;
GRANT ALL ON public_ref.parties TO service_role;

COMMENT ON TABLE public_ref.parties IS
  'Partidos políticos — referência global somente-leitura. '
  'Apenas metadados do partido, sem dados de candidatos ou pessoas.';

-- ---------------------------------------------------------------------------
-- ELECTION — metadados do pleito eleitoral (referência global)
-- SOMENTE metadados: data, cargo, abrangência, quocientes apurados
-- Candidaturas e resultados por pessoa → tabela candidacies (por tenant)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public_ref.elections (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Identificador TSE do pleito
  tse_election_code     TEXT NOT NULL,
  year                  INTEGER NOT NULL,
  round                 INTEGER NOT NULL DEFAULT 1,
  -- Tipo de eleição
  election_type         TEXT NOT NULL
                          CHECK (election_type IN ('municipal', 'estadual', 'federal', 'suplementar')),
  -- Cargo disputado (neste contexto: vereador)
  office                TEXT NOT NULL DEFAULT 'vereador',
  state_code            TEXT NOT NULL DEFAULT 'RS',
  -- Data do pleito
  election_date         DATE NOT NULL,
  -- Metadados calculados (usados para cálculo de suplência quando necessário)
  -- Esses campos são os quocientes eleitorais e partidários
  -- Os valores por município ficam na importação de candidaturas
  notes                 TEXT,
  -- Status da importação
  import_status         TEXT NOT NULL DEFAULT 'pending'
                          CHECK (import_status IN ('pending', 'importing', 'complete', 'error')),
  imported_at           TIMESTAMPTZ,
  import_source         TEXT,
  import_version        TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT elections_tse_code_round_unique UNIQUE (tse_election_code, round)
);

CREATE TRIGGER elections_updated_at
  BEFORE UPDATE ON public_ref.elections
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE INDEX IF NOT EXISTS elections_year_idx ON public_ref.elections (year, election_type);
CREATE INDEX IF NOT EXISTS elections_state_idx ON public_ref.elections (state_code, year);

GRANT SELECT ON public_ref.elections TO app_user, readonly_role;
GRANT ALL ON public_ref.elections TO service_role;

COMMENT ON TABLE public_ref.elections IS
  'Metadados do pleito eleitoral — referência global somente-leitura. '
  'Apenas dados do pleito em si (data, tipo, cargo). '
  'Candidaturas e dados de pessoas ficam em candidacies (por tenant). '
  'Candidacy carrega tenant_id — decisão vinculante v4.2 §17.11A.';

-- ---------------------------------------------------------------------------
-- MIGRATION BATCH LOG — rastreamento de importações (§13 v4.2)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_batches (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  -- Tipo de importação
  import_type     TEXT NOT NULL,
  -- Ex: 'electoral_tse', 'municipalities_ibge', 'parties_tse'
  -- Fonte
  source_system   TEXT NOT NULL,
  source_version  TEXT,
  source_url      TEXT,
  -- Lote
  batch_reference TEXT NOT NULL, -- identificador único da fonte
  -- Contagens
  total_records   INTEGER,
  processed_ok    INTEGER NOT NULL DEFAULT 0,
  processed_error INTEGER NOT NULL DEFAULT 0,
  skipped         INTEGER NOT NULL DEFAULT 0,
  -- Status
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'running', 'complete', 'error', 'cancelled')),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  -- Log de erros e divergências
  error_log       JSONB,
  divergence_log  JSONB,
  -- Quem iniciou
  initiated_by    UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER import_batches_updated_at
  BEFORE UPDATE ON import_batches
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE INDEX IF NOT EXISTS import_batches_tenant_idx ON import_batches (tenant_id);
CREATE INDEX IF NOT EXISTS import_batches_type_status_idx
  ON import_batches (import_type, status, created_at);

ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches FORCE ROW LEVEL SECURITY;

CREATE POLICY import_batches_tenant_isolation ON import_batches
  FOR ALL
  USING (
    app.is_service_role()
    OR tenant_id = app.current_tenant_id()
  );
