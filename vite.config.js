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
        lab: resolve(__dirname, "lab.html"),
        raspi: resolve(__dirname, "raspi.html"),
        esp32: resolve(__dirname, "esp32.html"),
        code: resolve(__dirname, "code.html"),
        adminDashboard: resolve(__dirname, "4meo/index.html"),
        adminUpload: resolve(__dirname, "4meo/upload.html"),
        adminEditor: resolve(__dirname, "4meo/editor.html"),
      },
    },
  },
});
