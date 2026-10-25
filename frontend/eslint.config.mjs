import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    // Todo acceso a la API pasa por lib/api-client.ts (CLAUDE.md, sección 4.3).
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/api-client.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "Usa apiClient de @/lib/api-client en lugar de fetch." },
      ],
    },
  },
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
