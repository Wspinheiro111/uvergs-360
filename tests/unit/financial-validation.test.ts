import { describe, expect, it } from "vitest";

import { isValidIsoDate, parseBrlCents } from "../../apps/web/src/lib/financial-validation.ts";

describe("validação financeira brasileira", () => {
  it.each([
    ["1.234", 123400], ["1.234,56", 123456], ["1234,56", 123456],
    ["12,50", 1250], ["12.50", 1250], ["R$ 2.000,00", 200000],
  ])("converte %s para centavos", (input, expected) => expect(parseBrlCents(input)).toBe(expected));

  it.each(["", "1,234,56", "texto", "-10", "10,999"])("rejeita valor inválido %s", (input) => {
    expect(parseBrlCents(input)).toBe(0);
  });

  it("rejeita datas inexistentes sem normalização silenciosa", () => {
    expect(isValidIsoDate("2026-02-31")).toBe(false);
    expect(isValidIsoDate("2026-02-29")).toBe(false);
    expect(isValidIsoDate("2028-02-29")).toBe(true);
  });
});
