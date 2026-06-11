import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // During `bun run dev`, proxy API calls to the Bun server.
    proxy: {
      "/api": "http://localhost:4319",
    },
  },
});
