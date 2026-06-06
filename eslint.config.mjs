import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig([
  {
    ignores: [
      "**/.next/**", "**/node_modules/**", "**/dist/**", "**/build/**",
      "scripts/**", "**/*.js", "**/*.mjs", "*.mjs",
      ".eslintrc.json",
    ],
  },
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // === TypeScript 严格规则 ===
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", {
        prefer: "type-imports",
        fixStyle: "separate-type-imports",
      }],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/prefer-nullish-coalescing": ["error", { ignorePrimitives: { boolean: true } }],
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/no-shadow": "error",
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
      "@typescript-eslint/prefer-as-const": "error",
      "@typescript-eslint/no-inferrable-types": "error",
      "@typescript-eslint/no-array-delete": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/no-non-null-asserted-nullish-coalescing": "error",

      // === React Hooks 规则 ===
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/rules-of-hooks": "error",

      // === 通用代码质量 ===
      "no-console": ["error", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "eqeqeq": ["error", "always"],
      "no-throw-literal": "error",
      "no-implied-eval": "error",
      "no-var": "error",
      "prefer-rest-params": "error",
      "prefer-spread": "error",
      "no-duplicate-imports": "error",
      "no-self-compare": "error",

      // === 复杂度控制 ===
      "complexity": ["error", 15],
      "max-depth": ["error", 5],
      "max-nested-callbacks": ["error", 4],
      "max-params": ["error", 5],
      "max-lines": ["error", { max: 500, skipBlankLines: true, skipComments: true }],
    },
  },
  // parserOptions 需要为 @typescript-eslint/no-floating-promises 提供项目服务
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]);
