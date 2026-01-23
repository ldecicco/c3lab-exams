(() => {
  const form = document.getElementById("loginForm");
  const error = document.getElementById("loginError");
  const otpField = document.getElementById("otpField");
  if (!form || !error) return;
  let pendingToken = "";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    if (pendingToken) {
      const res = await fetch("auth/login-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempToken: pendingToken,
          otp: form.otp?.value?.trim() || "",
        }),
      });
      if (!res.ok) {
        const info = await res.json().catch(() => ({}));
        error.textContent = info.error || "Codice non valido";
        return;
      }
      window.location.href = "home";
      return;
    }
    const body = {
      username: form.username.value.trim(),
      password: form.password.value,
    };
    const res = await fetch("auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const info = await res.json().catch(() => ({}));
      error.textContent = info.error || "Login fallito";
      return;
    }
    const info = await res.json().catch(() => ({}));
    if (info.requiresOtp) {
      pendingToken = info.tempToken || "";
      if (otpField) otpField.classList.remove("is-hidden");
      form.otp?.focus?.();
      form.password.disabled = true;
      form.username.disabled = true;
      const submitBtn = form.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.textContent = "Verifica";
      return;
    }
    window.location.href = "home";
  });
})();
