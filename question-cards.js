(() => {
  const createEl = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  const normalizeQuestion = (question) => ({
    text: question.text || "",
    note: question.note || "",
    image:
      question.image ||
      question.imagePath ||
      question.image_path ||
      "",
    imageThumbnail:
      question.imageThumbnail ||
      question.imageThumbnailPath ||
      question.image_thumbnail_path ||
      "",
    imageLayoutEnabled: Boolean(
      question.imageLayoutEnabled ?? question.image_layout_enabled ?? false
    ),
    imageLayoutMode:
      question.imageLayoutMode ||
      question.image_layout_mode ||
      "side",
    answers: Array.isArray(question.answers) ? question.answers : [],
  });

  const renderPreview = (container, question, options = {}) => {
    if (!container || !question) return;
    const renderMath =
      typeof options.renderMath === "function"
        ? options.renderMath
        : (text, target) => {
            if (target) target.textContent = text;
          };
    const answersMode = options.answersMode || "full";
    const {
      text,
      note,
      image,
      imageThumbnail,
      imageLayoutEnabled,
      imageLayoutMode,
      answers,
    } = normalizeQuestion(question);

    container.innerHTML = "";
    const textBlock = createEl("div", "selected-question-text");
    renderMath(text, textBlock);
    container.appendChild(textBlock);

    if (note) {
      const noteWrap = createEl("div", "public-question-note");
      noteWrap.innerHTML = "<strong>Nota:</strong>";
      const noteBody = createEl("div", "public-question-note-body");
      renderMath(note, noteBody);
      noteWrap.appendChild(noteBody);
      container.appendChild(noteWrap);
    }

    const trimmedAnswers = answers.filter(
      (ans) => String(ans.text || "").trim() !== ""
    );
    if (!trimmedAnswers.length) return;
    const list = createEl("div", "selected-question-answers");
    trimmedAnswers.forEach((answer, idx) => {
      const row = createEl("div", "selected-question-answer");
      const label = createEl("span", "selected-preview-answer-label", `${idx + 1}.`);
      const textEl = createEl("span", "selected-preview-answer-text");
      renderMath(answer.text || "", textEl);
      row.appendChild(label);
      row.appendChild(textEl);
      if (answer.note) {
        const noteWrap = createEl("div", "selected-answer-note");
        noteWrap.innerHTML = "<strong>Nota:</strong>";
        const noteBody = createEl("div", "selected-answer-note-body");
        renderMath(answer.note || "", noteBody);
        noteWrap.appendChild(noteBody);
        row.appendChild(noteWrap);
      }
      if (answer.isCorrect || answer.correct || answer.is_correct) {
        const tick = createEl("span", "answer-tick");
        tick.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.4-1.4z"/></svg>';
        row.appendChild(tick);
      }
      list.appendChild(row);
    });

    let answersNode = list;
    if (answersMode === "accordion") {
      const details = document.createElement("details");
      details.className = "answer-accordion";
      const summary = document.createElement("summary");
      summary.textContent = `Risposte (${trimmedAnswers.length})`;
      details.appendChild(summary);
      details.appendChild(list);
      answersNode = details;
    }

    const previewSrc = imageThumbnail || image;
    if (imageLayoutEnabled && previewSrc) {
      const imgWrap = createEl("div", "selected-question-image");
      const img = createEl("img", "selected-preview-thumb");
      img.src = previewSrc;
      img.alt = image || previewSrc;
      imgWrap.appendChild(img);
      if (imageLayoutMode === "side") {
        const split = createEl("div", "selected-question-split");
        split.appendChild(imgWrap);
        split.appendChild(answersNode);
        container.appendChild(split);
      } else {
        container.appendChild(imgWrap);
        container.appendChild(answersNode);
      }
      return;
    }
    container.appendChild(answersNode);
  };

  const renderBankCard = (question, options = {}) => {
    const createButton = (action) => {
      const btn = createEl("button", action.className || "btn btn-outline-secondary btn-sm", action.label);
      btn.type = "button";
      if (action.title) btn.title = action.title;
      if (action.disabled) btn.disabled = true;
      if (typeof action.onClick === "function") {
        btn.addEventListener("click", action.onClick);
      }
      return btn;
    };

    const normalized = normalizeQuestion(question);
    const formatDate =
      typeof options.formatDate === "function"
        ? options.formatDate
        : typeof window.formatDateDisplay === "function"
          ? window.formatDateDisplay
          : (value) => value;
    const renderMath =
      typeof options.renderMath === "function"
        ? options.renderMath
        : (text, target) => {
            if (target) target.textContent = text;
          };
    const actionsBuilder = typeof options.actions === "function" ? options.actions : () => [];
    const answersMode = options.answersMode || "accordion";

    const item = createEl("div", "list-item question-bank-card");
    const band = createEl("div", "question-card-band");
    const badgeRow = createEl("div", "chip-row");
    const typeChip = createEl(
      "span",
      "chip chip-action",
      question.type === "multipla" ? "Multipla" : "Singola"
    );
    badgeRow.appendChild(typeChip);

    const isLocked = Boolean(question.is_locked);
    const isUsed = Boolean(question.is_used);
    if (isLocked) {
      badgeRow.appendChild(createEl("span", "chip is-warning", "In uso (chiusa)"));
    }
    if (normalized.image) {
      badgeRow.appendChild(createEl("span", "chip chip-action", "Immagine"));
    }
    if (question.last_exam_title || question.last_exam_date) {
      const dateLabel = question.last_exam_date
        ? formatDate(question.last_exam_date)
        : "";
      const titleLabel = question.last_exam_title || "Esame";
      const label = dateLabel ? `${titleLabel} · ${dateLabel}` : titleLabel;
      badgeRow.appendChild(createEl("span", "chip chip-action", `Usata: ${label}`));
    }
    band.appendChild(badgeRow);

    const content = createEl("div", "question-card-content");
    const preview = createEl("div", "bank-question-preview");
    renderPreview(
      preview,
      {
        ...question,
        ...normalized,
        imageLayoutEnabled: Boolean(question.image_layout_enabled ?? question.imageLayoutEnabled),
        imageLayoutMode: question.image_layout_mode || question.imageLayoutMode || normalized.imageLayoutMode,
      },
      { renderMath, answersMode }
    );

    const meta = createEl("div", "list-meta");
    if (question.topics && question.topics.length) {
      question.topics.forEach((topic) => {
        meta.appendChild(createEl("span", "chip chip-action", topic));
      });
    } else {
      meta.textContent = "Nessun argomento";
    }

    const actions = createEl("div", "list-actions");
    actionsBuilder(question, { isLocked, isUsed }).forEach((action) => {
      actions.appendChild(createButton(action));
    });

    content.appendChild(preview);
    content.appendChild(meta);
    content.appendChild(actions);
    item.appendChild(band);
    item.appendChild(content);
    return item;
  };

  window.QuestionCards = { renderPreview, renderBankCard };
})();
