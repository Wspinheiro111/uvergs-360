# Gate F0 — Fundação e Segurança

**Referência:** §32 e §36 v4.2
**Data:** —
**Responsável:** W9 Sistemas
**Status:** ⏳ PENDENTE

---

## Critério

Este gate avalia SOMENTE a fundação técnica. Nenhuma funcionalidade de produto é exigida aqui.

**Resultado:** GO ou NO-GO.

---

## Checklist de Evidências

### 1. Infraestrutura

| Item | Evidência | Resultado |
|---|---|---|
| Docker Compose levanta em < 5 min | Screenshot/log | — |
| Migrations 0001–0005 aplicadas do zero sem erro | Log de migração | — |
| Re-aplicação das migrations é idempotente | Log de segunda execução | — |
| RLS habilitado em todas as tabelas de domínio | Query pg_tables (ver abaixo) | — |
| service_role bypassa RLS | Resultado do teste isolation | — |
| app_user não bypassa RLS | Resultado do teste isolation | — |

**Query de verificação RLS:**
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN ('tenants')
ORDER BY tablename;
-- Todas as linhas devem ter rowsecurity = true
```

### 2. Autenticação e RBAC

| Item | Evidência | Resultado |
|---|---|---|
| Login + JWT (access 15min, refresh 7d) | Teste automatizado | — |
| 2FA obrigatório para admin, financial, presidency | Teste automatizado | — |
| Perfil sem permissão → 403 (mínimo 5 rotas) | Teste automatizado | — |
| Signed Access Link: nonce invalidado após uso | Teste automatizado | — |
| Sessão revogada não permite acesso | Teste automatizado | — |

### 3. Isolamento (evidência de teste automatizado)

| Item | Cenário | Resultado |
|---|---|---|
| Tenant A não lê dados do Tenant B | Cenário Q + L1 | — |
| Câmara A não lê dados da Câmara B | Cenário F + L2 | — |
| Pessoa A não lê dados da Pessoa B | Cenário K + L3 | — |
| Candidacy não cruza tenant | Cenário Q | — |
| Tentativa registrada em AuditLog | L1 + L2 | — |

### 4. Auditoria

| Item | Evidência | Resultado |
|---|---|---|
| AuditLog com todos os campos obrigatórios | Registro de teste | — |
| app_user não pode UPDATE em audit_logs | Exceção PostgreSQL capturada | — |
| app_user não pode DELETE em audit_logs | Exceção PostgreSQL capturada | — |
| Correlation ID presente no log e no audit entry | Log estruturado | — |

### 5. Filas e Outbox

| Item | Evidência | Resultado |
|---|---|---|
| Outbox gravado na mesma transação do domínio | Teste de integração | — |
| DLQ ativa após N falhas | Teste BullMQ | — |
| Idempotency key impede duplicação | Teste: second insert falha com unique violation | — |

### 6. Observabilidade

| Item | Evidência | Resultado |
|---|---|---|
| /api/health retorna 200 com status dos serviços | curl screenshot | — |
| Log estruturado (JSON) visível no agregador | Screenshot Grafana/Loki | — |
| Trace de requisição acessível via correlation ID | Screenshot Tempo | — |

### 7. CI/CD

| Item | Evidência | Resultado |
|---|---|---|
| Pipeline CI passa: lint + typecheck + build | GitHub Actions screenshot | — |
| Testes de isolamento passam no CI | GitHub Actions screenshot | — |
| gitleaks não encontra segredo | GitHub Actions screenshot | — |
| Deploy em staging via CI | Vercel deployment screenshot | — |
| Smoke test pós-deploy passa | Log do smoke test | — |

### 8. Feature Flags

| Item | Evidência | Resultado |
|---|---|---|
| FeatureFlag criada via admin panel | Screenshot | — |
| Módulo com flag desligada não expõe rota | Teste 404 | — |
| VAL_LEGAL_FLAGS criadas desligadas | Query banco | — |

### 9. Documentação

| Item | Evidência | Resultado |
|---|---|---|
| IMPLEMENTATION_STATUS.md com estado real | Arquivo commitado | ✅ |
| ADR-001 escrito | docs/adr/ADR-001 | ✅ |
| ADR-002 escrito | docs/adr/ADR-002 | — |
| ADR-003 escrito | docs/adr/ADR-003 | — |
| Matriz de dependências gerada | docs/gates/matriz-dependencias.md | ✅ |
| Este arquivo preenchido com evidências reais | docs/gates/F0-gate.md | 🔄 |

---

## Resultado

**Data da avaliação:** —
**Avaliado por:** —
**Decisão:** ⏳ PENDENTE

```
[ ] GO   → Iniciar F1 imediatamente
[ ] NO-GO → Lista de itens a corrigir abaixo
```

### Itens a Corrigir (se NO-GO)
_(preencher após avaliação)_

---

## Notas

- Gate F0 não exige nenhuma tela de produto
- Auth.js, tRPC, worker e frontend são construídos em paralelo nesta fase
- O gate pode ser declarado GO parcialmente (ex: RLS/isolamento GO, aguardar auth)
  - **REGRA:** não avançar para F1 até GO completo dos 30 itens
