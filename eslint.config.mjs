import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

// Backend (Node.js) focused ESLint config
export default defineConfig([
  {
    files: ["**/*.{js,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    // Use CommonJS (script) for .js/.cjs by default; project has no "type": "module"
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: globals.node,
    },
    env: { node: true },
    rules: {
      // Allow using console for backend logging
      "no-console": "off",
      // Allow underscore dangle for common patterns (e.g., _id)
      "no-underscore-dangle": "off",
      // Allow calling hasOwnProperty/etc directly when needed in older code
      "no-prototype-builtins": "off",
    },
    ignorePatterns: ["node_modules/", "dist/", "coverage/"],
  },
  // If project ever uses ESM files (.mjs), enable module semantics for them
  {
    files: ["**/*.mjs"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    env: { node: true },
  },
]);
