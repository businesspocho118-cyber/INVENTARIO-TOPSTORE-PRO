import { defineConfig, globalIgnores } from "eslint/config";
import nextJs from "eslint-config-next";
import nextTs from "eslint-config-next/typescript.js";

const eslintConfig = defineConfig([
  ...nextJs,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
