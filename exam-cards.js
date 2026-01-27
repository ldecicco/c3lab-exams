(() => {
  const createEl = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  const getHasResults = (exam) => Boolean(exam.has_results || exam.hasResults);
  const isPublicAccessActive = (exam) => {
    const enabled = Boolean(exam.public_access_enabled ?? exam.publicAccessEnabled);
    if (!enabled) return false;
    const expiresAt = exam.public_access_expires_at || exam.publicAccessExpiresAt;
    if (!expiresAt) return true;
    const expiry = new Date(expiresAt);
    if (Number.isNaN(expiry.getTime())) return false;
    return expiry > new Date();
  };

  const render = (container, exams, options = {}) => {
    if (!container) return;
    const {
      filter,
      emptyText = "Nessuna traccia salvata.",
      dateFormatter,
      showStatus = true,
      statusLabel,
      actions,
      titleBuilder,
      metaBuilder,
      bandBadgesBuilder,
      onCardClick,
    } = options;

    const items = (exams || []).filter((exam) => (filter ? filter(exam) : true));
    container.innerHTML = "";
    if (!items.length) {
      container.textContent = emptyText;
      return;
    }

    items.forEach((exam) => {
      const hasResults = getHasResults(exam);
      const card = createEl("div", "exam-card");
      const band = createEl("div", "exam-card-band");
      const statsMap = options.stats || {};
      const examStats = exam.stats || statsMap[exam.id] || null;
      if (examStats && (examStats.studentsCount || examStats.avgNormalized !== null)) {
        const badges = createEl("div", "exam-card-badges");
        if (examStats.studentsCount) {
          const badge = createEl(
            "span",
            "exam-card-badge",
            `Valutati: ${examStats.studentsCount}`
          );
          badges.appendChild(badge);
        }
        if (examStats.avgNormalized !== null && examStats.avgNormalized !== undefined) {
          const badge = createEl(
            "span",
            "exam-card-badge",
            `Media: ${examStats.avgNormalized}/30`
          );
          badges.appendChild(badge);
        }
        band.appendChild(badges);
      }
      if (isPublicAccessActive(exam)) {
        const badges = band.querySelector(".exam-card-badges") || createEl("div", "exam-card-badges");
        const badge = createEl("span", "exam-card-badge is-access", "Accesso studenti attivo");
        badges.appendChild(badge);
        if (!band.contains(badges)) band.appendChild(badges);
      }
      if (typeof bandBadgesBuilder === "function") {
        const customBadges = bandBadgesBuilder(exam) || [];
        if (customBadges.length) {
          const badges =
            band.querySelector(".exam-card-badges") ||
            createEl("div", "exam-card-badges");
          customBadges.forEach((badge) => {
            if (!badge) return;
            const el = createEl("span", badge.className || "exam-card-badge", badge.label);
            badges.appendChild(el);
          });
          if (!band.contains(badges)) band.appendChild(badges);
        }
      }

      const body = createEl("div", "exam-card-body");
      const titleText =
        typeof titleBuilder === "function" ? titleBuilder(exam) : exam.title || "Traccia";
      const title = createEl("div", "exam-card-title", titleText);

      const defaultDate = exam.date
        ? (typeof dateFormatter === "function" ? dateFormatter(exam.date) : exam.date)
        : "data n/d";
      const defaultMeta = `${exam.course_name || "Corso"} • ${defaultDate} • ${
        exam.question_count || 0
      } domande`;
      const metaText = typeof metaBuilder === "function" ? metaBuilder(exam) : defaultMeta;
      const meta = createEl("div", "exam-card-meta", metaText);

      if (showStatus) {
        const label =
          typeof statusLabel === "function"
            ? statusLabel(exam)
            : exam.is_draft
              ? "Bozza"
              : hasResults
                ? "Chiusa con valutazione"
                : "Chiusa";
        const status = createEl("span", "exam-card-status", label);
        status.classList.toggle("is-draft", Boolean(exam.is_draft));
        status.classList.toggle("is-locked", !exam.is_draft && !hasResults);
        status.classList.toggle("is-graded", !exam.is_draft && hasResults);
        body.appendChild(title);
        body.appendChild(meta);
        body.appendChild(status);
      } else {
        body.appendChild(title);
        body.appendChild(meta);
      }

      const actionsWrap = createEl("div", "exam-card-actions");
      if (typeof actions === "function") {
        actions(exam).forEach((action) => {
          if (!action) return;
          const btn = createEl("button", action.className || "btn btn-outline-secondary btn-sm", action.label);
          btn.type = "button";
          if (action.hidden) btn.classList.add("is-hidden");
          if (action.disabled) btn.disabled = true;
          if (action.title) btn.title = action.title;
          if (typeof action.onClick === "function") {
            btn.addEventListener("click", (event) => {
              event.stopPropagation();
              action.onClick(event);
            });
          }
          actionsWrap.appendChild(btn);
        });
      }

      card.appendChild(band);
      card.appendChild(body);
      if (actionsWrap.childNodes.length) card.appendChild(actionsWrap);
      if (typeof onCardClick === "function") {
        card.addEventListener("click", () => onCardClick(exam));
      }
      container.appendChild(card);
    });
  };

  window.ExamCards = { render };
})();
