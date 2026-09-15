# UVERGS 360 — Escopo Definitivo de Produto v2

**Status:** diretriz de produto aprovada para continuidade do desenvolvimento  
**Produto:** UVERGS 360  
**Responsável:** W9 Sistemas  
**Data:** Setembro/2026

## 1. Princípio central

O UVERGS 360 **não é um ERP de Câmara Municipal**.

O produto existe para a UVERGS administrar o relacionamento institucional com as Câmaras e vereadores do Rio Grande do Sul, transformar relacionamento em participação, operar seus próprios eventos e controlar as rotinas administrativas estritamente necessárias da própria associação.

O ciclo principal do produto é:

**Encontrar → Segmentar → Comunicar → Converter → Inscrição → Credencial → Check-in → Presença → Certificado → Relacionamento contínuo.**

Toda nova funcionalidade deve responder a pelo menos uma destas perguntas:

1. Ajuda a UVERGS a localizar ou conhecer melhor um vereador/Câmara?
2. Ajuda a segmentar e priorizar quem deve ser contatado?
3. Ajuda a comunicar com mais eficiência e conformidade?
4. Ajuda a converter relacionamento em inscrição/presença?
5. Ajuda a manter relacionamento após o evento?
6. Ajuda a UVERGS a operar seus próprios eventos?
7. Ajuda a UVERGS a controlar suas próprias finanças ou estoque de apoio aos eventos?
8. Ajuda a diretoria a medir resultado e tomar decisão?

Se a resposta for não, a funcionalidade fica fora do produto salvo nova decisão formal de escopo.

---

## 2. Módulos oficiais

### 2.1 Relacionamento

Núcleo do produto.

Inclui:

- Radar UVERGS;
- Base 360º de vereadores e Câmaras;
- Perfil 360º;
- histórico de mandatos e vínculos institucionais;
- contatos e qualidade cadastral;
- preferências de comunicação;
- interesses declarados e sinais comportamentais permitidos;
- tags e segmentos;
- timeline de relacionamento;
- score de engajamento;
- score de oportunidade;
- próxima melhor ação;
- Território RS / mapa oficial dos 497 municípios;
- cobertura institucional por município/região/Câmara;
- recorrência e inatividade;
- histórico de participação em eventos.

### 2.2 Comunicação

Inclui:

- Segmentos combináveis;
- Campanhas;
- Jornadas automáticas;
- e-mail;
- SMS;
- telefone como ação/tarefa;
- portal/notificações internas;
- WhatsApp somente após validação técnica, jurídica e contratual específica;
- consentimentos, base legal aplicável e opt-out;
- entrega, falha, abertura/clique quando tecnicamente disponível;
- recuperação de inscrição iniciada;
- reativação de inativos;
- pós-evento e convite para próxima ação.

Não usar partido, ideologia ou atributos sensíveis para priorização ou segmentação comercial/institucional.

### 2.3 Eventos

Inclui:

- cadastro e gestão de eventos;
- agenda/programação;
- landing page pública;
- lotes/capacidade quando aplicável;
- inscrição;
- origem/atribuição da inscrição;
- confirmação;
- credencial digital;
- QR Code;
- credenciamento;
- check-in;
- bloqueio de check-in duplicado;
- presença;
- no-show;
- lista operacional de participantes;
- certificado;
- verificação pública de certificado;
- materiais do evento;
- NPS/avaliação;
- temas de interesse pós-evento;
- jornada pós-evento;
- métricas de conversão e recorrência.

### 2.4 Portais

#### Meu UVERGS — vereador

Inclui:

- dados próprios;
- Câmara/mandato;
- contatos;
- interesses;
- preferências de comunicação;
- eventos recomendados;
- inscrições;
- credenciais;
- calendário;
- histórico de participação;
- certificados;
- avaliações pendentes;
- carteira digital institucional quando definida.

#### Portal da Câmara

Escopo limitado à própria Câmara.

Inclui:

- cadastro institucional;
- vereadores vinculados;
- qualidade/atualização cadastral;
- situação de acesso ao portal;
- calendário e eventos UVERGS;
- inscrições/serviços explicitamente liberados;
- atualização autorizada de dados.

Nunca expõe CRM global da UVERGS nem dados de outras Câmaras.

### 2.5 Inteligência

Inclui:

- Metas & Impacto;
- funil contato → interesse → inscrição → presença → recorrência;
- origem de inscrições;
- conversão por campanha/canal/região;
- cobertura territorial;
- municípios/Câmaras sem presença recente;
- recorrência;
- inatividade;
- desempenho de eventos;
- evolução antes/depois;
- relatórios gerenciais;
- indicadores financeiros relacionados aos eventos e à operação;
- comparação com linha de base do Dia Zero.

Intelligence é derivada; não é fonte primária de PII.

### 2.6 Financeiro da UVERGS

Módulo administrativo da própria associação. **Não é financeiro de Câmara Municipal.**

#### Contas a pagar

- fornecedores;
- categorias e centros de custo;
- competência;
- vencimento;
- pagamento;
- parcelamento;
- recorrência;
- anexos e comprovantes;
- rateio por evento/centro de custo;
- status: previsto, aberto, vencido, agendado, pago, cancelado;
- fluxo de aprovação conforme perfil;
- baixa manual;
- histórico e auditoria.

#### Contas a receber

- origem do recebível;
- cliente/pagador;
- vínculo opcional com evento, inscrição, associação ou serviço;
- competência;
- vencimento;
- recebimento parcial ou total;
- descontos e juros quando aplicável;
- status: previsto, aberto, vencido, recebido, cancelado;
- baixa manual;
- anexos;
- histórico e auditoria.

#### DRE gerencial

- receitas por categoria;
- despesas por categoria;
- centros de custo;
- eventos como dimensão analítica;
- comparação mensal e anual;
- resultado operacional;
- margens e evolução;
- regime gerencial configurável conforme decisão contábil da UVERGS.

O DRE do sistema é gerencial e não substitui a contabilidade oficial.

#### Fora do financeiro

- conciliação bancária;
- integração bancária automática;
- API Banrisul ou de outros bancos;
- importação automática de extratos;
- emissão de NF-e;
- emissão de NFS-e;
- SPED;
- escrituração fiscal;
- contabilidade oficial completa;
- folha de pagamento;
- tesouraria pública;
- empenho/liquidação pública.

### 2.7 Almoxarifado

Módulo enxuto para materiais e produtos utilizados pela UVERGS, especialmente em eventos.

Inclui:

- produtos e materiais;
- SKU/código interno;
- unidade de medida;
- estoque atual;
- estoque mínimo;
- localização;
- entrada;
- saída;
- ajuste;
- perda/avaria;
- transferência entre locais internos, se necessário;
- reserva/separação por evento;
- pedido de compra simples;
- fornecedor;
- quantidade solicitada/recebida;
- custo unitário/médio quando útil;
- histórico de movimentações;
- alerta de reposição;
- consumo por evento.

Não inclui WMS avançado, logística de terceiros, manufatura, produção, expedição complexa ou estoque de Câmaras.

### 2.8 Administração e Governança

Inclui:

- usuários;
- perfis/RBAC;
- 2FA para perfis sensíveis;
- auditoria;
- feature flags técnicas quando necessárias;
- configurações;
- segurança;
- privacidade/LGPD;
- integrações necessárias aos canais previstos do produto;
- importações controladas;
- logs técnicos sem PII indevida.

---

## 3. Fora do escopo definitivo

O UVERGS 360 não terá, salvo nova decisão formal:

### ERP legislativo de Câmara

- projetos de lei;
- requerimentos;
- indicações;
- sessões;
- pauta;
- votação;
- atas;
- protocolo legislativo;
- processo legislativo;
- diário oficial.

### Administração pública de Câmara

- contabilidade pública;
- orçamento público;
- empenho;
- liquidação;
- tesouraria municipal;
- prestação de contas de Câmara;
- folha/RH da Câmara;
- patrimônio da Câmara;
- licitações da Câmara;
- contratos da Câmara;
- compras da Câmara;
- almoxarifado da Câmara.

### Fiscal

- NF-e;
- NFS-e;
- NFC-e;
- SAT/MDF-e/CT-e;
- SPED;
- escrituração fiscal.

### Bancário

- conciliação bancária;
- integração automática com Banrisul;
- integração automática com outros bancos;
- Open Finance;
- leitura automática de extratos bancários.

### Política/eleitoral

- campanha eleitoral;
- CRM eleitoral;
- intenção de voto;
- propaganda eleitoral;
- segmentação por ideologia;
- score por partido;
- inferência de opinião política;
- perfis sensíveis.

### Outros módulos empresariais desnecessários

- CRM comercial genérico desconectado do relacionamento institucional;
- help desk completo;
- manufatura;
- produção;
- WMS avançado;
- e-commerce;
- marketplace;
- PDV;
- folha de pagamento;
- contabilidade oficial completa.

---

## 4. Navegação de produto desejada

### Relacionamento
- Radar UVERGS
- Base 360º
- Perfil 360º
- Território RS

### Comunicação
- Segmentos
- Campanhas
- Jornadas

### Eventos
- Eventos
- Inscrições
- Credenciamento / Check-in
- Presença / Evento 360
- Certificados
- Pós-evento

### Portais
- Meu UVERGS
- Portal da Câmara

### Financeiro
- Visão Financeira
- Contas a Pagar
- Contas a Receber
- DRE

### Almoxarifado
- Visão de Estoque
- Produtos/Materiais
- Pedidos de Compra
- Movimentações
- Reservas por Evento

### Inteligência
- Metas & Impacto
- Conversão
- Regiões
- Recorrência
- Relatórios

### Administração
- Usuários e Permissões
- Auditoria
- Configurações
- Integrações necessárias aos canais do produto

---

## 5. Linha de implementação

1. Consolidar Base 360º e Perfil 360º.
2. Consolidar Segmentação e Radar.
3. Fechar ciclo de Eventos ponta a ponta.
4. Consolidar Meu UVERGS e Portal da Câmara.
5. Implementar Financeiro da associação: contas a pagar, contas a receber e DRE.
6. Implementar Almoxarifado enxuto vinculado a eventos.
7. Consolidar Inteligência/relatórios e linha de base.
8. Endurecer segurança, testes, observabilidade, importação e operação.

---

## 6. Regra de mudança de escopo

Qualquer nova funcionalidade que não pertença aos módulos acima deve ser tratada como alteração de escopo e avaliada antes de entrar no backlog.
