import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwind from "@tailwindcss/vite";

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
            whitespace: "preserve",
          },
        },
      }),
      tailwind(),
    ],
  };
});
