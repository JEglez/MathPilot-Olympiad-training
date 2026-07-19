import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      "/api": {
        target: "https://omm-mathpilot-api.azurewebsites.net",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
