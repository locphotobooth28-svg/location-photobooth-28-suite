
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  root: "client",
  plugins: [
    react(),
VitePWA({
  registerType: "autoUpdate",
  includeAssets: ["logo.jpg"],

  workbox: {
    navigateFallback: "index.html",
    navigateFallbackDenylist: [
      /^\/api\//,
      /^\/auth\//
    ]
  },

  manifest: {
        name: "Location Photobooth 28 Suite",
        short_name: "LP28 Suite",
        description: "Espace événementiel Location Photobooth 28",
        theme_color: "#0b0b0c",
        background_color: "#0b0b0c",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/logo.jpg",
            sizes: "1024x683",
            type: "image/jpeg",
            purpose: "any"
          }
        ]
      }
    })
  ],
  build: {
    outDir: "../dist",
    emptyOutDir: true
  },
  server: {
    proxy: {
      "/api": "http://localhost:3000"
    }
  }
});
