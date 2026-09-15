# Estruturas de banco dormentes

Tabelas/estruturas que existem fisicamente no banco (migrations já aplicadas
em ambientes existentes) mas que a aplicação **não lê nem escreve mais**,
por decisão de escopo de produto.

**Regra:** não remover por migration até uma etapa de limpeza dedicada,
avaliada caso a caso. Nenhuma delas causa risco ou interferência em
funcionalidades ativas — todas são folhas na árvore de dependências.

## bank_statement_entries

- **Origem:** `packages/db/migrations/0012_financial_management.sql`
- **Motivo de estar dormente:** UVERGS 360 não terá conciliação bancária
  nem integração automática com bancos (`docs/UVERGS_360_PRODUCT_SCOPE_V2.md`,
  seção "Fora do financeiro" e seção 3 "Bancário").
- **Código removido nesta branch** (`feat/uvergs360-consolidation-20260915`):
  - `apps/web/src/app/admin/financeiro/actions.ts`:
    `createStatementEntryAction`, `matchStatementEntryAction`,
    `ignoreStatementEntryAction`
  - `apps/web/src/app/admin/financeiro/_components/FinanceOperations.tsx`:
    `ReconciliationPanel`
  - `apps/web/src/lib/financial-data.ts`: tipos `BankEntryRow`,
    `TransactionOption`, campo `totals.unreconciled`, as duas queries
    correspondentes
  - `apps/web/src/app/admin/financeiro/page.tsx`: aba "Conciliação",
    menção a "conciliar" no texto de produto
- **Dependências de schema que impedem remoção simples da tabela:**
  FK para `financial_accounts` e para `financial_transactions`
  (`bank_statement_entries_account_tenant_fk`,
  `bank_statement_entries_transaction_tenant_fk`). Uma migration de limpeza
  futura precisa avaliar se essas FKs afetam constraints de
  `financial_transactions`/`financial_accounts` antes de dropar.
- **Risco de manter dormente:** nenhum identificado. A tabela não é lida,
  não é escrita, não aparece em nenhuma view de relatório
  (`financial_trial_balance`, `financial_balance_sheet` etc. não a referenciam).
