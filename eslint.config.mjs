// UVERGS 360 — Quality gates de ESLint
// Adaptado do vibe-coding-toolkit para a estrutura do monorepo.
//
// Tier rápido: roda sem informação de tipo (serve para pre-commit).
// Regras que exigem o type checker vivem em eslint.typed.config.mjs.
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import importX from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";

import quality from "./eslint-rules/index.cjs";

export default defineConfig([
  {
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
      globals: {
        console: "readonly",
        process: "readonly",
        fetch: "readonly",
        URL: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        crypto: "readonly",
        Response: "readonly",
        Request: "readonly",
        Headers: "readonly",
        React: "readonly",
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.strict,

  {
    // Fronteira de arquitetura: a camada de apresentação (apps/web/src/app)
    // não pode importar o cliente de banco do pacote packages/db diretamente.
    plugins: { "import-x": importX, "import-x-debt": importX },
    settings: {
      "import-x/resolver-next": [createTypeScriptImportResolver()],
    },
    rules: {
      "import-x/no-duplicates": "error",
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            // App Router não acessa o cliente de banco do monorepo direto.
            // Deve passar por apps/web/src/lib/db/client.ts (import dinâmico).
            {
              target: "./apps/web/src/app/**/*",
              from: "./packages/db/src/client.ts",
            },
            // App Router não importa adapters de infraestrutura direto.
            {
              target: "./apps/web/src/app/**/*",
              from: "./packages/adapters/**/*",
            },
          ],
        },
      ],
    },
  },

  {
    files: [
      "apps/*/src/**/*.{js,jsx,ts,tsx,mjs,cjs}",
      "packages/*/src/**/*.{js,jsx,ts,tsx,mjs,cjs}",
    ],
    plugins: { quality },
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-var": "error",
      "prefer-const": "error",
      // baseline: 32 violações na instalação (2026-09-05).
      // Migração termina quando chegar a zero e a regra voltar a "error".
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // baseline: 20 violações — a maior parte em testes standalone e
      // no acesso a linhas do postgres.js, que não tem tipos por linha.
      "@typescript-eslint/no-explicit-any": "warn",
      // baseline: 7 violações — asserções em setup de teste.
      "@typescript-eslint/no-non-null-assertion": "warn",
      complexity: ["warn", 12],
      "max-depth": ["warn", 4],
      "max-statements": ["warn", 20],
      "max-params": ["warn", 4],
      "max-lines-per-function": [
        "warn",
        { max: 150, skipBlankLines: true, skipComments: true },
      ],
      "max-nested-callbacks": ["warn", 3],
      // 5 arquivos acima do teto na instalação. O prompt recomenda manter
      // "error" com lista explícita em vez de derrubar a regra para "warn".
      // Cada arquivo sai da lista quando for quebrado (prompt 09).
      "quality/max-lines": [
        "error",
        {
          max: 350,
          ignore: [
            "packages/db/src/schema/platform/audit.ts", // 444
            "packages/db/src/schema/platform/auth.ts",  // 419
          ],
        },
      ],
      // baseline: 1 violação (apps/web/src/lib/auth.ts:104).
      "quality/no-direct-console": [
        "warn",
        { logger: "o adaptador de log do projeto" },
      ],
      "quality/no-direct-data-access": [
        "error",
        {
          modules: ["@uvergs360/db", "@/lib/db/client", "../lib/db/client"],
          bindings: ["db", "serviceDb"],
          layers: ["/apps/web/src/app/"],
          extensions: [".tsx"],
        },
      ],
    },
  },

  {
    // Worker e adapters logam antes de qualquer infraestrutura estar de pé.
    // Este bloco vem DEPOIS do que liga a regra — flat config aplica o último.
    files: [
      "apps/worker/src/**/*.ts",
      "packages/adapters/**/*.ts",
      "packages/db/seed/**/*",
      "apps/web/src/lib/logger.ts",
    ],
    rules: {
      "quality/no-direct-console": "off",
    },
  },

  {
    files: [
      "**/*.test.{ts,tsx}",
      "**/*.test.mjs",
      "**/{__tests__,__mocks__,fixtures,mocks}/**/*.{ts,tsx}",
      "tests/**/*",
    ],
    plugins: { quality },
    rules: {
      "quality/max-lines": ["warn", { includeTests: true, max: 350 }],
      "quality/no-direct-console": "off",
      "max-statements": "off",
      "max-lines-per-function": "off",
      "max-nested-callbacks": "off",
      "import-x/no-restricted-paths": "off",
    },
  },

  {
    // Testes standalone (.mjs) e configs de raiz não são a aplicação que
    // este config policia. Mesma baseline de warn — sobem para error quando
    // a contagem chegar a zero.
    files: [
      "tests/**/*.{mjs,ts,tsx}",
      "packages/db/seed/**/*.mjs",
      "packages/adapters/**/*.ts",
      "*.config.{js,mjs,ts}",
      "**/*.config.{js,mjs,ts}",
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // postcss.config.js e afins são CommonJS.
    files: ["**/*.config.js", "**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { module: "writable", require: "readonly", __dirname: "readonly" },
    },
  },
  {
    files: ["eslint-rules/**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { module: "readonly", require: "readonly" },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  globalIgnores([
    "node_modules/**",
    "**/node_modules/**",
    "dist/**",
    "build/**",
    "**/.next/**",
    "**/.turbo/**",
    "coverage/**",
    "**/*.tsbuildinfo",
    "pnpm-lock.yaml",
    "package-lock.json",
    "**/package-lock.json",
    "scripts/**",
  ]),
]);
