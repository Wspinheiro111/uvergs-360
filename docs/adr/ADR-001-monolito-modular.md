# ADR-001 — Arquitetura: Monólito Modular

**Data:** Setembro 2026
**Status:** Aceito
**Responsável:** W9 Sistemas
**Referência:** §19.1 v4.2

---

## Contexto

O UVERGS 360 precisa suportar 12 módulos funcionais com fronteiras de domínio claras, alta coesão interna e baixo acoplamento entre módulos. A equipe de desenvolvimento pode variar em paralelo ao longo do projeto.

## Opções Consideradas

1. **Microsserviços** — serviços independentes por domínio
2. **Monólito simples** — sem fronteiras de módulo explícitas
3. **Monólito modular com fronteiras de domínio explícitas** ← escolhida

## Decisão

**Monólito modular.** Comunicação entre domínios via eventos de domínio (outbox) ou chamada de serviço tipada — nunca acesso direto ao schema de outro domínio.

Estrutura de módulos:
- Platform (tenant, auth, audit)
- Institutional (município, câmara, pessoa)
- Events (evento, inscrição, presença)
- Certification (certificado, política)
- Financial (recebível, pagamento, empenho)
- CRM (relacionamento, filiação, IRU)
- Communication (campanha, mensagem, outbox)
- Portals (câmara, servidor, vereador)
- Intelligence (BI, mapa, relatórios)
- AI/OCR (busca semântica, OCR — F7)

## Motivo

Microsserviços adicionam complexidade operacional desproporcional para a v1:
- Service discovery (Consul/Istio)
- Distributed tracing (já incluso no monólito via OTel)
- Latência de rede entre serviços
- Deployments independentes exigem CI/CD por serviço
- Transações distribuídas (2PC ou sagas) para operações financeiras

O volume inicial (497 municípios, ~10K usuários) não justifica o overhead. O monólito modular oferece as mesmas fronteiras de domínio com complexidade operacional 10x menor.

## Impactos

**Positivos:**
- Deploy simples (um processo)
- Debugging direto (stack trace completo)
- Transações locais (sem 2PC)
- Desenvolvimento mais rápido na fase inicial

**Negativos:**
- Scaling horizontal de módulos específicos requer extração futura
- Deploy completo mesmo para mudança em módulo isolado

## Reversibilidade

**ALTA** — fronteiras claras de domínio facilitam extração de microsserviço quando o volume justificar. A convenção de AccessScope e o padrão de outbox já criam a separação lógica necessária.

## Regra de engenharia derivada

Nenhum código fora do domínio acessa diretamente tabelas de outro domínio. Toda comunicação é via:
1. Evento de domínio (outbox → fila → worker)
2. Chamada de serviço tipada (tRPC procedure → domain service)
