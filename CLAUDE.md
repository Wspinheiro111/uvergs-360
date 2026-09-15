# UVERGS 360 — Contexto do Projeto

Este arquivo é lido automaticamente pelo Claude Code no início de cada sessão.
Mantenha atualizado conforme o projeto evolui.

## O que é o projeto

Plataforma da UVERGS (União dos Vereadores do RS) para relacionamento
institucional com Câmaras e vereadores — **não é ERP de Câmara Municipal**.

Documento de escopo oficial: `docs/UVERGS_360_PRODUCT_SCOPE_V2.md` — leia
antes de propor qualquer funcionalidade nova. Regra do documento: toda
funcionalidade nova precisa responder "sim" a pelo menos uma das 8 perguntas
da seção 1, senão fica fora do produto.

Ciclo principal do produto:
**Encontrar → Segmentar → Comunicar → Converter → Inscrição → Credencial →
Check-in → Presença → Certificado → Relacionamento contínuo.**

## Stack

- Monorepo pnpm workspaces + Turborepo
- `apps/web`: Next.js 16 App Router, React 19, Tailwind
- `apps/worker`: BullMQ (não deployado ainda)
- `packages/db`: schema Drizzle + migrations SQL, PostgreSQL 16 (Neon em produção)
- Auth.js v5, RLS multi-tenant (roles `app_user`, `app_writer`, `service_role`)
- Testes: Vitest (`tests/isolation/vitest`, `tests/unit`) + scripts standalone
  (`tests/isolation/*.standalone.mjs`, `tests/audit/*.standalone.mjs`)

## Estado atual (branches)

Havia três branches divergentes que foram consolidadas em uma linha oficial:

- `main` — só fundação F0 (auth, tenants, RLS, feature flags). **É o que está em produção no Vercel.**
- `feat/f1-functional-core-20260911` (PR #2) — financeiro + institucional
  reais, com banco. Base da consolidação.
- `feat/director-demo-20260915` — UI mockup (Radar, Portais, growth) sem
  backend algum. Serviu só de **referência visual**, nunca de arquitetura.
- **`feat/uvergs360-consolidation-20260915`** — branch oficial atual,
  continue o desenvolvimento a partir dela. Não recriar as anteriores.

## Regras de segurança — não infringir

- **Nunca** faça merge em `main` sem autorização explícita
- **Nunca** execute migration em banco de produção
- **Nunca** altere variáveis de ambiente de produção (Vercel) sem confirmar
- **Nunca** copie dado de `mock-data.ts` (da `director-demo`) para código
  funcional fingindo que é dado real
- Se um campo de CRM (score de engajamento, oportunidade, próxima ação,
  última interação) ainda não existe no banco, mostre "Ainda não calculado"
  — nunca invente um número
- Migrations sempre reversíveis quando possível; nunca `DROP TABLE`/`TRUNCATE`
  sem confirmação explícita
- Estruturas de banco que ficam sem uso (ex.: `bank_statement_entries`,
  documentada em `docs/DORMANT_TABLES.md`) ficam **dormentes**, não são
  removidas por migration até uma limpeza dedicada e avaliada
- Antes de mudanças grandes: audite o código existente primeiro, não
  presuma — muitas "correções" de auditorias anteriores já foram
  comprovadas com teste real, não é preciso refazer do zero

## Antes de cada entrega

Rodar sempre (ambiente local, banco descartável — nunca produção):
```bash
pnpm run lint
cd apps/web && npx tsc --noEmit && npm run build
npx vitest run tests/isolation/vitest tests/unit
node tests/isolation/rls-isolation.standalone.mjs
node tests/audit/audit.standalone.mjs
```

Buscar antes de finalizar:
```bash
grep -rln "mock-data\|DEV_MOCK" apps/web/src --include="*.ts" --include="*.tsx"
```
Se algum arquivo novo/alterado aparecer nessa busca, é bloqueador.

## Navegação oficial (docs/UVERGS_360_PRODUCT_SCOPE_V2.md, seção 4)

Relacionamento → Comunicação → Eventos → Portais → Financeiro →
Almoxarifado → Inteligência → Administração.

Estrutura já implementada em `apps/web/src/app/admin/_components/AdminShell.tsx`
com `status: "real" | "planned"` por item — módulos ainda não construídos
aparecem desabilitados com badge "Em construção", nunca como link morto.

## Próximos módulos (ordem sugerida, não travada)

1. Consentimento e base legal por canal (pré-requisito de Comunicação)
2. Segmentação sobre dado real
3. Ciclo de Eventos ponta a ponta (inscrição → credencial → check-in → certificado)
4. Meu UVERGS / Portal da Câmara (usar `signed_access_links`, já existe no schema F0)
5. Almoxarifado enxuto
6. Inteligência/relatórios

## Fora do escopo — nunca implementar sem decisão formal

Conciliação bancária, integração Banrisul/Open Finance, emissão fiscal
(NF-e/NFS-e/SPED), contabilidade oficial completa, folha/RH, ERP legislativo
de Câmara, CRM eleitoral, PDV, e-commerce. Lista completa na seção 3 do
documento de escopo.
