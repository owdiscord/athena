import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "url";

export default defineConfig((configEnv) => {
  return {
    resolve: {
      alias: [
        {
          find: /^@athena\/shared\/(.*)$/,
          replacement: fileURLToPath(
            new URL("../shared/src/$1.ts", import.meta.url),
          ),
        },
      ],
    },
    server: {
      port: 3002,
      host: "0.0.0.0",
      allowedHosts: true,
    },
    plugins: [
      vue({
        template: {
          compilerOptions: {
            // Needed to prevent hardcoded code blocks from breaking in docs
            whitespace: "preserve",
          },
        },
      }),
      tailwind(),
    ],
  };
});
