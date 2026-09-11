
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import { startBoothUsageWidget } from "./boothUsageWidget";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Le Dashboard React est rendu de façon asynchrone : on démarre le widget
// après le chargement de la page pour garantir que .stats-grid existe.
window.addEventListener("load", () => {
  startBoothUsageWidget();
});

// Secours pour les navigations internes SPA/PWA : si la page est déjà chargée,
// on démarre aussi le widget quelques instants après le premier rendu React.
window.setTimeout(() => {
  startBoothUsageWidget();
}, 1000);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("LP28 Service Worker actif :", registration.scope);
      })
      .catch((error) => {
        console.error("Erreur Service Worker LP28 :", error);
      });
  });
}