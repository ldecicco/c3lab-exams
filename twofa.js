(() => {
  const status = document.getElementById("twoFaStatus");
  const startBtn = document.getElementById("twoFaStart");
  const verifyBtn = document.getElementById("twoFaVerify");
  const qrWrap = document.getElementById("twoFaQrWrap");
  const qrImg = document.getElementById("twoFaQr");
  const secretEl = document.getElementById("twoFaSecret");
  const codeInput = document.getElementById("twoFaCode");
  const error = document.getElementById("twoFaError");

  const showError = (message) => {
    if (error) error.textContent = message || "";
  };

  const getCsrfToken = () => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? String(meta.getAttribute("content") || "").trim() : "";
  };

  const withCsrfHeaders = (headers = {}) => {
    const token = getCsrfToken();
    if (!token) return headers;
    return { ...headers, "X-CSRF-Token": token };
  };

  if (startBtn) {
    startBtn.addEventListener("click", async () => {
      showError("");
      try {
        const res = await fetch("api/2fa/setup/start", {
          method: "POST",
          headers: withCsrfHeaders(),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Errore 2FA");
        if (qrWrap) qrWrap.classList.toggle("is-hidden", !data.qrCodeDataUrl);
        if (qrImg && data.qrCodeDataUrl) qrImg.src = data.qrCodeDataUrl;
        if (secretEl) secretEl.textContent = data.secret ? `Chiave: ${data.secret}` : "";
        if (status) status.textContent = "Scansiona il QR e inserisci il codice.";
        if (codeInput) codeInput.focus();
      } catch (err) {
        showError(err.message || "Errore 2FA");
      }
    });
  }

  if (verifyBtn) {
    verifyBtn.addEventListener("click", async () => {
      showError("");
      const token = String(codeInput?.value || "").trim();
      if (!token) {
        showError("Inserisci il codice.");
        return;
      }
      try {
        const res = await fetch("api/2fa/setup/verify", {
          method: "POST",
          headers: withCsrfHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Errore 2FA");
        window.location.href = "home";
      } catch (err) {
        showError(err.message || "Errore 2FA");
      }
    });
  }
})();
