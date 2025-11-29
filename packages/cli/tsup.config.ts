import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/bin.ts"],
  format: ["esm"],
  clean: true,
  publicDir: true,
  treeshake: "smallest",
  shims: true,
  splitting: false,
});
