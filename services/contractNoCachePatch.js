const express = require("express");

function install() {
  const originalResponseSend = express.response.send;

  if (originalResponseSend.__lp28ContractNoCache) return;

  function sendWithContractNoCache(body) {
    const req = this.req;
    const pathname = String(req?.path || req?.originalUrl || "").split("?")[0];

    if (pathname.endsWith("/contract.pdf")) {
      this.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
      this.setHeader("Pragma", "no-cache");
      this.setHeader("Expires", "0");
      this.setHeader("Surrogate-Control", "no-store");
    }

    return originalResponseSend.call(this, body);
  }

  sendWithContractNoCache.__lp28ContractNoCache = true;
  express.response.send = sendWithContractNoCache;
}

module.exports = { install };
