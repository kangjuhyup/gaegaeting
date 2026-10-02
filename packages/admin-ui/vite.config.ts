import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: '/admin/',
  plugins: [react(), {
    name: 'development-runtime-config',
    configureServer(server) {
      server.middlewares.use('/admin/config.js', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript');
        res.end('// Runtime configuration is supplied by the container in deployment.');
      });
    },
  }],
  build: { rollupOptions: { external: ["/admin/config.js"] } },
  server: {
    port: 5174,
    proxy: {
      "/local-auth": {
        target: process.env.VITE_AUTH_ORIGIN ?? new URL(process.env.VITE_OIDC_ISSUER ?? "http://localhost:3010").origin,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/local-auth/, ""),
      },
    },
  },
  preview: { port: 4174 },
});
