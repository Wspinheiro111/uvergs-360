# UVERGS 360 — F1 Growth & Relationship Foundation

**Status:** especificação técnica pronta para implementação após Gate F0 completo  
**Branch de preparação:** `feat/growth-relationship-foundation`  
**Produto:** UVERGS 360  
**Responsável:** W9 Sistemas  
**Data:** Setembro/2026

> Esta especificação NÃO transforma o UVERGS 360 em ERP de Câmara.
> O sistema pertence à UVERGS e conecta associação, Câmaras Municipais e vereadores em um único ambiente de relacionamento, comunicação, eventos e serviços institucionais.

---

## 1. Objetivo de produto

Construir a fundação para que a UVERGS consiga responder diariamente:

1. Quem ainda não alcançamos?
2. Quem deve ser contatado agora?
3. Qual é o assunto mais relevante para essa pessoa?
4. Qual canal autorizado deve ser usado?
5. Qual foi o resultado do contato?
6. Quem tem maior probabilidade de participar do próximo evento?
7. Quais municípios e Câmaras estão com relacionamento fraco?
8. Onde a UVERGS está perdendo conversão entre contato, interesse, inscrição e presença?

A F1 deve criar uma **Base 360º de Câmaras e Vereadores**, preparada para alimentar posteriormente:

- Radar UVERGS;
- score de relacionamento e oportunidade;
- segmentação avançada;
- jornadas e campanhas;
- mapa de presença institucional;
- portal da Câmara;
- Meu UVERGS para vereadores;
- funil contato → interesse → inscrição → presença → recorrência;
- analytics de origem e conversão.

---

## 2. Não objetivos

Esta fase NÃO deve:

- criar ERP contábil, legislativo ou administrativo para Câmaras;
- controlar folha, patrimônio, licitações ou processo legislativo municipal;
- inferir ideologia, opinião política ou preferência eleitoral;
- usar partido/ideologia como fator de pontuação comercial;
- disparar comunicação sem registrar base legal, consentimento ou outra hipótese válida aplicável;
- executar campanhas reais antes dos gates de segurança e comunicação serem aprovados;
- habilitar WhatsApp como canal automático sem validação jurídica/técnica específica do provedor e política vigente.

---

## 3. Atores e escopos

### 3.1 UVERGS

Administrador institucional da plataforma.

Pode, conforme RBAC:

- visualizar a base completa do tenant UVERGS;
- administrar Câmaras, pessoas e mandatos;
- segmentar públicos;
- registrar relacionamento;
- visualizar score e próxima ação;
- criar campanhas e eventos em fases posteriores;
- analisar municípios, regiões e funil;
- corrigir dados com trilha de auditoria.

### 3.2 Câmara Municipal

Acesso limitado à própria Câmara.

Pode, conforme permissão:

- consultar cadastro institucional próprio;
- visualizar vereadores vinculados à Câmara;
- solicitar/realizar atualização autorizada de dados;
- convidar vereador para ativar acesso;
- acompanhar inscrições e serviços liberados para a Câmara;
- futuramente pré-inscrever vereadores em eventos.

Nunca pode consultar dados de outra Câmara.

### 3.3 Vereador

Acesso individual ao próprio perfil e serviços liberados.

Pode, conforme permissão:

- revisar dados pessoais e profissionais;
- informar temas de interesse;
- administrar preferências de comunicação;
- visualizar eventos e recomendações;
- acessar inscrições, histórico, materiais e certificados em fases posteriores.

Nunca pode consultar o CRM interno completo da UVERGS nem dados de outros vereadores.

---

## 4. Fronteiras de domínio

Conforme ADR-001, manter monólito modular e comunicação entre domínios por serviço tipado ou outbox.

### Institutional

Fonte de verdade para:

- Câmara;
- pessoa;
- mandato/vínculo institucional;
- dados de contato;
- relação pessoa ↔ Câmara;
- município.

### CRM

Fonte de verdade para:

- estágio de relacionamento;
- histórico/timeline;
- score;
- tags;
- interesses;
- próxima melhor ação;
- origem do relacionamento.

### Communication

Fonte de verdade para:

- preferências por canal;
- consentimentos e revogações;
- campanhas;
- audiência;
- envio e entrega;
- opt-out;
- métricas de comunicação.

### Events

Fonte de verdade para:

- evento;
- inscrição;
- presença;
- interesse relacionado ao evento.

### Intelligence

Somente leitura/derivação analítica:

- funil;
- cobertura por município;
- mapa do RS;
- coortes;
- conversões;
- score agregado;
- recomendações.

Intelligence não deve se tornar fonte primária de PII.

---

## 5. Modelo de dados mínimo para F1

> Nomes abaixo são contratos de domínio. A migration executável só deve ser criada/aplicada após Gate F0 completo.

### 5.1 `chambers`

Representa a Câmara Municipal como instituição dentro do tenant.

Campos mínimos:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `municipality_id UUID NOT NULL` → `public_ref.municipalities.id`
- `legal_name TEXT NOT NULL`
- `display_name TEXT`
- `cnpj TEXT NULL`
- `email TEXT NULL`
- `phone TEXT NULL`
- `website_url TEXT NULL`
- `address JSONB NULL`
- `relationship_status TEXT NOT NULL`
- `portal_status TEXT NOT NULL`
- `source TEXT NOT NULL`
- `created_at`
- `updated_at`
- `deleted_at`

Regras:

- única Câmara ativa por `(tenant_id, municipality_id)` salvo exceção documentada;
- RLS obrigatória por `tenant_id`;
- acesso de usuário de Câmara ainda restringido por `user_roles.chamber_id` no serviço/RBAC;
- soft delete.

### 5.2 `persons`

Pessoa física institucionalmente relacionada à UVERGS.

Campos mínimos:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `full_name TEXT NOT NULL`
- `preferred_name TEXT NULL`
- `birth_date DATE NULL`
- `cpf_encrypted TEXT NULL` somente se houver necessidade e base legal aprovada
- `photo_url TEXT NULL`
- `person_type TEXT NOT NULL` (`councilor`, `chamber_staff`, `uvergs_staff`, `other`)
- `status TEXT NOT NULL`
- `source TEXT NOT NULL`
- `source_reference TEXT NULL`
- `data_quality_score SMALLINT DEFAULT 0`
- `last_verified_at TIMESTAMPTZ NULL`
- `created_at`
- `updated_at`
- `deleted_at`

Regras:

- nunca usar CPF como chave funcional;
- deduplicação por sinais controlados, nunca merge automático irreversível;
- PII sempre tenant-scoped;
- toda alteração relevante auditável.

### 5.3 `mandates`

Representa o vínculo político-institucional da pessoa com a Câmara.

Campos mínimos:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `person_id UUID NOT NULL`
- `chamber_id UUID NOT NULL`
- `election_id UUID NULL` → `public_ref.elections.id`
- `party_id UUID NULL` → `public_ref.parties.id`
- `office TEXT NOT NULL DEFAULT 'vereador'`
- `term_start DATE NOT NULL`
- `term_end DATE NULL`
- `mandate_status TEXT NOT NULL` (`elected`, `active`, `leave`, `substitute`, `ended`)
- `is_current BOOLEAN NOT NULL`
- `source TEXT NOT NULL`
- `source_reference TEXT NULL`
- `verified_at TIMESTAMPTZ NULL`
- `created_at`
- `updated_at`

Observação de produto:

`party_id` é dado institucional/histórico; **não participa do score de oportunidade nem de recomendação de campanha**.

### 5.4 `contact_points`

Um registro por canal de contato.

Campos mínimos:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `person_id UUID NOT NULL`
- `type TEXT NOT NULL` (`email`, `mobile`, `phone`, `whatsapp`)
- `value_encrypted TEXT NOT NULL`
- `value_hash TEXT NOT NULL` para deduplicação controlada
- `masked_value TEXT NOT NULL`
- `is_primary BOOLEAN NOT NULL DEFAULT false`
- `is_verified BOOLEAN NOT NULL DEFAULT false`
- `verified_at TIMESTAMPTZ NULL`
- `status TEXT NOT NULL` (`active`, `invalid`, `bounced`, `blocked`, `archived`)
- `source TEXT NOT NULL`
- `last_used_at TIMESTAMPTZ NULL`
- `created_at`
- `updated_at`

Índices previstos:

- `(tenant_id, person_id, type, status)`
- `(tenant_id, value_hash)`

A UI comum nunca deve exibir o valor criptografado.

### 5.5 `communication_preferences`

Preferências de contato do titular.

Campos mínimos:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `person_id UUID NOT NULL`
- `channel TEXT NOT NULL`
- `purpose TEXT NOT NULL` (`institutional`, `events`, `courses`, `services`, `newsletter`)
- `status TEXT NOT NULL` (`allowed`, `denied`, `unknown`)
- `legal_basis TEXT NULL`
- `captured_at TIMESTAMPTZ NULL`
- `revoked_at TIMESTAMPTZ NULL`
- `capture_source TEXT NULL`
- `evidence JSONB NULL`
- `updated_at`

Restrição única:

- `(tenant_id, person_id, channel, purpose)`

### 5.6 `interests`

Catálogo institucional de temas.

Exemplos iniciais:

- licitações e contratos;
- gestão pública;
- orçamento municipal;
- direito municipal;
- mandato parlamentar;
- inteligência artificial;
- comunicação institucional;
- redes sociais;
- reforma tributária;
- captação de recursos;
- transparência;
- proteção de dados;
- desenvolvimento municipal.

Campos mínimos:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `slug TEXT NOT NULL`
- `name TEXT NOT NULL`
- `category TEXT NULL`
- `active BOOLEAN NOT NULL DEFAULT true`
- `created_at`

### 5.7 `person_interests`

Relaciona pessoa a tema de interesse.

Campos mínimos:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `person_id UUID NOT NULL`
- `interest_id UUID NOT NULL`
- `strength SMALLINT NOT NULL DEFAULT 1`
- `source TEXT NOT NULL` (`self_declared`, `event`, `content`, `staff`, `inferred_behavior`)
- `confidence NUMERIC NULL`
- `last_signal_at TIMESTAMPTZ NULL`
- `created_at`
- `updated_at`

Regra:

- inferência comportamental somente a partir de interação com conteúdos/serviços da UVERGS;
- nunca inferir ideologia ou atributo sensível.

### 5.8 `relationship_profiles`

Snapshot derivado para priorização operacional.

Campos mínimos:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `person_id UUID NOT NULL UNIQUE por tenant`
- `lifecycle_stage TEXT NOT NULL`
- `engagement_score SMALLINT NOT NULL DEFAULT 0`
- `opportunity_score SMALLINT NOT NULL DEFAULT 0`
- `data_quality_score SMALLINT NOT NULL DEFAULT 0`
- `last_contact_at TIMESTAMPTZ NULL`
- `last_engagement_at TIMESTAMPTZ NULL`
- `last_event_at TIMESTAMPTZ NULL`
- `next_action_type TEXT NULL`
- `next_action_at TIMESTAMPTZ NULL`
- `next_action_reason TEXT NULL`
- `score_version TEXT NOT NULL`
- `score_calculated_at TIMESTAMPTZ NULL`
- `updated_at`

`lifecycle_stage` inicial:

- `unknown`
- `identified`
- `reachable`
- `contacted`
- `engaged`
- `interested`
- `registered`
- `attended`
- `recurring`
- `inactive`

### 5.9 `relationship_events`

Timeline append-only de sinais de relacionamento.

Campos mínimos:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `person_id UUID NOT NULL`
- `chamber_id UUID NULL`
- `event_type TEXT NOT NULL`
- `channel TEXT NULL`
- `direction TEXT NULL` (`inbound`, `outbound`, `system`)
- `outcome TEXT NULL`
- `event_id UUID NULL` referência lógica ao domínio Events
- `campaign_id UUID NULL` referência lógica ao domínio Communication
- `source TEXT NOT NULL`
- `metadata JSONB NULL`
- `occurred_at TIMESTAMPTZ NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL`

Exemplos de `event_type`:

- `contact_attempted`
- `contact_delivered`
- `contact_failed`
- `email_opened`
- `link_clicked`
- `portal_activated`
- `profile_updated`
- `interest_declared`
- `event_page_viewed`
- `registration_started`
- `registration_completed`
- `event_attended`
- `event_no_show`
- `certificate_accessed`
- `opt_out`

Regra:

- append-only para preservar histórico;
- correções são novos eventos compensatórios, não UPDATE destrutivo do passado.

### 5.10 `person_tags`

Segmentação operacional explícita.

Campos mínimos:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `person_id UUID NOT NULL`
- `tag TEXT NOT NULL`
- `source TEXT NOT NULL`
- `created_by UUID NULL`
- `created_at`

Exemplos permitidos:

- `novo_na_base`
- `cadastro_incompleto`
- `participante_recorrente`
- `sem_evento_12m`
- `interessado_ia`
- `regiao_missoes`

Proibido usar tags de ideologia inferida ou atributos sensíveis.

---

## 6. Score UVERGS v1

O score NÃO decide direitos nem acesso. É somente uma priorização operacional de relacionamento.

### 6.1 Engagement Score — 0 a 100

Sinais iniciais sugeridos:

- +20 participou de evento nos últimos 12 meses;
- +10 participação adicional no período, limitado a +30;
- +15 concluiu inscrição recente;
- +10 clicou em comunicação de evento nos últimos 60 dias;
- +10 acessou portal nos últimos 30 dias;
- +10 declarou interesse em tema compatível;
- +5 atualizou o próprio cadastro;
- -15 sem interação há mais de 12 meses;
- -30 contato principal inválido/bounce.

### 6.2 Opportunity Score — 0 a 100

Calculado por contexto, especialmente para próximo evento.

Sinais permitidos:

- proximidade geográfica ao evento;
- interesse declarado no tema;
- histórico de participação em tema semelhante;
- clique/visita em página do evento;
- inscrição iniciada e não concluída;
- frequência anterior;
- recência do relacionamento;
- existência de canal válido/autorizado.

Sinais proibidos:

- partido político;
- ideologia inferida;
- religião;
- raça/etnia;
- saúde;
- orientação sexual;
- qualquer atributo sensível sem justificativa legal e técnica específica.

Todo score deve gravar:

- `score_version`;
- data/hora;
- sinais utilizados;
- explicação legível (`next_action_reason`).

---

## 7. Segmentos iniciais obrigatórios

A primeira API de segmentação deverá suportar pelo menos:

1. vereadores atuais;
2. por município;
3. por região;
4. por Câmara;
5. com/sem contato válido;
6. com/sem portal ativado;
7. nunca contatados;
8. contatados sem engajamento;
9. participaram de evento;
10. nunca participaram;
11. sem participação há 6/12/24 meses;
12. por tema de interesse;
13. inscrição iniciada e não concluída;
14. participantes recorrentes;
15. cadastro incompleto;
16. score de oportunidade por faixa;
17. última interação por período;
18. canal autorizado disponível.

Filtros devem ser combináveis com AND e somente critérios explicitamente permitidos.

---

## 8. Radar UVERGS — contrato funcional

O Radar será construído depois da base F1, mas a F1 já deve produzir os dados necessários.

Cartões previstos:

- `high_opportunity_people`
- `registration_abandonments`
- `new_uncontacted_people`
- `invalid_or_missing_contacts`
- `chambers_with_stale_data`
- `inactive_12m`
- `event_theme_matches`
- `municipalities_without_recent_presence`

Cada oportunidade deve retornar:

- pessoa;
- Câmara/município;
- score;
- motivo;
- próxima ação sugerida;
- canal autorizado disponível;
- última interação;
- link para timeline.

---

## 9. Mapa de presença institucional

A F1 deverá permitir calcular por município:

- total de vereadores atuais;
- quantos identificados na base;
- quantos com contato válido;
- quantos já contatados;
- quantos engajados;
- quantos participaram de evento em 12 meses;
- quantidade de eventos/presenças históricas;
- nível de relacionamento da Câmara;
- data da última interação.

Faixas visuais futuras:

- `strong`
- `medium`
- `weak`
- `no_relationship`

O cálculo deve ser objetivo e versionado.

---

## 10. Eventos de domínio/outbox previstos

Institutional publica:

- `institutional.chamber.created`
- `institutional.chamber.updated`
- `institutional.person.created`
- `institutional.person.updated`
- `institutional.mandate.started`
- `institutional.mandate.ended`
- `institutional.contact.verified`
- `institutional.contact.invalidated`

CRM consome e/ou publica:

- `crm.relationship.signal.recorded`
- `crm.score.recalculation.requested`
- `crm.score.updated`
- `crm.next_action.updated`
- `crm.segment.member_entered`
- `crm.segment.member_left`

Communication publica:

- `communication.delivered`
- `communication.failed`
- `communication.engaged`
- `communication.opted_out`

Events publica:

- `events.registration.started`
- `events.registration.completed`
- `events.attendance.confirmed`
- `events.no_show.recorded`

Todos os eventos devem usar idempotency key no outbox.

---

## 11. API F1 prevista

### Institutional

- `institutional.chambers.list`
- `institutional.chambers.get`
- `institutional.chambers.create`
- `institutional.chambers.update`
- `institutional.persons.list`
- `institutional.persons.get`
- `institutional.persons.create`
- `institutional.persons.update`
- `institutional.persons.mergePreview`
- `institutional.persons.merge`
- `institutional.mandates.list`
- `institutional.mandates.upsert`
- `institutional.contacts.list`
- `institutional.contacts.add`
- `institutional.contacts.verify`
- `institutional.contacts.invalidate`

### CRM

- `crm.timeline.list`
- `crm.timeline.addManualInteraction`
- `crm.profile.get`
- `crm.score.explain`
- `crm.segments.preview`
- `crm.opportunities.list`
- `crm.interests.list`
- `crm.interests.setForPerson`

### Privacy/Communication Preferences

- `communication.preferences.get`
- `communication.preferences.set`
- `communication.preferences.optOut`

Toda procedure mutável deve gerar auditoria.

---

## 12. Telas mínimas da primeira entrega

### UVERGS — Base 360º

Lista com:

- nome;
- município;
- Câmara;
- mandato/status;
- contato principal mascarado;
- qualidade do cadastro;
- estágio de relacionamento;
- engagement score;
- opportunity score;
- última interação;
- próxima ação.

Filtros rápidos:

- nunca contatados;
- sem contato;
- alto potencial;
- sem evento 12m;
- cadastro incompleto;
- novos na base.

### UVERGS — Perfil 360º

Abas:

1. Resumo
2. Dados institucionais
3. Contatos
4. Interesses
5. Eventos
6. Timeline
7. Preferências de comunicação
8. Auditoria (somente perfis autorizados)

### Câmara — Pessoas da Câmara

- vereadores atuais;
- situação do cadastro;
- situação do acesso ao portal;
- botão de convite/ativação futura;
- solicitação de atualização.

### Vereador — Meu Perfil

- meus dados;
- minha Câmara/mandato;
- contatos;
- interesses;
- preferências de comunicação.

---

## 13. Critérios de aceite de segurança

Antes de merge de qualquer migration F1:

- [ ] Gate F0 completo = GO;
- [ ] nenhum segredo ativo/histórico não tratado conforme plano aprovado;
- [ ] 2FA end-to-end aprovado para perfis sensíveis;
- [ ] CI obrigatório verde;
- [ ] migration testada em banco descartável;
- [ ] RLS em TODA tabela tenant-scoped;
- [ ] teste adversarial Tenant A × Tenant B;
- [ ] teste Câmara A × Câmara B;
- [ ] teste vereador A × vereador B;
- [ ] teste de acesso UVERGS permitido conforme RBAC;
- [ ] campos PII não aparecem em logs;
- [ ] contatos criptografados em repouso quando aplicável;
- [ ] timeline append-only validada;
- [ ] opt-out impede seleção de canal/purpose correspondente;
- [ ] merge de pessoa exige preview e trilha de auditoria;
- [ ] exclusão é soft-delete onde histórico institucional exige preservação.

---

## 14. Testes prioritários da F1

### T1 — Isolamento de tenant

Tenant B não consegue ler pessoa, Câmara, mandato, contato, preferências, interesses, profile ou timeline do Tenant A.

### T2 — Escopo de Câmara

Usuário vinculado à Câmara X não consegue consultar nem alterar pessoa vinculada exclusivamente à Câmara Y.

### T3 — Autoacesso do vereador

Vereador autenticado consegue acessar apenas seu próprio perfil e os recursos explicitamente liberados.

### T4 — Opt-out fail-closed

Pessoa com `denied` em `email/events` jamais aparece em audiência elegível para campanha de evento por e-mail.

### T5 — Explicabilidade do score

Para qualquer `opportunity_score`, a API retorna versão, sinais e explicação. Partido/atributo sensível não pode aparecer entre os sinais.

### T6 — Idempotência de sinais

O mesmo evento externo com a mesma idempotency key não cria dois relationship events nem duplica pontuação.

### T7 — Contato inválido

Bounce/telefone inválido altera status do contato, recalcula disponibilidade de canal e atualiza score sem apagar histórico.

### T8 — Deduplicação segura

Possível duplicidade gera sugestão de merge, mas nunca consolida automaticamente registros pessoais.

---

## 15. Ordem de implementação após Gate F0

### F1.1 — Institutional Core

1. `chambers`
2. `persons`
3. `mandates`
4. `contact_points`
5. RLS/RBAC
6. testes de isolamento
7. APIs básicas
8. Base 360º somente leitura

### F1.2 — Privacy + Preferences

1. `communication_preferences`
2. validação de canal/purpose
3. opt-out fail-closed
4. telas de preferências
5. testes

### F1.3 — CRM Signals

1. `interests`
2. `person_interests`
3. `person_tags`
4. `relationship_events`
5. timeline
6. eventos outbox

### F1.4 — Scoring + Segmentation

1. `relationship_profiles`
2. score v1
3. explicabilidade
4. segmentos combináveis
5. oportunidades

### F1.5 — Growth UI

1. Base 360º completa
2. Perfil 360º
3. filtros salvos
4. cartões de oportunidade
5. base para Radar UVERGS

---

## 16. Definition of Done da fundação Growth

A fundação só é considerada pronta quando:

- a UVERGS consegue localizar qualquer Câmara ou vereador atual;
- consegue saber se o contato é válido e utilizável;
- consegue ver o histórico de relacionamento;
- consegue segmentar sem exportar planilhas;
- consegue identificar quem nunca foi contatado;
- consegue identificar quem está inativo;
- consegue identificar interesse por tema;
- consegue saber quem tem maior oportunidade para uma ação específica;
- consegue explicar por que alguém recebeu determinado score;
- Câmara enxerga somente seu escopo;
- vereador enxerga somente seu escopo;
- todas as ações críticas estão auditadas;
- preferências/opt-out são respeitados de forma fail-closed;
- nenhum critério político/ideológico é usado na priorização.

---

## 17. Próximo passo técnico

Assim que Gate F0 estiver formalmente GO:

1. criar migration `0007_institutional_core.sql`;
2. criar schemas Drizzle do domínio Institutional;
3. adicionar FK real de `user_roles.chamber_id` → `chambers.id`;
4. criar testes de RLS e escopo;
5. implementar services e tRPC procedures;
6. implementar Base 360º somente leitura;
7. só depois liberar mutações e CRM scoring.

Até esse momento, esta especificação é deliberadamente não-executável para não violar o bloqueio F1–F7 definido no status oficial do projeto.
