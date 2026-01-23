(() => {
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta) {
    const token = meta.getAttribute("content");
    if (token) {
      const originalFetch = window.fetch;
      window.fetch = function (resource, options = {}) {
        const opts = options || {};
        const method = String(opts.method || "GET").toUpperCase();
        const url = typeof resource === "string" ? resource : resource?.url || "";
        let sameOrigin = true;
        if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
          try {
            const parsed = new URL(url);
            sameOrigin = parsed.origin === window.location.origin;
          } catch {
            sameOrigin = false;
          }
        }
        if (sameOrigin && !["GET", "HEAD", "OPTIONS"].includes(method)) {
          if (opts.headers instanceof Headers) {
            if (!opts.headers.has("X-CSRF-Token")) {
              opts.headers.set("X-CSRF-Token", token);
            }
          } else {
            opts.headers = opts.headers || {};
            if (!("X-CSRF-Token" in opts.headers)) {
              opts.headers["X-CSRF-Token"] = token;
            }
          }
        }
        return originalFetch(resource, opts);
      };
    }
  }
})();

(() => {
  const toggle = document.getElementById("navCourseToggle");
  const dropdown = document.getElementById("navCourseDropdown");
  const menu = document.querySelector(".nav-chip-menu");
  if (!toggle || !dropdown || !menu) return;
  let loaded = false;
  const activeId = Number(menu.dataset.activeCourseId || "");

  const close = () => {
    dropdown.classList.add("is-hidden");
    toggle.setAttribute("aria-expanded", "false");
  };

  const render = (courses) => {
    dropdown.innerHTML = "";
    if (!courses.length) {
      const empty = document.createElement("div");
      empty.className = "nav-chip-empty";
      empty.textContent = "Nessun corso disponibile.";
      dropdown.appendChild(empty);
      return;
    }
    courses.forEach((course) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "nav-chip-item";
      item.textContent = course.name || "Corso";
      if (Number(course.id) === activeId) {
        item.classList.add("is-active");
      }
      item.addEventListener("click", async () => {
        try {
          await fetch("api/session/course", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ courseId: course.id }),
          });
          window.location.reload();
        } catch {
          close();
        }
      });
      dropdown.appendChild(item);
    });
  };

  const open = async () => {
    dropdown.classList.remove("is-hidden");
    toggle.setAttribute("aria-expanded", "true");
    if (loaded) return;
    try {
      const res = await fetch("api/courses");
      const payload = await res.json();
      render(payload.courses || []);
    } catch {
      render([]);
    }
    loaded = true;
  };

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (dropdown.classList.contains("is-hidden")) {
      open();
    } else {
      close();
    }
  });

  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target)) close();
  });
})();

(() => {
  const openButton = document.getElementById("navAvatarButton");
  const modal = document.getElementById("avatarModal");
  const backdrop = document.getElementById("avatarBackdrop");
  const closeButton = document.getElementById("avatarClose");
  const cancelButton = document.getElementById("avatarCancel");
  const fileInput = document.getElementById("avatarFileInput");
  const cropContainer = document.getElementById("avatarCropContainer");
  const cropImage = document.getElementById("avatarCropImage");
  const saveButton = document.getElementById("avatarSave");
  const preview = document.getElementById("avatarPreview");
  const passwordBackdrop = document.getElementById("passwordBackdrop");
  const passwordModal = document.getElementById("passwordModal");
  const passwordClose = document.getElementById("passwordClose");
  const passwordCancel = document.getElementById("passwordCancel");
  const passwordSave = document.getElementById("passwordSave");
  const passwordCurrent = document.getElementById("passwordCurrent");
  const passwordNew = document.getElementById("passwordNew");
  const passwordConfirm = document.getElementById("passwordConfirm");
  const passwordError = document.getElementById("passwordError");
  const openPasswordModal = document.getElementById("openPasswordModal");
  const openTwoFaModal = document.getElementById("openTwoFaModal");
  const twoFaBackdrop = document.getElementById("twoFaBackdrop");
  const twoFaModal = document.getElementById("twoFaModal");
  const twoFaClose = document.getElementById("twoFaClose");
  const twoFaCancel = document.getElementById("twoFaCancel");
  const twoFaStatus = document.getElementById("twoFaStatus");
  const twoFaStart = document.getElementById("twoFaStart");
  const twoFaVerify = document.getElementById("twoFaVerify");
  const twoFaDisable = document.getElementById("twoFaDisable");
  const twoFaError = document.getElementById("twoFaError");
  const twoFaSetupSection = document.getElementById("twoFaSetupSection");
  const twoFaDisableSection = document.getElementById("twoFaDisableSection");
  const twoFaQrWrap = document.getElementById("twoFaQrWrap");
  const twoFaQr = document.getElementById("twoFaQr");
  const twoFaSecret = document.getElementById("twoFaSecret");
  const twoFaCode = document.getElementById("twoFaCode");
  const twoFaDisablePassword = document.getElementById("twoFaDisablePassword");
  const twoFaLock = document.getElementById("twoFaLock");
  const nav = document.querySelector(".top-nav");
  let twoFaEnabled = nav?.dataset?.totpEnabled === "true";
  if (!openButton || !modal || !backdrop || !fileInput || !cropImage || !saveButton || !preview)
    return;

  let cropper = null;
  let originalBase64 = "";
  let originalName = "";

  const showToast = (message, tone) => {
    if (typeof window.showToast === "function") {
      window.showToast(message, tone);
      return;
    }
    let toast = document.querySelector(".toast-notify");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast-notify";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove("is-error", "is-success");
    if (tone === "error") toast.classList.add("is-error");
    if (tone === "success") toast.classList.add("is-success");
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2400);
  };

  const loadCropper = (() => {
    let promise = null;
    return () => {
      if (window.Cropper) return Promise.resolve();
      if (promise) return promise;
      promise = new Promise((resolve, reject) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://cdn.jsdelivr.net/npm/cropperjs@1.6.2/dist/cropper.min.css";
        document.head.appendChild(link);
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/cropperjs@1.6.2/dist/cropper.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Cropper load failed"));
        document.body.appendChild(script);
      });
      return promise;
    };
  })();

  const openModal = () => {
    modal.classList.remove("is-hidden");
    backdrop.classList.remove("is-hidden");
  };

  const closeModal = () => {
    modal.classList.add("is-hidden");
    backdrop.classList.add("is-hidden");
  };

  const resetCropper = () => {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    cropContainer.classList.add("is-hidden");
    cropImage.src = "";
    fileInput.value = "";
    originalBase64 = "";
    originalName = "";
    saveButton.disabled = true;
  };

  const closePasswordModal = () => {
    if (passwordBackdrop) passwordBackdrop.classList.add("is-hidden");
    if (passwordModal) passwordModal.classList.add("is-hidden");
    if (passwordError) passwordError.textContent = "";
    if (passwordCurrent) passwordCurrent.value = "";
    if (passwordNew) passwordNew.value = "";
    if (passwordConfirm) passwordConfirm.value = "";
  };

  const openTwoFa = () => {
    if (twoFaBackdrop) twoFaBackdrop.classList.remove("is-hidden");
    if (twoFaModal) twoFaModal.classList.remove("is-hidden");
    if (twoFaError) twoFaError.textContent = "";
    if (twoFaCode) twoFaCode.value = "";
    if (twoFaDisablePassword) twoFaDisablePassword.value = "";
    if (twoFaQrWrap) twoFaQrWrap.classList.add("is-hidden");
    if (twoFaSecret) twoFaSecret.textContent = "";
    if (twoFaSetupSection) twoFaSetupSection.classList.add("is-hidden");
    updateTwoFaView();
  };

  const closeTwoFa = () => {
    if (twoFaBackdrop) twoFaBackdrop.classList.add("is-hidden");
    if (twoFaModal) twoFaModal.classList.add("is-hidden");
    if (twoFaError) twoFaError.textContent = "";
  };

  const updateTwoFaView = () => {
    if (twoFaStatus) {
      twoFaStatus.textContent = twoFaEnabled
        ? "2FA attivo: richiesto al login."
        : "2FA non attivo.";
    }
    if (twoFaDisableSection) {
      twoFaDisableSection.classList.toggle("is-hidden", !twoFaEnabled);
    }
    if (twoFaStart) {
      twoFaStart.disabled = twoFaEnabled;
    }
    if (twoFaSetupSection) {
      if (twoFaEnabled) {
        twoFaSetupSection.classList.add("is-hidden");
      }
    }
    if (twoFaLock) {
      twoFaLock.classList.toggle("is-hidden", twoFaEnabled);
    }
  };

  if (openPasswordModal) {
    openPasswordModal.addEventListener("click", () => {
      if (passwordBackdrop) passwordBackdrop.classList.remove("is-hidden");
      if (passwordModal) passwordModal.classList.remove("is-hidden");
    });
  }
  if (openTwoFaModal) openTwoFaModal.addEventListener("click", openTwoFa);
  if (twoFaClose) twoFaClose.addEventListener("click", closeTwoFa);
  if (twoFaCancel) twoFaCancel.addEventListener("click", closeTwoFa);
  if (twoFaBackdrop) {
    twoFaBackdrop.addEventListener("click", (event) => {
      if (event.target === twoFaBackdrop) closeTwoFa();
    });
  }
  if (passwordClose) passwordClose.addEventListener("click", closePasswordModal);
  if (passwordCancel) passwordCancel.addEventListener("click", closePasswordModal);
  if (passwordBackdrop) {
    passwordBackdrop.addEventListener("click", (event) => {
      if (event.target === passwordBackdrop) closePasswordModal();
    });
  }
  if (passwordSave) {
    passwordSave.addEventListener("click", async () => {
      if (passwordError) passwordError.textContent = "";
      const current = String(passwordCurrent?.value || "");
      const next = String(passwordNew?.value || "");
      const confirm = String(passwordConfirm?.value || "");
      if (!current || !next || !confirm) {
        if (passwordError) passwordError.textContent = "Compila tutti i campi.";
        return;
      }
      if (next.length < 8 || !/\d/.test(next)) {
        if (passwordError) {
          passwordError.textContent = "La nuova password deve avere almeno 8 caratteri e un numero.";
        }
        return;
      }
      if (next !== confirm) {
        if (passwordError) passwordError.textContent = "Le password non coincidono.";
        return;
      }
      try {
        const res = await fetch("api/users/me/password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword: current, newPassword: next }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Errore aggiornamento password");
        }
        showToast("Password aggiornata.", "success");
        closePasswordModal();
      } catch (err) {
        if (passwordError) passwordError.textContent = err.message || "Errore aggiornamento password.";
      }
    });
  }

  if (twoFaStart) {
    twoFaStart.addEventListener("click", async () => {
      if (twoFaError) twoFaError.textContent = "";
      try {
        const res = await fetch("api/2fa/setup/start", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Errore 2FA");
        if (twoFaSetupSection) twoFaSetupSection.classList.remove("is-hidden");
        if (twoFaQrWrap) twoFaQrWrap.classList.toggle("is-hidden", !data.qrCodeDataUrl);
        if (twoFaQr && data.qrCodeDataUrl) twoFaQr.src = data.qrCodeDataUrl;
        if (twoFaSecret) twoFaSecret.textContent = data.secret ? `Chiave: ${data.secret}` : "";
        if (twoFaCode) twoFaCode.focus();
      } catch (err) {
        if (twoFaError) twoFaError.textContent = err.message || "Errore 2FA";
      }
    });
  }

  if (twoFaVerify) {
    twoFaVerify.addEventListener("click", async () => {
      if (twoFaError) twoFaError.textContent = "";
      const token = String(twoFaCode?.value || "").trim();
      if (!token) {
        if (twoFaError) twoFaError.textContent = "Inserisci il codice.";
        return;
      }
      try {
        const res = await fetch("api/2fa/setup/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Errore 2FA");
        twoFaEnabled = true;
        if (nav) nav.dataset.totpEnabled = "true";
        updateTwoFaView();
        showToast("2FA attivo.", "success");
        if (twoFaSetupSection) twoFaSetupSection.classList.add("is-hidden");
      } catch (err) {
        if (twoFaError) twoFaError.textContent = err.message || "Errore 2FA";
      }
    });
  }

  if (twoFaDisable) {
    twoFaDisable.addEventListener("click", async () => {
      if (twoFaError) twoFaError.textContent = "";
      const password = String(twoFaDisablePassword?.value || "");
      if (!password) {
        if (twoFaError) twoFaError.textContent = "Inserisci la password.";
        return;
      }
      try {
        const res = await fetch("api/2fa/disable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Errore 2FA");
        twoFaEnabled = false;
        if (nav) nav.dataset.totpEnabled = "false";
        updateTwoFaView();
        showToast("2FA disattivato.", "success");
      } catch (err) {
        if (twoFaError) twoFaError.textContent = err.message || "Errore 2FA";
      }
    });
  }

  if (twoFaLock) {
    twoFaLock.classList.add("is-hidden");
  }

  const updatePreview = (dataUrl) => {
    preview.innerHTML = "";
    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = "";
    preview.appendChild(img);
  };

  openButton.addEventListener("click", () => {
    openModal();
  });

  [backdrop, closeButton, cancelButton].forEach((el) => {
    if (!el) return;
    el.addEventListener("click", () => {
      closeModal();
      resetCropper();
    });
  });

  fileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    originalName = file.name;
    const reader = new FileReader();
    reader.onload = async () => {
      originalBase64 = String(reader.result || "");
      cropImage.src = originalBase64;
      cropContainer.classList.remove("is-hidden");
      saveButton.disabled = false;
      try {
        await loadCropper();
      } catch (err) {
        showToast("Impossibile caricare il cropper.", "error");
        return;
      }
      if (cropper) cropper.destroy();
      cropper = new window.Cropper(cropImage, {
        aspectRatio: 1,
        viewMode: 1,
        autoCropArea: 1,
        background: false,
        responsive: true,
        crop: () => {
          if (!cropper) return;
          const canvas = cropper.getCroppedCanvas({ width: 256, height: 256 });
          updatePreview(canvas.toDataURL("image/png"));
        },
      });
    };
    reader.readAsDataURL(file);
  });

  saveButton.addEventListener("click", async () => {
    if (!cropper || !originalBase64) return;
    try {
      const croppedBase64 = cropper
        .getCroppedCanvas({ width: 256, height: 256 })
        .toDataURL("image/png");
      const res = await fetch("api/users/me/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalBase64, croppedBase64, originalName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Errore upload avatar");
      }
      const avatarImg = document.querySelector(".nav-avatar-image");
      const avatarInitials = document.querySelector(".nav-avatar-initials");
      if (avatarImg && data.avatar_thumb_path) {
        avatarImg.src = `/${String(data.avatar_thumb_path).replace(/^\/+/, "")}`;
        avatarImg.classList.remove("is-hidden");
      }
      if (avatarInitials) {
        avatarInitials.classList.add("is-hidden");
      }
      showToast("Foto profilo aggiornata.", "success");
      closeModal();
      resetCropper();
    } catch (err) {
      showToast(err.message || "Errore upload avatar.", "error");
    }
  });
})();
