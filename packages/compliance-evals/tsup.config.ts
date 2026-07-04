import { defineConfig } from "tsup";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// esbuild strips the node: prefix from node:sqlite when externalizing for CJS output.
// Patch the compiled CJS file after build to restore the correct specifier.
async function patchNodeSqliteCjs() {
  const cjsPath = resolve("dist/index.cjs");
  const src = await readFile(cjsPath, "utf8");
  const patched = src.replace(/require\("sqlite"\)/g, 'require("node:sqlite")');
  if (patched !== src) await writeFile(cjsPath, patched);
}

// Same for ESM — esbuild strips node: in import declarations too
async function patchNodeSqliteEsm() {
  const esmPath = resolve("dist/index.js");
  const src = await readFile(esmPath, "utf8");
  const patched = src.replace(/from "sqlite"/g, 'from "node:sqlite"');
  if (patched !== src) await writeFile(esmPath, patched);
}

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["node:sqlite", "@anthropic-ai/sdk"],
  async onSuccess() {
    await Promise.all([patchNodeSqliteCjs(), patchNodeSqliteEsm()]);
  },
});
