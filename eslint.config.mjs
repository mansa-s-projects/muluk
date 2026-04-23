import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Allow underscore-prefixed identifiers to be intentionally unused.
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
  // User-uploaded media (avatars, vault items, series pages) is dynamic remote
  // content; <Image /> optimization is not always desirable here.
  {
    files: [
      "src/app/book/**/*.tsx",
      "src/app/dashboard/onboarding/**/*.tsx",
      "src/app/dashboard/series/**/*.tsx",
      "src/app/dashboard/settings/**/*.tsx",
      "src/app/pay/**/*.tsx",
      "src/app/series/**/*.tsx",
      "src/app/vault/**/*.tsx",
    ],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  // Disable set-state-in-effect for hooks - this is a valid pattern for data fetching
  {
    files: ["src/app/dashboard/command-center/hooks/**/*.ts"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["src/app/dashboard/direct-line/hooks/**/*.ts"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["src/app/dashboard/vault/hooks/**/*.ts"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["src/app/dashboard/components/CommandBar.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["src/app/dashboard/presence/page.tsx"],
    rules: {
      "react-hooks/purity": "off", // Date.now() is intentional for server-side initial data
    },
  },
  {
    files: ["src/app/debug/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    files: ["src/app/admin/**/*.tsx", "src/app/api/admin/**/*.ts", "src/components/admin/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["src/app/setup-admin/**/*.tsx", "src/app/onboarding/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    files: ["src/app/page.tsx"],
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
