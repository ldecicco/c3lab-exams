const adminCourseNewInput = document.getElementById("adminCourseNew");
const adminAddCourseBtn = document.getElementById("adminAddCourse");
const adminCourseList = document.getElementById("adminCourseList");
const adminCoursePicker = document.getElementById("adminCoursePicker");
const adminCourseEmpty = document.getElementById("adminCourseEmpty");
const adminEditorWrap = document.getElementById("adminEditorWrap");
const adminTopicCourseSelect = document.getElementById("adminTopicCourse");
const adminTopicNewInput = document.getElementById("adminTopicNew");
const adminAddTopicBtn = document.getElementById("adminAddTopic");
const adminTopicList = document.getElementById("adminTopicList");
const adminImageCourseSelect = document.getElementById("adminImageCourse");
const adminImageNameInput = document.getElementById("adminImageName");
const adminImageDescriptionInput = document.getElementById("adminImageDescription");
const adminImageFileInput = document.getElementById("adminImageFile");
const adminUploadImageBtn = document.getElementById("adminUploadImage");
const adminImageStatus = document.getElementById("adminImageStatus");
const adminImageList = document.getElementById("adminImageList");
const bankCourseSelect = document.getElementById("bankCourse");
const bankTopicSelect = document.getElementById("bankTopic");
const bankSearchInput = document.getElementById("bankSearch");
const refreshBankBtn = document.getElementById("refreshBank");
const bankList = document.getElementById("bankList");
const adminQuestionType = document.getElementById("adminQuestionType");
const adminQuestionTopics = document.getElementById("adminQuestionTopics");
const adminPickImageBtn = document.getElementById("adminPickImage");
const adminQuestionText = document.getElementById("adminQuestionText");
const adminPreviewQuestion = document.getElementById("adminPreviewQuestion");
const adminPreviewAnswers = document.getElementById("adminPreviewAnswers");
const adminPreviewMeta = document.getElementById("adminPreviewMeta");
const adminPreviewImageWrap = document.getElementById("adminPreviewImageWrap");
const adminPreviewImage = document.getElementById("adminPreviewImage");
const adminPreviewImageMeta = document.getElementById("adminPreviewImageMeta");
const adminQuestionImageLayout = document.getElementById("adminQuestionImageLayout");
const adminQuestionLayoutFields = document.getElementById("adminQuestionLayoutFields");
const adminImageSplit = document.getElementById("adminImageSplit");
const adminImageSplitLabel = document.getElementById("adminImageSplitLabel");
const adminImageSplitPresets = document.getElementById("adminImageSplitPresets");
const adminImageSplitPreview = document.getElementById("adminImageSplitPreview");
const adminImageScaleRange = document.getElementById("adminImageScaleRange");
const adminImageScaleLabel = document.getElementById("adminImageScaleLabel");
const adminImageScalePresets = document.getElementById("adminImageScalePresets");
const adminAnswers = document.getElementById("adminAnswers");
const adminAddAnswerBtn = document.getElementById("adminAddAnswer");
const adminSaveQuestionBtn = document.getElementById("adminSaveQuestion");
const adminResetQuestionBtn = document.getElementById("adminResetQuestion");
const adminQuestionStatus = document.getElementById("adminQuestionStatus");
const adminEditBadge = document.getElementById("adminEditBadge");
const adminEditBadgeTop = document.getElementById("adminEditBadgeTop");
const adminQuestionError = document.getElementById("adminQuestionError");
const adminAnswersError = document.getElementById("adminAnswersError");
const toggleCoursesBtn = document.getElementById("toggleCourses");
const toggleTopicsBtn = document.getElementById("toggleTopics");
const toggleImagesBtn = document.getElementById("toggleImages");
const toggleUsersBtn = document.getElementById("toggleUsers");
const adminActionButtons = [toggleUsersBtn, toggleCoursesBtn, toggleTopicsBtn, toggleImagesBtn].filter(
  Boolean
);
const adminCoursesSection = document.getElementById("adminCoursesSection");
const adminTopicsSection = document.getElementById("adminTopicsSection");
const adminImagesSection = document.getElementById("adminImagesSection");
const adminUsersSection = document.getElementById("adminUsersSection");
const adminEmptyState = document.getElementById("adminEmptyState");
const adminUserNameInput = document.getElementById("adminUserName");
const adminUserPasswordInput = document.getElementById("adminUserPassword");
const adminUserRoleSelect = document.getElementById("adminUserRole");
const adminCreateUserBtn = document.getElementById("adminCreateUser");
const adminUserStatus = document.getElementById("adminUserStatus");
const adminUserList = document.getElementById("adminUserList");
const imagePickerBackdrop = document.getElementById("imagePickerBackdrop");
const imagePickerModal = document.getElementById("imagePickerModal");
const imagePickerCloseBtn = document.getElementById("imagePickerClose");
const imagePickerStatus = document.getElementById("imagePickerStatus");
const imagePickerList = document.getElementById("imagePickerList");
const imagePreviewBackdrop = document.getElementById("imagePreviewBackdrop");
const imagePreviewModal = document.getElementById("imagePreviewModal");
const imagePreviewCloseBtn = document.getElementById("imagePreviewClose");
const imagePreviewImg = document.getElementById("imagePreviewImg");
const imagePreviewMeta = document.getElementById("imagePreviewMeta");
const adminToolbarNew = document.getElementById("adminToolbarNew");
const adminToolbarDuplicate = document.getElementById("adminToolbarDuplicate");
const adminToolbarSave = document.getElementById("adminToolbarSave");
const adminToolbarReset = document.getElementById("adminToolbarReset");
const adminTemplateAnswers = document.getElementById("adminTemplateAnswers");
const adminPreviewRefresh = document.getElementById("adminPreviewRefresh");
const adminToolbarBank = document.getElementById("adminToolbarBank");
const bankModalBackdrop = document.getElementById("bankModalBackdrop");
const bankModal = document.getElementById("bankModal");
const bankModalClose = document.getElementById("bankModalClose");
const adminImageAccordion = document.getElementById("adminImageAccordion");
let editingQuestionId = null;
let topicOptions = [];
let userCache = [];

const updateQuestionTypePills = () => {
  if (!adminQuestionType) return;
  const pills = adminQuestionType.querySelectorAll(".radio-pill");
  pills.forEach((pill) => {
    const input = pill.querySelector('input[type="radio"]');
    pill.classList.toggle("is-selected", Boolean(input?.checked));
  });
};

const readSelectNumber = (select) => {
  const raw = select?.value;
  if (!raw) return Number.NaN;
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
};

const parseWidthToPercent = (value, fallback) => {
  const match = String(value || "").match(/([0-9.]+)\s*\\linewidth/);
  if (!match) return fallback;
  const ratio = Number.parseFloat(match[1]);
  if (!Number.isFinite(ratio)) return fallback;
  return Math.round(ratio * 100);
};

const formatWidthPercent = (percent) => {
  const ratio = (percent / 100).toFixed(2).replace(/\.?0+$/, "");
  return `${ratio}\\linewidth`;
};

const updateImageLayoutState = () => {
  const split = Number(adminImageSplit?.value || 50);
  const safeSplit = Number.isFinite(split) ? split : 50;
  const scale = Number(adminImageScaleRange?.value || 96);
  const safeScale = Number.isFinite(scale) ? scale : 96;
  const left = Math.min(Math.max(safeSplit, 30), 70);
  const right = 100 - left;
  adminQuestionState.imageLeft = formatWidthPercent(left);
  adminQuestionState.imageRight = formatWidthPercent(right);
  adminQuestionState.imageScale = formatWidthPercent(safeScale);
  if (adminImageSplitLabel) {
    adminImageSplitLabel.textContent = `Immagine ${left}% • Risposte ${right}%`;
  }
  if (adminImageScaleLabel) {
    adminImageScaleLabel.textContent = `${safeScale}% della colonna`;
  }
  if (adminImageSplitPreview) {
    const imageBlock = adminImageSplitPreview.querySelector(".layout-preview-image");
    const textBlock = adminImageSplitPreview.querySelector(".layout-preview-text");
    if (imageBlock) imageBlock.style.width = `${left}%`;
    if (textBlock) textBlock.style.width = `${right}%`;
  }
};

const apiFetch = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const info = await response.json().catch(() => ({}));
    const message = info.error || `Errore ${response.status}`;
    throw new Error(message);
  }
  return response.json();
};

const createEl = (tag, className, text) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Impossibile leggere il file"));
    reader.readAsDataURL(file);
  });

const isPreviewableImage = (filePath) => {
  const ext = String(filePath || "").split(".").pop().toLowerCase();
  return ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
};

const openImagePreview = (filePath, name, description) => {
  if (!imagePreviewModal || !imagePreviewBackdrop) return;
  if (imagePreviewImg) imagePreviewImg.src = filePath || "";
  if (imagePreviewImg) imagePreviewImg.alt = name || "Anteprima immagine";
  if (imagePreviewMeta) {
    const metaParts = [name, description].filter(Boolean);
    imagePreviewMeta.textContent = metaParts.join(" • ");
  }
  imagePreviewBackdrop.classList.remove("is-hidden");
  imagePreviewModal.classList.remove("is-hidden");
};

const closeImagePreview = () => {
  if (imagePreviewBackdrop) imagePreviewBackdrop.classList.add("is-hidden");
  if (imagePreviewModal) imagePreviewModal.classList.add("is-hidden");
  if (imagePreviewImg) imagePreviewImg.src = "";
};

const openBankModal = () => {
  if (bankModalBackdrop) bankModalBackdrop.classList.remove("is-hidden");
  if (bankModal) bankModal.classList.remove("is-hidden");
};

const closeBankModal = () => {
  if (bankModalBackdrop) bankModalBackdrop.classList.add("is-hidden");
  if (bankModal) bankModal.classList.add("is-hidden");
};

const showAdminSection = (section) => {
  const sections = [adminUsersSection, adminCoursesSection, adminTopicsSection, adminImagesSection];
  sections.forEach((item) => {
    if (!item) return;
    item.classList.toggle("is-hidden", item !== section);
  });
  if (adminEmptyState) {
    adminEmptyState.classList.toggle("is-hidden", Boolean(section));
  }
  adminActionButtons.forEach((btn) => btn.classList.remove("is-active"));
  if (section === adminUsersSection && toggleUsersBtn) toggleUsersBtn.classList.add("is-active");
  if (section === adminCoursesSection && toggleCoursesBtn) toggleCoursesBtn.classList.add("is-active");
  if (section === adminTopicsSection && toggleTopicsBtn) toggleTopicsBtn.classList.add("is-active");
  if (section === adminImagesSection && toggleImagesBtn) toggleImagesBtn.classList.add("is-active");
};

const renderImagePickerList = (images) => {
  if (!imagePickerList) return;
  imagePickerList.innerHTML = "";
  if (!images.length) {
    imagePickerList.textContent = "Nessuna immagine disponibile per il corso selezionato.";
    return;
  }
  images.forEach((image) => {
    const item = createEl("div", "image-item");
    const thumb = createEl("div", "image-thumb");
    const filePath = image.file_path || "";
    if (isPreviewableImage(filePath)) {
      const img = document.createElement("img");
      img.src = filePath;
      img.alt = image.name;
      img.addEventListener("click", () =>
        openImagePreview(filePath, image.name, image.description)
      );
      thumb.appendChild(img);
    } else {
      const extLabel = filePath.split(".").pop().toUpperCase() || "FILE";
      const fallback = createEl("div", "image-thumb-fallback", extLabel);
      thumb.appendChild(fallback);
    }
    const details = createEl("div", "image-details");
    const title = createEl("div", "list-title", image.name);
    const desc = createEl("div", "list-meta", image.description || "Nessuna descrizione");
    const actions = createEl("div", "list-actions");
    const selectBtn = createEl("button", "btn btn-outline-primary btn-sm", "Usa immagine");
    selectBtn.type = "button";
    selectBtn.addEventListener("click", () => {
      adminQuestionState.image = filePath;
      updateImagePickButton();
      updateAdminPreviews();
      if (adminQuestionStatus) adminQuestionStatus.textContent = "Immagine selezionata.";
      closeImagePicker();
    });
    actions.appendChild(selectBtn);
    details.appendChild(title);
    details.appendChild(desc);
    details.appendChild(actions);
    item.appendChild(thumb);
    item.appendChild(details);
    imagePickerList.appendChild(item);
  });
};

const updateImageFieldState = () => {
  const enabled = Boolean(adminQuestionImageLayout?.checked);
  if (adminPickImageBtn) adminPickImageBtn.disabled = !enabled;
  if (adminImageSplit) adminImageSplit.disabled = !enabled;
  if (adminImageScaleRange) adminImageScaleRange.disabled = !enabled;
  if (adminImageSplitPresets) {
    adminImageSplitPresets.querySelectorAll("button").forEach((btn) => {
      btn.disabled = !enabled;
    });
  }
  if (adminImageScalePresets) {
    adminImageScalePresets.querySelectorAll("button").forEach((btn) => {
      btn.disabled = !enabled;
    });
  }
};

const updateImagePickButton = () => {
  if (!adminPickImageBtn) return;
  const hasImage = Boolean(adminQuestionState.image);
  adminPickImageBtn.textContent = hasImage ? "Cambia immagine" : "Seleziona immagine";
  adminPickImageBtn.classList.toggle("btn-image-selected", hasImage);
};

const openImagePicker = async () => {
  const courseId = readSelectNumber(adminCoursePicker);
  if (!Number.isFinite(courseId)) {
    if (imagePickerStatus) imagePickerStatus.textContent = "Seleziona prima un corso.";
    if (imagePickerList) imagePickerList.innerHTML = "";
  } else {
    try {
      const payload = await apiFetch(`/api/images?courseId=${courseId}`);
      renderImagePickerList(payload.images || []);
      if (imagePickerStatus) imagePickerStatus.textContent = "";
    } catch (err) {
      if (imagePickerStatus) imagePickerStatus.textContent = err.message || "Errore caricamento immagini.";
    }
  }
  if (imagePickerBackdrop) imagePickerBackdrop.classList.remove("is-hidden");
  if (imagePickerModal) imagePickerModal.classList.remove("is-hidden");
};

const closeImagePicker = () => {
  if (imagePickerBackdrop) imagePickerBackdrop.classList.add("is-hidden");
  if (imagePickerModal) imagePickerModal.classList.add("is-hidden");
};

const renderMathPreview = (source, target, input) => {
  if (!target) return;
  const trimmed = String(source || "").trim();
  target.innerHTML = "";
  if (!trimmed) {
    if (input) input.classList.remove("input-error");
    return;
  }
  let latexRendered = false;
  if (window.latexjs && typeof window.latexjs.parse === "function") {
    try {
      const generator = window.latexjs.parse(trimmed, { strict: false });
      let html = "";
      if (typeof generator.htmlDocument === "function") {
        html = generator.htmlDocument();
      } else if (typeof generator.html === "function") {
        html = generator.html();
      } else if (typeof generator.toHTML === "function") {
        html = generator.toHTML();
      } else if (generator.html) {
        html = generator.html;
      }
      if (html) {
        const template = document.createElement("template");
        template.innerHTML = html;
        const body = template.content.querySelector("body");
        if (body) {
          target.append(...Array.from(body.childNodes));
        } else {
          target.append(...Array.from(template.content.childNodes));
        }
        latexRendered = true;
      }
    } catch {
      latexRendered = false;
    }
  }
  if (!latexRendered) {
    target.textContent = trimmed;
  }
  let mathError = false;
  if (typeof window.renderMathInElement === "function") {
    window.renderMathInElement(target, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
      throwOnError: false,
    });
    mathError = Boolean(target.querySelector(".katex-error"));
  }
  if (input) input.classList.toggle("input-error", mathError);
  return !mathError;
};

const renderMathDisplay = (source, target) => {
  if (!target) return;
  const trimmed = String(source || "").trim();
  target.innerHTML = "";
  if (!trimmed) return;
  let rendered = false;
  if (window.latexjs && typeof window.latexjs.parse === "function") {
    try {
      const generator = window.latexjs.parse(trimmed, { strict: false });
      let html = "";
      if (typeof generator.htmlDocument === "function") {
        html = generator.htmlDocument();
      } else if (typeof generator.html === "function") {
        html = generator.html();
      } else if (typeof generator.toHTML === "function") {
        html = generator.toHTML();
      } else if (generator.html) {
        html = generator.html;
      }
      if (html) {
        const template = document.createElement("template");
        template.innerHTML = html;
        const body = template.content.querySelector("body");
        if (body) {
          target.append(...Array.from(body.childNodes));
        } else {
          target.append(...Array.from(template.content.childNodes));
        }
        rendered = true;
      }
    } catch {
      rendered = false;
    }
  }
  if (!rendered) {
    target.textContent = trimmed;
  }
  if (typeof window.renderMathInElement !== "function") return;
  try {
    window.renderMathInElement(target, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
      throwOnError: false,
    });
  } catch {
    if (!rendered) target.textContent = trimmed;
  }
};

const normalizeDateToInput = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parts = raw.split(/[-/]/).map((p) => p.trim());
  if (parts.length !== 3) return raw;
  const [a, b, c] = parts;
  if (a.length === 4) {
    return `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
  }
  return `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
};

const formatDateDisplay = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const normalized = normalizeDateToInput(raw);
  const parts = normalized.split("-");
  if (parts.length !== 3) return raw;
  const [yyyy, mm, dd] = parts;
  return `${dd}-${mm}-${yyyy}`;
};

const updateAdminPreviews = () => {
  let questionOk = true;
  if (adminQuestionText && adminPreviewQuestion) {
    questionOk = renderMathPreview(
      adminQuestionText.value,
      adminPreviewQuestion,
      adminQuestionText
    );
  }
  if (adminPreviewMeta) {
    const typeLabel = adminQuestionState.type === "multipla" ? "Multipla" : "Singola";
    const answersCount = adminQuestionState.answers.length;
    adminPreviewMeta.textContent = `${typeLabel} • ${answersCount} risposte`;
  }
  if (adminPreviewImageWrap && adminPreviewImage) {
    const path = adminQuestionState.image || "";
    const showImage = Boolean(adminQuestionState.imageLayoutEnabled) && Boolean(path);
    if (showImage) {
      adminPreviewImageWrap.classList.remove("is-hidden");
      adminPreviewImage.src = path;
      adminPreviewImage.alt = "Anteprima immagine";
      if (adminPreviewImageMeta) {
        const name = path.split("/").pop() || path;
        adminPreviewImageMeta.textContent = name;
      }
    } else {
      adminPreviewImageWrap.classList.add("is-hidden");
      adminPreviewImage.src = "";
      if (adminPreviewImageMeta) adminPreviewImageMeta.textContent = "";
    }
  }
  if (adminPreviewAnswers) {
    adminPreviewAnswers.innerHTML = "";
    const inputs = adminAnswers?.querySelectorAll("input.form-control") || [];
    let answersOk = true;
    adminQuestionState.answers.forEach((answer, idx) => {
      const row = createEl("div", "preview-answer-row");
      const label = createEl("span", "preview-answer-label", `${idx + 1}.`);
      const text = createEl("div", "preview-answer-text");
      const inputEl = Array.from(inputs).find(
        (input) => Number(input.dataset.answerIndex) === idx
      );
      const ok = renderMathPreview(answer.text || "", text, inputEl || null);
      if (!ok && answer.text.trim() !== "") answersOk = false;
      row.appendChild(label);
      row.appendChild(text);
      if (answer.correct) {
        const tick = createEl("span", "answer-tick");
        tick.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.4-1.4z"/></svg>';
        row.appendChild(tick);
      }
      adminPreviewAnswers.appendChild(row);
    });
    if (adminAnswersError) {
      adminAnswersError.classList.toggle("is-hidden", answersOk);
    }
  }
  if (adminQuestionError) {
    const hasText = String(adminQuestionText?.value || "").trim() !== "";
    adminQuestionError.classList.toggle("is-hidden", questionOk || !hasText);
  }
};

const adminQuestionState = {
  type: "singola",
  text: "",
  topicIds: [],
  image: "",
  imageLayoutEnabled: false,
  imageLeft: "0.5\\linewidth",
  imageRight: "0.5\\linewidth",
  imageScale: "0.96\\linewidth",
  answers: [
    { text: "", correct: false },
    { text: "", correct: false },
    { text: "", correct: false },
    { text: "", correct: false },
  ],
};

const renderAdminAnswers = () => {
  if (!adminAnswers) return;
  adminAnswers.innerHTML = "";
  adminQuestionState.answers.forEach((answer, idx) => {
    const row = createEl("div", "answer-builder-admin");
    const check = createEl("input", "form-check-input");
    check.type = "checkbox";
    check.checked = Boolean(answer.correct);
    check.addEventListener("change", () => {
      if (adminQuestionState.type === "singola" && check.checked) {
        adminQuestionState.answers.forEach((a, i) => {
          a.correct = i === idx;
        });
        renderAdminAnswers();
      } else {
        adminQuestionState.answers[idx].correct = check.checked;
      }
    });
    const input = createEl("input", "form-control");
    input.type = "text";
    input.placeholder = "Testo risposta";
    input.value = answer.text;
    input.dataset.answerIndex = String(idx);
    input.addEventListener("input", () => {
      adminQuestionState.answers[idx].text = input.value;
      updateAdminPreviews();
    });
    const remove = createEl("button", "btn btn-outline-danger btn-sm", "Rimuovi");
    remove.type = "button";
    remove.addEventListener("click", () => {
      adminQuestionState.answers.splice(idx, 1);
      renderAdminAnswers();
    });
    row.appendChild(check);
    row.appendChild(input);
    row.appendChild(remove);
    adminAnswers.appendChild(row);
  });
  updateAdminPreviews();
};

const resetAdminQuestion = () => {
  editingQuestionId = null;
  adminQuestionState.type = "singola";
  adminQuestionState.text = "";
  adminQuestionState.topicIds = [];
  adminQuestionState.image = "";
  adminQuestionState.imageLayoutEnabled = false;
  adminQuestionState.imageLeft = "0.5\\linewidth";
  adminQuestionState.imageRight = "0.5\\linewidth";
  adminQuestionState.imageScale = "0.96\\linewidth";
  adminQuestionState.image = "";
  adminQuestionState.answers = [
    { text: "", correct: false },
    { text: "", correct: false },
    { text: "", correct: false },
    { text: "", correct: false },
  ];
  if (adminQuestionType) {
    const radio = adminQuestionType.querySelector('input[value="singola"]');
    if (radio) radio.checked = true;
  }
  updateQuestionTypePills();
  if (adminQuestionText) adminQuestionText.value = "";
  renderTopicOptions(topicOptions);
  adminQuestionState.image = "";
  if (adminQuestionImageLayout) adminQuestionImageLayout.checked = false;
  if (adminQuestionLayoutFields) adminQuestionLayoutFields.classList.add("is-hidden");
  if (adminImageSplit) adminImageSplit.value = "50";
  if (adminImageScaleRange) adminImageScaleRange.value = "96";
  updateImageLayoutState();
  updateImageFieldState();
  updateImagePickButton();
  updateImageLayoutState();
  if (adminImageAccordion) adminImageAccordion.open = false;
  renderAdminAnswers();
  updateAdminPreviews();
  if (adminSaveQuestionBtn) adminSaveQuestionBtn.textContent = "Salva nel banco";
  if (adminEditBadge) adminEditBadge.classList.add("is-hidden");
  if (adminEditBadgeTop) adminEditBadgeTop.classList.add("is-hidden");
};

const duplicateAdminQuestion = () => {
  if (!adminQuestionText) return;
  editingQuestionId = null;
  if (adminSaveQuestionBtn) adminSaveQuestionBtn.textContent = "Salva nel banco";
  if (adminEditBadge) adminEditBadge.classList.add("is-hidden");
  if (adminEditBadgeTop) adminEditBadgeTop.classList.add("is-hidden");
  if (adminQuestionStatus) adminQuestionStatus.textContent = "Duplica attiva: salva per creare una nuova domanda.";
  updateAdminPreviews();
};

const applyAnswerTemplate = () => {
  adminQuestionState.answers = [
    { text: "", correct: false },
    { text: "", correct: false },
    { text: "", correct: false },
    { text: "", correct: false },
  ];
  renderAdminAnswers();
  if (adminQuestionStatus) adminQuestionStatus.textContent = "Template risposte applicato.";
};

const renderSelectOptions = (select, items, placeholder) => {
  if (!select) return;
  select.innerHTML = "";
  if (placeholder) {
    const opt = createEl("option");
    opt.value = "";
    opt.textContent = placeholder;
    select.appendChild(opt);
  }
  items.forEach((item) => {
    const opt = createEl("option");
    opt.value = String(item.id);
    opt.textContent = item.name;
    select.appendChild(opt);
  });
};

const renderTopicOptions = (topics) => {
  if (!adminQuestionTopics) return;
  topicOptions = topics.map((topic) => ({ id: topic.id, name: topic.name }));
  adminQuestionTopics.innerHTML = "";
  topics.forEach((topic) => {
    const pill = createEl("button", "topic-pill", topic.name);
    pill.type = "button";
    pill.dataset.topicId = String(topic.id);
    if (adminQuestionState.topicIds.includes(topic.id)) {
      pill.classList.add("is-selected");
    }
    pill.addEventListener("click", () => {
      const id = Number(pill.dataset.topicId);
      if (adminQuestionState.topicIds.includes(id)) {
        adminQuestionState.topicIds = adminQuestionState.topicIds.filter((t) => t !== id);
        pill.classList.remove("is-selected");
      } else {
        adminQuestionState.topicIds.push(id);
        pill.classList.add("is-selected");
      }
      updateAdminPreviews();
    });
    adminQuestionTopics.appendChild(pill);
  });
};

const renderCourseList = (courses) => {
  if (!adminCourseList) return;
  adminCourseList.innerHTML = "";
  if (!courses.length) {
    adminCourseList.textContent = "Nessun corso presente.";
    return;
  }
  courses.forEach((course) => {
    const item = createEl("div", "list-item");
    const title = createEl("div", "list-title", course.name);
    const meta = createEl("div", "list-meta", course.code || "Codice n/d");
    const actions = createEl("div", "list-actions");
    const deleteBtn = createEl("button", "btn btn-outline-danger btn-sm", "Elimina");
    deleteBtn.type = "button";
    deleteBtn.addEventListener("click", () => deleteCourse(course.id));
    actions.appendChild(deleteBtn);
    item.appendChild(title);
    item.appendChild(meta);
    item.appendChild(actions);
    adminCourseList.appendChild(item);
  });
};

const renderTopicList = (topics) => {
  if (!adminTopicList) return;
  adminTopicList.innerHTML = "";
  if (!topics.length) {
    adminTopicList.textContent = "Nessun argomento presente.";
    return;
  }
  topics.forEach((topic) => {
    const item = createEl("div", "list-item");
    const title = createEl("div", "list-title", topic.name);
    const actions = createEl("div", "list-actions");
    const deleteBtn = createEl("button", "btn btn-outline-danger btn-sm", "Elimina");
    deleteBtn.type = "button";
    deleteBtn.addEventListener("click", () => deleteTopic(topic.id));
    actions.appendChild(deleteBtn);
    item.appendChild(title);
    item.appendChild(actions);
    adminTopicList.appendChild(item);
  });
};

const renderImageList = (images) => {
  if (!adminImageList) return;
  adminImageList.innerHTML = "";
  if (!images.length) {
    adminImageList.textContent = "Nessuna immagine presente.";
    return;
  }
  images.forEach((image) => {
    const item = createEl("div", "image-item");
    const thumb = createEl("div", "image-thumb");
    const filePath = image.file_path || "";
    if (isPreviewableImage(filePath)) {
      const img = document.createElement("img");
      img.src = filePath;
      img.alt = image.name;
      img.addEventListener("click", () =>
        openImagePreview(filePath, image.name, image.description)
      );
      thumb.appendChild(img);
    } else {
      const extLabel = filePath.split(".").pop().toUpperCase() || "FILE";
      const fallback = createEl("div", "image-thumb-fallback", extLabel);
      thumb.appendChild(fallback);
    }
    const details = createEl("div", "image-details");
    const title = createEl("div", "list-title", image.name);
    const desc = createEl(
      "div",
      "list-meta",
      image.description || "Nessuna descrizione"
    );
    const meta = createEl("div", "image-meta", image.original_name || filePath);
    const actions = createEl("div", "list-actions");
    const useBtn = createEl("button", "btn btn-outline-primary btn-sm", "Usa in domanda");
    useBtn.type = "button";
    useBtn.addEventListener("click", () => {
      adminQuestionState.image = image.file_path || "";
      updateImagePickButton();
      updateAdminPreviews();
      if (adminQuestionStatus) adminQuestionStatus.textContent = "Immagine impostata nella domanda.";
    });
    const delBtn = createEl("button", "btn btn-outline-danger btn-sm", "Elimina");
    delBtn.type = "button";
    delBtn.addEventListener("click", () => deleteImage(image.id));
    actions.appendChild(useBtn);
    actions.appendChild(delBtn);
    details.appendChild(title);
    details.appendChild(desc);
    details.appendChild(meta);
    details.appendChild(actions);
    item.appendChild(thumb);
    item.appendChild(details);
    adminImageList.appendChild(item);
  });
};

const renderBankList = (questions) => {
  if (!bankList) return;
  bankList.innerHTML = "";
  if (!questions.length) {
    bankList.textContent = "Nessuna domanda trovata.";
    return;
  }
  questions.forEach((question) => {
    const item = createEl("div", "list-item");
    const title = createEl("div", "list-title");
    renderMathDisplay(question.text.slice(0, 120), title);
    const dateLabel = question.last_exam_date
      ? ` • ${formatDateDisplay(question.last_exam_date)}`
      : "";
    const metaText = question.topics.length
      ? `${question.topics.join(", ")}${dateLabel}`
      : `Nessun argomento${dateLabel}`;
    const meta = createEl("div", "list-meta", metaText);
    const actions = createEl("div", "list-actions");
    const editBtn = createEl("button", "btn btn-outline-primary btn-sm", "Modifica");
    editBtn.type = "button";
    editBtn.addEventListener("click", () => loadQuestionForEdit(question.id));
    const dupBtn = createEl("button", "btn btn-outline-secondary btn-sm", "Duplica");
    dupBtn.type = "button";
    dupBtn.addEventListener("click", () => duplicateQuestion(question.id));
    const delBtn = createEl("button", "btn btn-outline-danger btn-sm", "Elimina");
    delBtn.type = "button";
    delBtn.addEventListener("click", () => deleteQuestion(question.id));
    actions.appendChild(editBtn);
    actions.appendChild(dupBtn);
    actions.appendChild(delBtn);
    item.appendChild(title);
    item.appendChild(meta);
    item.appendChild(actions);
    bankList.appendChild(item);
  });
};

const ADMIN_COURSE_STORAGE_KEY = "adminSelectedCourseId";

const getStoredAdminCourseId = () => {
  const raw = localStorage.getItem(ADMIN_COURSE_STORAGE_KEY);
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
};

const setStoredAdminCourseId = (courseId) => {
  if (!Number.isFinite(courseId)) {
    localStorage.removeItem(ADMIN_COURSE_STORAGE_KEY);
    return;
  }
  localStorage.setItem(ADMIN_COURSE_STORAGE_KEY, String(courseId));
};

const setActiveCourse = async (
  courseId,
  { persist = true, syncBank = true, resetTopics = true } = {}
) => {
  if (!Number.isFinite(courseId)) {
    if (adminCoursePicker) adminCoursePicker.value = "";
    if (adminTopicCourseSelect) adminTopicCourseSelect.value = "";
    if (adminImageCourseSelect) adminImageCourseSelect.value = "";
    if (bankCourseSelect) bankCourseSelect.value = "";
    renderSelectOptions(bankTopicSelect, [], "Tutti gli argomenti");
    renderTopicOptions([]);
    renderImageList([]);
    if (adminCourseEmpty) adminCourseEmpty.classList.remove("is-hidden");
    if (adminEditorWrap) adminEditorWrap.classList.add("is-hidden");
    return;
  }

  if (persist) setStoredAdminCourseId(courseId);
  if (adminCoursePicker && adminCoursePicker.value !== String(courseId)) {
    adminCoursePicker.value = String(courseId);
  }
  if (adminTopicCourseSelect && adminTopicCourseSelect.value !== String(courseId)) {
    adminTopicCourseSelect.value = String(courseId);
  }
  if (adminImageCourseSelect && adminImageCourseSelect.value !== String(courseId)) {
    adminImageCourseSelect.value = String(courseId);
  }
  if (syncBank && bankCourseSelect && bankCourseSelect.value !== String(courseId)) {
    bankCourseSelect.value = String(courseId);
  }
  if (resetTopics) {
    adminQuestionState.topicIds = [];
  }
  await loadQuestionTopics(courseId);
  await loadTopics(courseId, bankTopicSelect, "Tutti gli argomenti");
  await loadImages(courseId);
  if (syncBank) {
    await refreshQuestionBank();
  }
  if (adminCourseEmpty) adminCourseEmpty.classList.add("is-hidden");
  if (adminEditorWrap) adminEditorWrap.classList.remove("is-hidden");
};

const loadCourses = async () => {
  const payload = await apiFetch("/api/courses");
  const courses = payload.courses || [];
  renderSelectOptions(adminTopicCourseSelect, courses, "Seleziona corso");
  renderSelectOptions(adminCoursePicker, courses, "Seleziona corso");
  renderSelectOptions(adminImageCourseSelect, courses, "Seleziona corso");
  renderSelectOptions(bankCourseSelect, courses, "Tutti i corsi");
  renderCourseList(courses);
  const storedCourseId = getStoredAdminCourseId();
  const storedExists = Number.isFinite(storedCourseId)
    ? courses.some((course) => course.id === storedCourseId)
    : false;
  const fallbackId = courses[0]?.id;
  const preferredId = storedExists ? storedCourseId : fallbackId;
  if (Number.isFinite(preferredId)) {
    await setActiveCourse(preferredId, { persist: true });
  } else {
    await setActiveCourse(Number.NaN, { persist: false });
  }
  return courses;
};

const loadTopics = async (courseId, select, placeholder) => {
  if (!select) return;
  if (!Number.isFinite(courseId)) {
    renderSelectOptions(select, [], placeholder);
    return;
  }
  const payload = await apiFetch(`/api/topics?courseId=${courseId}`);
  renderSelectOptions(select, payload.topics || [], placeholder);
  renderTopicList(payload.topics || []);
};

const loadImages = async (courseId) => {
  if (!Number.isFinite(courseId)) {
    renderImageList([]);
    return;
  }
  const payload = await apiFetch(`/api/images?courseId=${courseId}`);
  renderImageList(payload.images || []);
};

const uploadImage = async () => {
  const courseId = Number(adminImageCourseSelect?.value || "");
  if (!Number.isFinite(courseId)) {
    if (adminImageStatus) adminImageStatus.textContent = "Seleziona un corso.";
    return;
  }
  const file = adminImageFileInput?.files?.[0];
  if (!file) {
    if (adminImageStatus) adminImageStatus.textContent = "Seleziona un file.";
    return;
  }
  const name = String(adminImageNameInput?.value || "").trim();
  const description = String(adminImageDescriptionInput?.value || "").trim();
  try {
    const dataBase64 = await readFileAsDataUrl(file);
    await apiFetch("/api/images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        name: name || file.name,
        description,
        originalName: file.name,
        dataBase64,
        mimeType: file.type,
      }),
    });
    if (adminImageNameInput) adminImageNameInput.value = "";
    if (adminImageDescriptionInput) adminImageDescriptionInput.value = "";
    if (adminImageFileInput) adminImageFileInput.value = "";
    if (adminImageStatus) adminImageStatus.textContent = "Immagine caricata.";
    await loadImages(courseId);
  } catch (err) {
    if (adminImageStatus) adminImageStatus.textContent = err.message || "Errore upload immagine.";
  }
};

const deleteImage = async (imageId) => {
  if (!confirm("Vuoi eliminare l'immagine dal banco?")) return;
  await apiFetch(`/api/images/${imageId}`, { method: "DELETE" });
  const courseId = Number(adminImageCourseSelect?.value || "");
  await loadImages(courseId);
};

const formatUserDate = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleDateString("it-IT");
};

const renderUserList = () => {
  if (!adminUserList) return;
  adminUserList.innerHTML = "";
  if (!userCache.length) {
    adminUserList.textContent = "Nessun utente disponibile.";
    return;
  }
  userCache.forEach((user) => {
    const item = createEl("div", "list-item");
    const header = createEl("div", "list-item-title", user.username);
    const metaParts = [user.role, formatUserDate(user.created_at)].filter(Boolean);
    const meta = createEl("div", "list-item-meta", metaParts.join(" • "));
    const actions = createEl("div", "table-actions");
    const removeBtn = createEl("button", "btn btn-outline-danger btn-sm", "Elimina");
    removeBtn.type = "button";
    if (user.role === "admin") {
      removeBtn.disabled = true;
      removeBtn.title = "Non puoi eliminare un amministratore.";
    } else {
      removeBtn.addEventListener("click", async () => {
        if (!confirm("Vuoi eliminare questo utente?")) return;
        try {
          await apiFetch(`/api/users/${user.id}`, { method: "DELETE" });
          await loadUsers();
        } catch (err) {
          if (adminUserStatus) adminUserStatus.textContent = err.message || "Errore eliminazione.";
        }
      });
    }
    actions.appendChild(removeBtn);
    item.appendChild(header);
    item.appendChild(meta);
    item.appendChild(actions);
    adminUserList.appendChild(item);
  });
};

const loadUsers = async () => {
  if (!adminUserList) return;
  try {
    const payload = await apiFetch("/api/users");
    userCache = payload.users || [];
    renderUserList();
  } catch (err) {
    if (adminUserStatus) adminUserStatus.textContent = err.message || "Errore caricamento utenti.";
  }
};

const createUser = async () => {
  const username = String(adminUserNameInput?.value || "").trim();
  const password = String(adminUserPasswordInput?.value || "");
  const role = String(adminUserRoleSelect?.value || "").trim();
  if (!username || !password || !role) {
    if (adminUserStatus) adminUserStatus.textContent = "Compila username, password e ruolo.";
    return;
  }
  try {
    await apiFetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });
    if (adminUserNameInput) adminUserNameInput.value = "";
    if (adminUserPasswordInput) adminUserPasswordInput.value = "";
    if (adminUserStatus) adminUserStatus.textContent = "Utente creato.";
    await loadUsers();
  } catch (err) {
    if (adminUserStatus) adminUserStatus.textContent = err.message || "Errore creazione utente.";
  }
};

const createCourse = async () => {
  const name = adminCourseNewInput?.value.trim() || "";
  if (!name) return;
  await apiFetch("/api/courses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (adminCourseNewInput) adminCourseNewInput.value = "";
  await loadCourses();
};

const deleteCourse = async (id) => {
  if (!confirm("Vuoi eliminare il corso selezionato?")) return;
  await apiFetch(`/api/courses/${id}`, { method: "DELETE" });
  await loadCourses();
};

const createTopic = async () => {
  const courseId = Number(adminTopicCourseSelect?.value || "");
  const name = adminTopicNewInput?.value.trim() || "";
  if (!Number.isFinite(courseId) || !name) return;
  await apiFetch("/api/topics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId, name }),
  });
  if (adminTopicNewInput) adminTopicNewInput.value = "";
  await loadTopics(courseId, bankTopicSelect, "Tutti gli argomenti");
  await loadQuestionTopics(courseId);
};

const deleteTopic = async (id) => {
  if (!confirm("Vuoi eliminare l'argomento selezionato?")) return;
  await apiFetch(`/api/topics/${id}`, { method: "DELETE" });
  const courseId = Number(adminTopicCourseSelect?.value || "");
  await loadTopics(courseId, bankTopicSelect, "Tutti gli argomenti");
  await loadQuestionTopics(courseId);
};

const refreshQuestionBank = async () => {
  const courseRaw = bankCourseSelect?.value || "";
  const topicRaw = bankTopicSelect?.value || "";
  const courseId = courseRaw === "" ? null : Number(courseRaw);
  const topicId = topicRaw === "" ? null : Number(topicRaw);
  const search = String(bankSearchInput?.value || "").trim();
  const params = new URLSearchParams();
  if (Number.isFinite(courseId)) params.set("courseId", String(courseId));
  if (Number.isFinite(topicId)) params.set("topicId", String(topicId));
  if (search) params.set("search", search);
  const payload = await apiFetch(`/api/questions?${params.toString()}`);
  renderBankList(payload.questions || []);
};

const duplicateQuestion = async (questionId) => {
  await apiFetch(`/api/questions/${questionId}/duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId: Number(bankCourseSelect?.value || "") }),
  });
  await refreshQuestionBank();
};

const deleteQuestion = async (questionId) => {
  if (!confirm("Vuoi eliminare la domanda dal banco?")) return;
  await apiFetch(`/api/questions/${questionId}`, { method: "DELETE" });
  await refreshQuestionBank();
};

const loadQuestionForEdit = async (questionId) => {
  const payload = await apiFetch(`/api/questions/${questionId}`);
  const q = payload.question;
  if (q.courseId) {
    await setActiveCourse(Number(q.courseId), { persist: true, resetTopics: false });
  }
  editingQuestionId = q.id;
  if (adminQuestionType) {
    const radio = adminQuestionType.querySelector(`input[value="${q.type || "singola"}"]`);
    if (radio) radio.checked = true;
  }
  updateQuestionTypePills();
  if (adminQuestionText) adminQuestionText.value = q.text;
  if (adminQuestionImageLayout) adminQuestionImageLayout.checked = Boolean(q.imageLayoutEnabled);
  updateImageFieldState();
  if (adminQuestionLayoutFields) {
    adminQuestionLayoutFields.classList.toggle("is-hidden", !q.imageLayoutEnabled);
  }
  if (adminImageAccordion) {
    adminImageAccordion.open = Boolean(q.imageLayoutEnabled) || Boolean(q.imagePath);
  }
  if (adminImageSplit) {
    const leftPercent = parseWidthToPercent(q.imageLeftWidth, 50);
    adminImageSplit.value = String(leftPercent);
  }
  if (adminImageScaleRange) {
    const scalePercent = parseWidthToPercent(q.imageScale, 96);
    adminImageScaleRange.value = String(scalePercent);
  }
  adminQuestionState.type = q.type || "singola";
  adminQuestionState.text = q.text || "";
  adminQuestionState.image = q.imagePath || "";
  adminQuestionState.imageLayoutEnabled = Boolean(q.imageLayoutEnabled);
  adminQuestionState.imageLeft = q.imageLeftWidth || "0.5\\linewidth";
  adminQuestionState.imageRight = q.imageRightWidth || "0.5\\linewidth";
  adminQuestionState.imageScale = q.imageScale || "0.96\\linewidth";
  adminQuestionState.answers = (q.answers || []).map((ans) => ({
    text: ans.text,
    correct: Boolean(ans.isCorrect),
  }));
  adminQuestionState.topicIds = q.topicIds || [];
  renderAdminAnswers();
  renderTopicOptions(topicOptions);
  if (adminQuestionStatus) adminQuestionStatus.textContent = "Modifica attiva.";
  if (adminSaveQuestionBtn) adminSaveQuestionBtn.textContent = "Aggiorna domanda";
  if (adminEditBadge) adminEditBadge.classList.remove("is-hidden");
  if (adminEditBadgeTop) adminEditBadgeTop.classList.remove("is-hidden");
  updateImageLayoutState();
  updateImagePickButton();
  updateAdminPreviews();
};

const saveAdminQuestion = async () => {
  const courseId = readSelectNumber(adminCoursePicker);
  if (!Number.isFinite(courseId)) {
    if (adminQuestionStatus) adminQuestionStatus.textContent = "Seleziona un corso.";
    return;
  }
  const text = String(adminQuestionText?.value || "").trim();
  if (!text) {
    if (adminQuestionStatus) adminQuestionStatus.textContent = "Inserisci il testo della domanda.";
    return;
  }
  const topics = topicOptions
    .filter((topic) => adminQuestionState.topicIds.includes(topic.id))
    .map((topic) => topic.name);
  if (!topics.length) {
    if (adminQuestionStatus) adminQuestionStatus.textContent = "Seleziona almeno un argomento.";
    return;
  }
  const answers = adminQuestionState.answers.filter((answer) => answer.text.trim() !== "");
  if (answers.length < 2) {
    if (adminQuestionStatus) adminQuestionStatus.textContent = "Inserisci almeno due risposte.";
    return;
  }
  const payload = {
    courseId,
    question: {
      text,
      type: adminQuestionState.type,
      imagePath: String(adminQuestionState.image || "").trim(),
      imageLayoutEnabled: Boolean(adminQuestionImageLayout?.checked),
      imageLeftWidth: String(adminQuestionState.imageLeft || "").trim(),
      imageRightWidth: String(adminQuestionState.imageRight || "").trim(),
      imageScale: String(adminQuestionState.imageScale || "").trim(),
      topics: Array.from(new Set(topics)),
      answers: answers.map((answer) => ({
        text: answer.text.trim(),
        isCorrect: Boolean(answer.correct),
      })),
    },
  };
  if (editingQuestionId) {
    await apiFetch(`/api/questions/${editingQuestionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (adminQuestionStatus) adminQuestionStatus.textContent = "Domanda aggiornata.";
  } else {
    await apiFetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (adminQuestionStatus) adminQuestionStatus.textContent = "Domanda salvata nel banco.";
  }
  resetAdminQuestion();
  await refreshQuestionBank();
};

const loadQuestionTopics = async (courseId) => {
  if (!Number.isFinite(courseId)) {
    renderTopicOptions([]);
    return;
  }
  const payload = await apiFetch(`/api/topics?courseId=${courseId}`);
  renderTopicOptions(payload.topics || []);
};

const init = async () => {
  await loadCourses();
  renderSelectOptions(bankTopicSelect, [], "Tutti gli argomenti");
  resetAdminQuestion();
  if (adminImageAccordion) adminImageAccordion.open = false;

  if (adminAddCourseBtn) adminAddCourseBtn.addEventListener("click", createCourse);
  if (adminAddTopicBtn) adminAddTopicBtn.addEventListener("click", createTopic);
  if (adminUploadImageBtn) adminUploadImageBtn.addEventListener("click", uploadImage);
  if (adminAddAnswerBtn) {
    adminAddAnswerBtn.addEventListener("click", () => {
      adminQuestionState.answers.push({ text: "", correct: false });
      renderAdminAnswers();
    });
  }
  if (adminQuestionText) {
    adminQuestionText.addEventListener("input", () => {
      adminQuestionState.text = adminQuestionText.value;
      updateAdminPreviews();
    });
  }
if (adminSaveQuestionBtn) adminSaveQuestionBtn.addEventListener("click", saveAdminQuestion);
if (adminResetQuestionBtn) adminResetQuestionBtn.addEventListener("click", resetAdminQuestion);
if (adminToolbarReset) adminToolbarReset.addEventListener("click", resetAdminQuestion);
if (adminToolbarNew) adminToolbarNew.addEventListener("click", resetAdminQuestion);
if (adminToolbarDuplicate) adminToolbarDuplicate.addEventListener("click", duplicateAdminQuestion);
if (adminToolbarSave) {
  adminToolbarSave.addEventListener("click", () => {
    if (adminSaveQuestionBtn) adminSaveQuestionBtn.click();
  });
}
if (adminTemplateAnswers) adminTemplateAnswers.addEventListener("click", applyAnswerTemplate);
if (adminPreviewRefresh) adminPreviewRefresh.addEventListener("click", updateAdminPreviews);
if (adminToolbarBank) adminToolbarBank.addEventListener("click", openBankModal);
if (bankModalClose) bankModalClose.addEventListener("click", closeBankModal);
if (bankModalBackdrop) bankModalBackdrop.addEventListener("click", closeBankModal);
  if (adminQuestionType) {
    adminQuestionType.addEventListener("change", (event) => {
      const target = event.target;
      if (!target || target.name !== "adminQuestionTypeOption") return;
      adminQuestionState.type = target.value;
      if (adminQuestionState.type === "singola") {
        const first = adminQuestionState.answers.findIndex((a) => a.correct);
        adminQuestionState.answers.forEach((a, idx) => {
          a.correct = first === -1 ? false : idx === first;
        });
        renderAdminAnswers();
      } else {
        updateAdminPreviews();
      }
      updateQuestionTypePills();
    });
  }
  if (adminQuestionImageLayout && adminQuestionLayoutFields) {
    adminQuestionImageLayout.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    adminQuestionImageLayout.addEventListener("change", () => {
      adminQuestionState.imageLayoutEnabled = adminQuestionImageLayout.checked;
      if (!adminQuestionImageLayout.checked) {
        adminQuestionState.image = "";
      }
      adminQuestionLayoutFields.classList.toggle("is-hidden", !adminQuestionImageLayout.checked);
      updateImageFieldState();
      if (adminImageAccordion) adminImageAccordion.open = adminQuestionImageLayout.checked;
      updateImagePickButton();
      updateImageLayoutState();
      updateAdminPreviews();
    });
  }
  if (adminImageSplit) {
    adminImageSplit.addEventListener("input", () => {
      updateImageLayoutState();
      updateAdminPreviews();
    });
  }
  if (adminImageScaleRange) {
    adminImageScaleRange.addEventListener("input", () => {
      updateImageLayoutState();
      updateAdminPreviews();
    });
  }
  if (adminImageSplitPresets) {
    adminImageSplitPresets.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;
      const value = Number(target.dataset.split || "");
      if (!Number.isFinite(value)) return;
      if (adminImageSplit) adminImageSplit.value = String(value);
      updateImageLayoutState();
      updateAdminPreviews();
    });
  }
  if (adminImageScalePresets) {
    adminImageScalePresets.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;
      const value = Number(target.dataset.scale || "");
      if (!Number.isFinite(value)) return;
      if (adminImageScaleRange) adminImageScaleRange.value = String(value);
      updateImageLayoutState();
      updateAdminPreviews();
    });
  }
  updateImageFieldState();
  updateImagePickButton();
  if (adminPickImageBtn) adminPickImageBtn.addEventListener("click", openImagePicker);
  if (imagePickerCloseBtn) imagePickerCloseBtn.addEventListener("click", closeImagePicker);
  if (imagePickerBackdrop) imagePickerBackdrop.addEventListener("click", closeImagePicker);
  if (imagePreviewCloseBtn) imagePreviewCloseBtn.addEventListener("click", closeImagePreview);
  if (imagePreviewBackdrop) imagePreviewBackdrop.addEventListener("click", closeImagePreview);
  if (adminCoursePicker) {
    adminCoursePicker.addEventListener("change", () => {
      setActiveCourse(readSelectNumber(adminCoursePicker));
    });
  }
  if (adminTopicCourseSelect) {
    adminTopicCourseSelect.addEventListener("change", () => {
      setActiveCourse(readSelectNumber(adminTopicCourseSelect));
    });
  }
  if (adminImageCourseSelect) {
    adminImageCourseSelect.addEventListener("change", () => {
      setActiveCourse(readSelectNumber(adminImageCourseSelect));
    });
  }
  if (bankCourseSelect) {
    bankCourseSelect.addEventListener("change", () => {
      setActiveCourse(readSelectNumber(bankCourseSelect));
    });
  }
  if (bankTopicSelect) bankTopicSelect.addEventListener("change", refreshQuestionBank);
  if (bankSearchInput) bankSearchInput.addEventListener("input", refreshQuestionBank);
  if (refreshBankBtn) refreshBankBtn.addEventListener("click", refreshQuestionBank);
  if (toggleCoursesBtn && adminCoursesSection) {
    toggleCoursesBtn.addEventListener("click", () => {
      const willOpen = adminCoursesSection.classList.contains("is-hidden");
      showAdminSection(willOpen ? adminCoursesSection : null);
    });
  }
  if (toggleTopicsBtn && adminTopicsSection) {
    toggleTopicsBtn.addEventListener("click", () => {
      const willOpen = adminTopicsSection.classList.contains("is-hidden");
      showAdminSection(willOpen ? adminTopicsSection : null);
    });
  }
  if (toggleImagesBtn && adminImagesSection) {
    toggleImagesBtn.addEventListener("click", () => {
      const willOpen = adminImagesSection.classList.contains("is-hidden");
      showAdminSection(willOpen ? adminImagesSection : null);
    });
  }
  if (toggleUsersBtn && adminUsersSection) {
    toggleUsersBtn.addEventListener("click", () => {
      const willOpen = adminUsersSection.classList.contains("is-hidden");
      showAdminSection(willOpen ? adminUsersSection : null);
      if (willOpen) loadUsers();
    });
  }
  if (adminCreateUserBtn) adminCreateUserBtn.addEventListener("click", createUser);
};

init();
