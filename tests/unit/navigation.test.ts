import { describe, expect, it } from "vitest";

import { getSafeAuthenticatedPath } from "../../apps/web/src/lib/navigation.ts";

describe("getSafeAuthenticatedPath", () => {
  it.each([
    null,
    "",
    "https://malicioso.example/roubar-sessao",
    "//malicioso.example/roubar-sessao",
    "/login",
    "/api/auth/session",
    "admin",
  ])("usa /admin para destino não permitido: %s", (candidate) => {
    expect(getSafeAuthenticatedPath(candidate)).toBe("/admin");
  });

  it.each([
    ["/admin", "/admin"],
    ["/admin/flags", "/admin/flags"],
    ["/admin/users?page=2", "/admin/users?page=2"],
    ["/admin/audit#evento", "/admin/audit#evento"],
  ])("preserva destino administrativo interno: %s", (candidate, expected) => {
    expect(getSafeAuthenticatedPath(candidate)).toBe(expected);
  });
});
