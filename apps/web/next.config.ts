import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // typescript.ignoreBuildErrors e eslint.ignoreDuringBuilds foram removidos
  // de propósito: o typecheck e o lint estão limpos (Gate F0, prompt 02) e
  // mascarar erros de build de novo reintroduziria exatamente o problema
  // que essa limpeza corrigiu. A chave `eslint` também não existe mais no
  // tipo do Next 16 — o `next lint` embutido foi descontinuado.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
