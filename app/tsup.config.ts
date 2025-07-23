import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/express/index.ts"],
    target: "node21",
    platform: "node",
    format: ["cjs"],
    sourcemap: false,
    minify: true,
    external: ["@prisma/client", ".prisma/client"],
    dts: false,
    clean: true,
  },
]);
