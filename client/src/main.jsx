
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import { installZipDownloads } from "./zipDownloads";
import { installGuestPermissionAdmin } from "./guestPermissionAdmin";
import { installGuestPortalRights } from "./guestPortalRights";
import { installContractFreshPdf } from "./contractFreshPdf";
import { installAdminPermissionsUi } from "./adminPermissionsUi";

installZipDownloads();
installGuestPermissionAdmin();
installGuestPortalRights();
installContractFreshPdf();
installAdminPermissionsUi();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
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
