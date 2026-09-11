// Adaptador de log mínimo para o app Next.js.
// Existe só para satisfazer quality/no-direct-console sem inventar uma
// infraestrutura de observabilidade que este projeto ainda não tem — quando
// OpenTelemetry entrar (ver docs/IMPLEMENTATION_STATUS.md), este arquivo é
// o único ponto de troca.

export const logger = {
  error(message: string, details?: unknown): void {
    console.error(
      JSON.stringify({
        level: "error",
        message,
        detail: details instanceof Error ? details.message : details,
        timestamp: new Date().toISOString(),
      })
    );
  },
};
