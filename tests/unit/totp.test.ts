import { describe, expect, it } from "vitest";

import { verifyTotpCode } from "../../apps/web/src/lib/auth/totp.ts";

describe("TOTP", () => {
  it("valida o vetor oficial RFC 6238 truncado para seis dígitos", () => {
    expect(verifyTotpCode("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "287082", 59_000)).toBe(true);
  });

  it("rejeita código inválido", () => {
    expect(verifyTotpCode("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "000000", 59_000)).toBe(false);
  });
});
