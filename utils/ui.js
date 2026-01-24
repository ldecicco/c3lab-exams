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

  const bindModal = ({
    modal,
    backdrop,
    openers = [],
    closers = [],
    onOpen,
    onClose,
    closeOnEsc = true,
    focusSelector = "button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])",
  } = {}) => {
    let lastActive = null;
    let escHandler = null;

    const open = () => {
      lastActive = document.activeElement;
      openModal(modal, backdrop);
      if (modal) {
        const focusTarget = modal.querySelector(focusSelector);
        if (focusTarget && typeof focusTarget.focus === "function") {
          focusTarget.focus();
        }
      }
      if (closeOnEsc) {
        escHandler = (event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            close();
          }
        };
        document.addEventListener("keydown", escHandler);
      }
      if (typeof onOpen === "function") onOpen();
    };
    const close = () => {
      closeModal(modal, backdrop);
      if (escHandler) {
        document.removeEventListener("keydown", escHandler);
        escHandler = null;
      }
      if (lastActive && typeof lastActive.focus === "function") {
        lastActive.focus();
      }
      if (typeof onClose === "function") onClose();
    };

    const openList = Array.isArray(openers) ? openers : [openers];
    const closeList = Array.isArray(closers) ? closers : [closers];

    openList.filter(Boolean).forEach((el) => el.addEventListener("click", open));
    closeList.filter(Boolean).forEach((el) => el.addEventListener("click", close));
    if (backdrop) backdrop.addEventListener("click", close);

    return { open, close };
  };

  window.showToast = showToast;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.bindModal = bindModal;
})();
