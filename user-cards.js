(() => {
  const createEl = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  const render = (container, users, options = {}) => {
    if (!container) return;
    const { emptyText = "Nessun utente disponibile.", actions } = options;
    const items = users || [];
    container.innerHTML = "";
    if (!items.length) {
      container.textContent = emptyText;
      return;
    }

    items.forEach((user) => {
      const card = createEl("div", "exam-card user-card");
      const band = createEl("div", "exam-card-band");
      const badges = createEl("div", "exam-card-badges");
      if (user.role) {
        badges.appendChild(
          createEl("span", "exam-card-badge", user.role)
        );
      }
      if (badges.childNodes.length) band.appendChild(badges);
      const body = createEl("div", "exam-card-body");
      const title = createEl("div", "exam-card-title", user.username || "Utente");
      const meta = createEl(
        "div",
        "exam-card-meta",
        user.created_at ? `Creato: ${user.created_at}` : ""
      );
      body.appendChild(title);
      if (meta.textContent) body.appendChild(meta);

      const actionsWrap = createEl("div", "exam-card-actions");
      if (typeof actions === "function") {
        actions(user).forEach((action) => {
          if (!action) return;
          const btn = createEl(
            "button",
            action.className || "btn btn-outline-primary btn-sm",
            action.label
          );
          btn.type = "button";
          if (action.hidden) btn.classList.add("is-hidden");
          if (action.disabled) btn.disabled = true;
          if (action.title) btn.title = action.title;
          if (typeof action.onClick === "function") {
            btn.addEventListener("click", action.onClick);
          }
          actionsWrap.appendChild(btn);
        });
      }

      card.appendChild(band);
      card.appendChild(body);
      if (actionsWrap.childNodes.length) card.appendChild(actionsWrap);
      container.appendChild(card);
    });
  };

  window.UserCards = { render };
})();
