import { defineConfig, globalIgnores } from "eslint/config";
import nextJs from "eslint-config-next";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextJs,
  ...nextTs,
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
