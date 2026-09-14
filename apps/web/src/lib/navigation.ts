const DEFAULT_AUTHENTICATED_PATH = "/admin";

/**
 * Aceita somente destinos internos da área autenticada.
 * Evita redirecionamento aberto por meio do parâmetro callbackUrl.
 */
export function getSafeAuthenticatedPath(candidate: string | null): string {
  if (!candidate?.startsWith("/") || candidate.startsWith("//")) {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  try {
    const url = new URL(candidate, "https://uvergs360.internal");
    if (url.origin !== "https://uvergs360.internal") {
      return DEFAULT_AUTHENTICATED_PATH;
    }
    if (url.pathname !== "/admin" && !url.pathname.startsWith("/admin/")) {
      return DEFAULT_AUTHENTICATED_PATH;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_AUTHENTICATED_PATH;
  }
}
