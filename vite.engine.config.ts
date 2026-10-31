import { defineConfig } from "vite";
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "public/runtime",
    emptyOutDir: true,
    lib: {
      entry: "src/worker-runtime.ts",
      name: "JustPlayEngine",
      formats: ["iife"],
      fileName: () => "engine.js",
    },
    minify: "esbuild",
    target: "es2022",
  },
});
