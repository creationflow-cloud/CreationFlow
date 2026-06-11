import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.pnpm-store/**",
      "adapters/woocommerce-plugin/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-console": "off",
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
  {
    files: ["apps/{admin,editor}/src/**/*.{ts,tsx}", "apps/{admin,editor}/vite.config.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "warn",
      "react-hooks/refs": "off",
    },
  },
  {
    files: ["apps/{api,renderer,worker}/src/**/*.ts", "eslint.config.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
);
