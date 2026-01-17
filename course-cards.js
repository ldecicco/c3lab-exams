(() => {
  const createEl = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  const render = (container, courses, options = {}) => {
    if (!container) return;
    const { emptyText = "Nessun corso disponibile.", actions, activeId } = options;
    const items = courses || [];
    container.innerHTML = "";
    if (!items.length) {
      container.textContent = emptyText;
      return;
    }

    items.forEach((course) => {
      const card = createEl(
        "div",
        activeId === course.id ? "exam-card is-active" : "exam-card"
      );
      const band = createEl("div", "exam-card-band");
      const badges = createEl("div", "exam-card-badges");
      const examsCount = Number(course.exams_count || 0);
      const studentsCount = Number(course.students_count || 0);
      const avgNormalized = course.avg_normalized;
      if (examsCount) {
        badges.appendChild(
          createEl("span", "exam-card-badge", `Tracce: ${examsCount}`)
        );
      }
      if (studentsCount) {
        badges.appendChild(
          createEl("span", "exam-card-badge", `Valutati: ${studentsCount}`)
        );
      }
      if (avgNormalized !== null && avgNormalized !== undefined) {
        badges.appendChild(
          createEl("span", "exam-card-badge", `Media: ${avgNormalized}/30`)
        );
      }
      if (badges.childNodes.length) band.appendChild(badges);
      const body = createEl("div", "exam-card-body");
      const title = createEl("div", "exam-card-title", course.name || "Corso");
      const meta = createEl(
        "div",
        "exam-card-meta",
        course.code ? `Codice: ${course.code}` : "Codice non disponibile"
      );
      const actionsWrap = createEl("div", "exam-card-actions");
      body.appendChild(title);
      body.appendChild(meta);
      if (typeof actions === "function") {
        actions(course).forEach((action) => {
          if (!action) return;
          const btn = createEl("button", action.className || "btn btn-outline-primary btn-sm", action.label);
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

  window.CourseCards = { render };
})();
