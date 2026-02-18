import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  server: { port: 5173 },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        gallery: resolve(__dirname, "gallery.html"),
        fraktale: resolve(__dirname, "fraktale.html"),
        digitalart: resolve(__dirname, "digitalart.html"),
        fotos: resolve(__dirname, "fotos.html"),
        admin: resolve(__dirname, "4meo/index.html"),
      },
    },
  },
});
