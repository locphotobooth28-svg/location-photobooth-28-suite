export function installContractFreshPdf() {
  if (window.__lp28ContractFreshPdfInstalled) return;
  window.__lp28ContractFreshPdfInstalled = true;

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!target) return;

      let url;
      try {
        url = new URL(target.href, window.location.origin);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin || !url.pathname.endsWith("/contract.pdf")) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      url.searchParams.set("_lp28", String(Date.now()));
      window.open(url.toString(), target.target || "_blank", "noopener,noreferrer");
    },
    true
  );

  const originalOpen = window.open.bind(window);
  window.open = function lp28FreshContractOpen(input, target, features) {
    try {
      const url = new URL(String(input || ""), window.location.origin);
      if (url.origin === window.location.origin && url.pathname.endsWith("/contract.pdf")) {
        url.searchParams.set("_lp28", String(Date.now()));
        return originalOpen(url.toString(), target, features);
      }
    } catch {
      // Laisser le comportement natif pour les autres URL.
    }
    return originalOpen(input, target, features);
  };
}
