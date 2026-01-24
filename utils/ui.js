(() => {
  const ensureToast = () => {
    let toast = document.querySelector(".toast-notify");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast-notify";
      document.body.appendChild(toast);
    }
    return toast;
  };

  let toastTimer = null;
  const showToast = (message, tone = "info") => {
    const toast = ensureToast();
    toast.textContent = message;
    toast.classList.remove("is-error", "is-success", "is-loading");
    if (tone === "error") toast.classList.add("is-error");
    if (tone === "success") toast.classList.add("is-success");
    toast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  };

  const openModal = (modal, backdrop) => {
    if (modal) modal.classList.remove("is-hidden");
    if (backdrop) backdrop.classList.remove("is-hidden");
  };

  const closeModal = (modal, backdrop) => {
    if (modal) modal.classList.add("is-hidden");
    if (backdrop) backdrop.classList.add("is-hidden");
  };

  window.showToast = showToast;
  window.openModal = openModal;
  window.closeModal = closeModal;
})();
