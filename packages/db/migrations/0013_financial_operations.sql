-- Operação manual de títulos financeiros e identificação do pagador.
ALTER TABLE receivables ADD COLUMN debtor_name TEXT;
ALTER TABLE receivables DROP CONSTRAINT receivables_subject_check;
ALTER TABLE receivables ADD CONSTRAINT receivables_subject_check CHECK (
  chamber_id IS NOT NULL OR person_id IS NOT NULL OR registration_id IS NOT NULL OR debtor_name IS NOT NULL
);

COMMENT ON COLUMN receivables.debtor_name IS 'Pagador informado em lançamentos manuais sem vínculo institucional.';
