const state = {
  meta: {
    examName: "",
    courseId: null,
    title: "Fondamenti di Automatica - Mod. 1",
    department: "Ing. Informatica e dell'Automazione",
    university: "Politecnico di Bari",
    date: "26/1/2025",
    note: "N.B. E' obbligatorio scrivere il proprio nome, cognome e matricola su tutti i fogli.",
    logo: "logo_poliba.pdf",
    output: "exam",
    versions: 15,
    seed: 42,
    randomizeQuestions: true,
    randomizeAnswers: true,
    writeR: true,
    isDraft: true,
  },
  questions: [],
};

let nextQuestionId = 1;
const IMAGE_LAYOUT_PRESETS = {
  "50-50": { left: "0.5\\linewidth", right: "0.5\\linewidth" },
  "45-55": { left: "0.45\\linewidth", right: "0.55\\linewidth" },
  "40-60": { left: "0.4\\linewidth", right: "0.6\\linewidth" },
  "60-40": { left: "0.6\\linewidth", right: "0.4\\linewidth" },
};

let currentExamId = null;
let currentExamLocked = false;
let autosaveTimer = null;
let coursesCache = [];
let currentStep = 1;
const totalSteps = 3;
let courseTopics = [];
let activeImageQuestionId = null;
let lastPdfBlob = null;
let lastPdfLatex = "";
let imagePickerTarget = null;

const metaFields = {
  metaExamName: "examName",
  metaCourse: "courseId",
  metaTitle: "title",
  metaDepartment: "department",
  metaUniversity: "university",
  metaDate: "date",
  metaNote: "note",
  metaLogo: "logo",
  metaOutput: "output",
  metaVersions: "versions",
  metaSeed: "seed",
  metaRandomQuestions: "randomizeQuestions",
  metaRandomAnswers: "randomizeAnswers",
  metaWriteR: "writeR",
};

const latexPreview = document.getElementById("latexPreview");
const copyLatexBtn = document.getElementById("copyLatex");
const downloadLatexBtn = document.getElementById("downloadLatex");
const generatePdfBtn = document.getElementById("generatePdf");
const downloadPdfBtn = document.getElementById("downloadPdf");
const generateTracesBtn = document.getElementById("generateTraces");
const pdfStatus = document.getElementById("pdfStatus");
const latexLogWrap = document.getElementById("latexLogWrap");
const latexLog = document.getElementById("latexLog");
const metaExamNameInput = document.getElementById("metaExamName");
const metaCourseSelect = document.getElementById("metaCourse");
const saveExamBtn = document.getElementById("saveExam");
const lockExamBtn = document.getElementById("lockExam");
const unlockExamBtn = document.getElementById("unlockExam");
const newExamBtn = document.getElementById("newExam");
const examHistory = document.getElementById("examHistory");
const examStatus = document.getElementById("examStatus");
const examStateBadge = document.getElementById("examStateBadge");
const currentExamTitle = document.getElementById("currentExamTitle");
const toastNotify = document.getElementById("toastNotify");
const openSettingsBtn = document.getElementById("openSettings");
const closeSettingsBtn = document.getElementById("closeSettings");
const settingsDrawer = document.getElementById("settingsDrawer");
const settingsBackdrop = document.getElementById("settingsBackdrop");
const historyCourseSelect = document.getElementById("historyCourse");
const historyStatusSelect = document.getElementById("historyStatus");
const historySearchInput = document.getElementById("historySearch");
const historyDateInput = document.getElementById("historyDate");
const historyFilters = document.getElementById("historyFilters");
const toggleHistoryFiltersBtn = document.getElementById("toggleHistoryFilters");
const newExamBackdrop = document.getElementById("newExamBackdrop");
const newExamModal = document.getElementById("newExamModal");
const newExamCloseBtn = document.getElementById("newExamClose");
const newExamCancelBtn = document.getElementById("newExamCancel");
const newBankQuestionBtn = document.getElementById("newBankQuestion");
const bankQuestionBackdrop = document.getElementById("bankQuestionBackdrop");
const bankQuestionModal = document.getElementById("bankQuestionModal");
const bankQuestionCloseBtn = document.getElementById("bankQuestionClose");
const bankQuestionCourse = document.getElementById("bankQuestionCourse");
const bankQuestionType = document.getElementById("bankQuestionType");
const bankQuestionTopics = document.getElementById("bankQuestionTopics");
const bankQuestionImage = document.getElementById("bankQuestionImage");
const bankQuestionPickImage = document.getElementById("bankQuestionPickImage");
const bankQuestionText = document.getElementById("bankQuestionText");
const bankQuestionPreview = document.getElementById("bankQuestionPreview");
const bankQuestionImageLayout = document.getElementById("bankQuestionImageLayout");
const bankQuestionLayoutFields = document.getElementById("bankQuestionLayoutFields");
const bankQuestionImageLeft = document.getElementById("bankQuestionImageLeft");
const bankQuestionImageRight = document.getElementById("bankQuestionImageRight");
const bankQuestionImageScale = document.getElementById("bankQuestionImageScale");
const bankQuestionAnswers = document.getElementById("bankQuestionAnswers");
const bankQuestionAddAnswer = document.getElementById("bankQuestionAddAnswer");
const bankQuestionSave = document.getElementById("bankQuestionSave");
const bankQuestionReset = document.getElementById("bankQuestionReset");
const bankQuestionStatus = document.getElementById("bankQuestionStatus");
const bankPreviewBackdrop = document.getElementById("bankPreviewBackdrop");
const bankPreviewModal = document.getElementById("bankPreviewModal");
const bankPreviewCloseBtn = document.getElementById("bankPreviewClose");
const bankPreviewBody = document.getElementById("bankPreviewBody");
const pdfPreviewBackdrop = document.getElementById("pdfPreviewBackdrop");
const pdfPreviewModal = document.getElementById("pdfPreviewModal");
const pdfPreviewCloseBtn = document.getElementById("pdfPreviewClose");
const pdfPreviewFrame = document.getElementById("pdfPreviewFrame");
const bankCourseSelect = document.getElementById("bankCourse");
const bankTopicSelect = document.getElementById("bankTopic");
const bankSearchInput = document.getElementById("bankSearch");
const refreshBankBtn = document.getElementById("refreshBank");
const bankList = document.getElementById("bankList");
const selectedList = document.getElementById("selectedList");
const selectedCount = document.getElementById("selectedCount");
const bankTopicChips = document.getElementById("bankTopicChips");
const selectedTopicStats = document.getElementById("selectedTopicStats");
const stepButtons = Array.from(document.querySelectorAll("[data-step-target]"));
const wizardSteps = Array.from(document.querySelectorAll(".wizard-step"));
const builderImagePickerBackdrop = document.getElementById("builderImagePickerBackdrop");
const builderImagePickerModal = document.getElementById("builderImagePickerModal");
const builderImagePickerCloseBtn = document.getElementById("builderImagePickerClose");
const builderImagePickerStatus = document.getElementById("builderImagePickerStatus");
const builderImagePickerList = document.getElementById("builderImagePickerList");
const builderImagePreviewBackdrop = document.getElementById("builderImagePreviewBackdrop");
const builderImagePreviewModal = document.getElementById("builderImagePreviewModal");
const builderImagePreviewCloseBtn = document.getElementById("builderImagePreviewClose");
const builderImagePreviewImg = document.getElementById("builderImagePreviewImg");
const builderImagePreviewMeta = document.getElementById("builderImagePreviewMeta");

const createQuestion = () => ({
  id: String(nextQuestionId++),
  sourceId: null,
  type: "singola",
  text: "",
  image: "",
  imageWidthLeft: "0.5\\linewidth",
  imageWidthRight: "0.5\\linewidth",
  imageScale: "0.96\\linewidth",
  imageLayoutEnabled: false,
  imagePreset: "50-50",
  topics: [],
  answers: [
    { text: "", correct: false },
    { text: "", correct: false },
    { text: "", correct: false },
    { text: "", correct: false },
  ],
});

const createEl = (tag, className, text) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
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

const setLockedState = (locked) => {
  currentExamLocked = locked;
  if (lockExamBtn) lockExamBtn.disabled = locked || !currentExamId;
  if (unlockExamBtn) unlockExamBtn.classList.toggle("is-hidden", !locked);
  const statusText = currentExamId
    ? locked
      ? "Traccia chiusa."
      : "Bozza attiva."
    : "Nessuna traccia.";
  if (examStateBadge) {
    examStateBadge.textContent = currentExamId
      ? locked
        ? "Stato: Chiusa"
        : "Stato: Bozza"
      : "Nessuna traccia";
    examStateBadge.classList.toggle("is-draft", Boolean(currentExamId) && !locked);
    examStateBadge.classList.toggle("is-locked", Boolean(currentExamId) && locked);
  }
  if (currentExamTitle) {
    currentExamTitle.textContent = currentExamId ? state.meta.examName || "" : "";
  }

  const main = document.querySelector("main");
  if (!main) return;
  const controls = main.querySelectorAll("input, select, textarea, button");
  controls.forEach((el) => {
    const id = el.id || "";
    const isStepper = el.dataset && el.dataset.stepTarget;
    const inHistory = el.closest("#historySection");
    const inNewExam = el.closest("#newExamModal");
    const inSettings = el.closest("#settingsDrawer");
    const inBankQuestion = el.closest("#bankQuestionModal");
    const allow =
      isStepper ||
      inHistory ||
      inNewExam ||
      inSettings ||
      inBankQuestion ||
      id === "stepPrev" ||
      id === "stepNext" ||
      id === "newExam" ||
      id === "openSettings" ||
      id === "closeSettings" ||
      id === "newExamClose" ||
      id === "newExamCancel" ||
      id === "generateTraces" ||
      id === "unlockExam" ||
      id === "copyLatex" ||
      id === "downloadLatex" ||
      id === "generatePdf" ||
      id === "downloadPdf";
    if (allow) return;
    el.disabled = locked;
  });
  updateSaveAvailability();
  updatePdfAvailability();
  updateStepUI();
  updateTracesAvailability();
};

const isPreviewableImage = (filePath) => {
  const ext = String(filePath || "").split(".").pop().toLowerCase();
  return ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
};

const openImagePreview = (filePath, name, description) => {
  if (!builderImagePreviewModal || !builderImagePreviewBackdrop) return;
  if (builderImagePreviewImg) builderImagePreviewImg.src = filePath || "";
  if (builderImagePreviewImg) builderImagePreviewImg.alt = name || "Anteprima immagine";
  if (builderImagePreviewMeta) {
    const metaParts = [name, description].filter(Boolean);
    builderImagePreviewMeta.textContent = metaParts.join(" • ");
  }
  builderImagePreviewBackdrop.classList.remove("is-hidden");
  builderImagePreviewModal.classList.remove("is-hidden");
};

const closeImagePreview = () => {
  if (builderImagePreviewBackdrop) builderImagePreviewBackdrop.classList.add("is-hidden");
  if (builderImagePreviewModal) builderImagePreviewModal.classList.add("is-hidden");
  if (builderImagePreviewImg) builderImagePreviewImg.src = "";
};

const renderImagePickerList = (images) => {
  if (!builderImagePickerList) return;
  builderImagePickerList.innerHTML = "";
  if (!images.length) {
    builderImagePickerList.textContent = "Nessuna immagine disponibile per il corso selezionato.";
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
      if (imagePickerTarget?.type === "bankModal") {
        if (bankQuestionImage) bankQuestionImage.value = filePath;
        if (bankQuestionStatus) bankQuestionStatus.textContent = "Immagine selezionata.";
        closeImagePicker();
      }
    });
    actions.appendChild(selectBtn);
    details.appendChild(title);
    details.appendChild(desc);
    details.appendChild(actions);
    item.appendChild(thumb);
    item.appendChild(details);
    builderImagePickerList.appendChild(item);
  });
};

const openImagePicker = async (options = {}) => {
  const { questionId, courseId, target } = options;
  activeImageQuestionId = questionId || null;
  imagePickerTarget = target || (questionId ? { type: "question", questionId } : null);
  const courseIdValue = Number(courseId ?? state.meta.courseId);
  if (!Number.isFinite(courseIdValue)) {
    if (builderImagePickerStatus) {
      builderImagePickerStatus.textContent = "Seleziona prima un corso.";
    }
    if (builderImagePickerList) builderImagePickerList.innerHTML = "";
  } else {
    try {
      const payload = await apiFetch(`/api/images?courseId=${courseIdValue}`);
      renderImagePickerList(payload.images || []);
      if (builderImagePickerStatus) builderImagePickerStatus.textContent = "";
    } catch (err) {
      if (builderImagePickerStatus) {
        builderImagePickerStatus.textContent = err.message || "Errore caricamento immagini.";
      }
    }
  }
  if (builderImagePickerBackdrop) builderImagePickerBackdrop.classList.remove("is-hidden");
  if (builderImagePickerModal) builderImagePickerModal.classList.remove("is-hidden");
};

const closeImagePicker = () => {
  if (builderImagePickerBackdrop) builderImagePickerBackdrop.classList.add("is-hidden");
  if (builderImagePickerModal) builderImagePickerModal.classList.add("is-hidden");
  activeImageQuestionId = null;
  imagePickerTarget = null;
};

const openNewExamModal = () => {
  if (newExamBackdrop) newExamBackdrop.classList.remove("is-hidden");
  if (newExamModal) newExamModal.classList.remove("is-hidden");
};

const closeNewExamModal = () => {
  if (newExamBackdrop) newExamBackdrop.classList.add("is-hidden");
  if (newExamModal) newExamModal.classList.add("is-hidden");
};

const bankQuestionState = {
  type: "singola",
  text: "",
  topics: [],
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

const renderBankQuestionAnswers = () => {
  if (!bankQuestionAnswers) return;
  bankQuestionAnswers.innerHTML = "";
  bankQuestionState.answers.forEach((answer, idx) => {
    const row = createEl("div", "answer-builder");
    const check = createEl("input", "form-check-input");
    check.type = "checkbox";
    check.checked = Boolean(answer.correct);
    const input = createEl("input", "form-control");
    input.type = "text";
    input.value = answer.text;
    input.placeholder = "Testo risposta";
    const preview = createEl("div", "latex-preview-inline");
    renderMathPreview(input.value, preview, input);
    const removeBtn = createEl("button", "btn btn-danger btn-sm btn-icon");
    removeBtn.type = "button";
    removeBtn.setAttribute("aria-label", "Rimuovi risposta");
    removeBtn.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h5v2H3V5h5l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM6 9h2v9H6V9z"/></svg>';

    check.addEventListener("change", () => {
      if (bankQuestionState.type === "singola" && check.checked) {
        bankQuestionState.answers.forEach((a, i) => {
          a.correct = i === idx;
        });
        renderBankQuestionAnswers();
        return;
      }
      bankQuestionState.answers[idx].correct = check.checked;
    });
    input.addEventListener("input", () => {
      bankQuestionState.answers[idx].text = input.value;
      renderMathPreview(input.value, preview, input);
    });
    removeBtn.addEventListener("click", () => {
      bankQuestionState.answers.splice(idx, 1);
      renderBankQuestionAnswers();
    });

    row.appendChild(check);
    row.appendChild(input);
    row.appendChild(preview);
    row.appendChild(removeBtn);
    bankQuestionAnswers.appendChild(row);
  });
};

const resetBankQuestion = () => {
  bankQuestionState.type = "singola";
  bankQuestionState.text = "";
  bankQuestionState.topics = [];
  bankQuestionState.image = "";
  bankQuestionState.imageLayoutEnabled = false;
  bankQuestionState.imageLeft = "0.5\\linewidth";
  bankQuestionState.imageRight = "0.5\\linewidth";
  bankQuestionState.imageScale = "0.96\\linewidth";
  bankQuestionState.answers = [
    { text: "", correct: false },
    { text: "", correct: false },
    { text: "", correct: false },
    { text: "", correct: false },
  ];
  if (bankQuestionType) bankQuestionType.value = "singola";
  if (bankQuestionText) bankQuestionText.value = "";
  if (bankQuestionImage) bankQuestionImage.value = "";
  if (bankQuestionImageLayout) bankQuestionImageLayout.checked = false;
  if (bankQuestionLayoutFields) bankQuestionLayoutFields.classList.add("is-hidden");
  if (bankQuestionImageLeft) bankQuestionImageLeft.value = bankQuestionState.imageLeft;
  if (bankQuestionImageRight) bankQuestionImageRight.value = bankQuestionState.imageRight;
  if (bankQuestionImageScale) bankQuestionImageScale.value = bankQuestionState.imageScale;
  if (bankQuestionTopics) {
    Array.from(bankQuestionTopics.options).forEach((opt) => {
      opt.selected = false;
    });
  }
  if (bankQuestionStatus) bankQuestionStatus.textContent = "";
  if (bankQuestionPreview) renderMathPreview("", bankQuestionPreview, bankQuestionText);
  renderBankQuestionAnswers();
};

const openBankQuestionModal = () => {
  resetBankQuestion();
  if (bankQuestionCourse && state.meta.courseId) {
    bankQuestionCourse.value = String(state.meta.courseId);
  }
  const courseId = Number(bankQuestionCourse?.value || "");
  if (Number.isFinite(courseId)) {
    loadTopics(courseId, bankQuestionTopics, "Seleziona argomenti");
  }
  if (bankQuestionBackdrop) bankQuestionBackdrop.classList.remove("is-hidden");
  if (bankQuestionModal) bankQuestionModal.classList.remove("is-hidden");
  renderBankQuestionAnswers();
  if (bankQuestionPreview && bankQuestionText) {
    renderMathPreview(bankQuestionText.value, bankQuestionPreview, bankQuestionText);
  }
};

const closeBankQuestionModal = () => {
  if (bankQuestionBackdrop) bankQuestionBackdrop.classList.add("is-hidden");
  if (bankQuestionModal) bankQuestionModal.classList.add("is-hidden");
};

const saveBankQuestion = async () => {
  const courseId = Number(bankQuestionCourse?.value || "");
  if (!Number.isFinite(courseId)) {
    if (bankQuestionStatus) bankQuestionStatus.textContent = "Seleziona un corso.";
    return;
  }
  const text = String(bankQuestionText?.value || "").trim();
  if (!text) {
    if (bankQuestionStatus) bankQuestionStatus.textContent = "Inserisci il testo della domanda.";
    return;
  }
  const topics = Array.from(bankQuestionTopics?.selectedOptions || []).map(
    (opt) => opt.textContent
  );
  if (!topics.length) {
    if (bankQuestionStatus) bankQuestionStatus.textContent = "Seleziona almeno un argomento.";
    return;
  }
  const answers = bankQuestionState.answers.filter((answer) => answer.text.trim() !== "");
  if (answers.length < 2) {
    if (bankQuestionStatus) bankQuestionStatus.textContent = "Inserisci almeno due risposte.";
    return;
  }
  const payload = {
    courseId,
    question: {
      text,
      type: bankQuestionState.type,
      imagePath: String(bankQuestionImage?.value || "").trim(),
      imageLayoutEnabled: Boolean(bankQuestionImageLayout?.checked),
      imageLeftWidth: String(bankQuestionImageLeft?.value || "").trim(),
      imageRightWidth: String(bankQuestionImageRight?.value || "").trim(),
      imageScale: String(bankQuestionImageScale?.value || "").trim(),
      topics,
      answers: answers.map((answer) => ({
        text: answer.text,
        isCorrect: Boolean(answer.correct),
      })),
    },
  };
  try {
    await apiFetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (bankQuestionStatus) bankQuestionStatus.textContent = "Domanda salvata nel banco.";
    resetBankQuestion();
    await refreshQuestionBank();
    closeBankQuestionModal();
  } catch (err) {
    if (bankQuestionStatus) bankQuestionStatus.textContent = err.message;
  }
};

const getStepCompletion = () => {
  const step1 = Boolean(state.meta.examName) && Number.isFinite(state.meta.courseId);
  const step2 = state.questions.length > 0;
  const step3 = Boolean(currentExamId) && currentExamLocked;
  return { step1, step2, step3 };
};

const validateStepAdvance = (nextStep, options = {}) => {
  const silent = Boolean(options.silent);
  if (nextStep <= 1) return true;
  const hasMeta = Boolean(state.meta.examName) && Number.isFinite(state.meta.courseId);
  if (!hasMeta) {
    if (!silent && examStatus) {
      examStatus.textContent = "Compila nome traccia e corso per proseguire.";
    }
    return false;
  }
  if (nextStep >= 3 && state.questions.length < 1) {
    if (!silent && examStatus) {
      examStatus.textContent = "Aggiungi almeno una domanda per proseguire.";
    }
    return false;
  }
  if (!silent && examStatus && examStatus.textContent.includes("proseguire")) {
    examStatus.textContent = "";
  }
  return true;
};

const updateStepUI = () => {
  const completion = getStepCompletion();
  wizardSteps.forEach((step) => {
    const stepIndex = Number(step.dataset.step);
    step.classList.toggle("is-hidden", stepIndex !== currentStep);
  });
  stepButtons.forEach((btn) => {
    const target = Number(btn.dataset.stepTarget);
    btn.classList.toggle("active", target === currentStep);
    const completed =
      (target === 1 && completion.step1) ||
      (target === 2 && completion.step2) ||
      (target === 3 && completion.step3);
    btn.classList.toggle("completed", completed);
  });
  const canAdvance = validateStepAdvance(currentStep + 1, { silent: true });
  if (!canAdvance) {
    stepButtons.forEach((btn) => {
      const target = Number(btn.dataset.stepTarget);
      if (target > currentStep) btn.classList.add("is-disabled");
      else btn.classList.remove("is-disabled");
    });
  } else {
    stepButtons.forEach((btn) => btn.classList.remove("is-disabled"));
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const goToStep = (nextStep) => {
  const step = Math.max(1, Math.min(totalSteps, Number(nextStep)));
  if (step > currentStep && !validateStepAdvance(step)) {
    updateStepUI();
    return;
  }
  currentStep = step;
  updateStepUI();
};

const scheduleAutosave = (immediate = false) => {
  updateStepUI();
  if (currentExamLocked) return;
  if (!currentExamId) return;
  if (!state.meta.examName || !Number.isFinite(state.meta.courseId)) return;
  if (immediate) {
    updateCurrentExam();
    return;
  }
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(updateCurrentExam, 700);
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

const renderMathPreview = (source, target, input) => {
  if (!target) return;
  const trimmed = String(source || "").trim();
  target.textContent = trimmed;
  if (!input) return;
  if (!trimmed) {
    input.classList.remove("input-error");
    return;
  }
  if (typeof window.renderMathInElement !== "function") {
    input.classList.remove("input-error");
    return;
  }
  try {
    window.renderMathInElement(target, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
      throwOnError: true,
    });
    input.classList.remove("input-error");
  } catch {
    input.classList.add("input-error");
    target.textContent = trimmed;
  }
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

let toastTimer = null;
const showToast = (message, tone = "info") => {
  if (!toastNotify) return;
  toastNotify.textContent = message;
  toastNotify.classList.remove("is-error", "is-success");
  if (tone === "error") toastNotify.classList.add("is-error");
  if (tone === "success") toastNotify.classList.add("is-success");
  toastNotify.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastNotify.classList.remove("show");
  }, 2600);
};

const resetExamState = () => {
  currentExamId = null;
  currentExamLocked = false;
  clearTimeout(autosaveTimer);
  autosaveTimer = null;
  state.meta.examName = "";
  state.meta.courseId = null;
  state.meta.isDraft = true;
  courseTopics = [];
  state.questions = [];
  nextQuestionId = 1;
  renderSelectedQuestions();
  renderLatex();
  if (examStatus) examStatus.textContent = "";
  setLockedState(false);
  renderSelectedTopicStats();
  renderTopicChips();
  goToStep(1);
};

const applyMetaToInputs = () => {
  Object.entries(metaFields).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (key === "courseId") {
      el.value = state.meta.courseId ? String(state.meta.courseId) : "";
      return;
    }
    if (typeof state.meta[key] === "boolean") {
      el.checked = Boolean(state.meta[key]);
    } else {
      el.value = state.meta[key] ?? "";
    }
  });
};

const loadCourses = async () => {
  try {
    const payload = await apiFetch("/api/courses");
    coursesCache = payload.courses || [];
    renderSelectOptions(metaCourseSelect, coursesCache, "Seleziona corso");
    renderSelectOptions(bankCourseSelect, coursesCache, "Tutti i corsi");
    renderSelectOptions(historyCourseSelect, coursesCache, "Tutti i corsi");
    renderSelectOptions(bankQuestionCourse, coursesCache, "Seleziona corso");
    applyMetaToInputs();
    if (Number.isFinite(state.meta.courseId)) {
      loadCourseTopics(state.meta.courseId);
    }
    updateSaveAvailability();
  } catch (err) {
    if (examStatus) examStatus.textContent = err.message;
  }
};

const loadCourseTopics = async (courseId) => {
  if (!Number.isFinite(courseId)) {
    courseTopics = [];
    renderSelectedQuestions();
    renderTopicChips();
    return;
  }
  try {
    const payload = await apiFetch(`/api/topics?courseId=${courseId}`);
    courseTopics = payload.topics || [];
    renderSelectedQuestions();
    renderTopicChips();
  } catch (err) {
    courseTopics = [];
    if (examStatus) examStatus.textContent = err.message;
  }
};

const loadTopics = async (courseId, select, placeholder) => {
  if (!select) return;
  if (!Number.isFinite(courseId)) {
    renderSelectOptions(select, [], placeholder);
    return;
  }
  try {
    const payload = await apiFetch(`/api/topics?courseId=${courseId}`);
    renderSelectOptions(select, payload.topics || [], placeholder);
  } catch (err) {
    if (examStatus) examStatus.textContent = err.message;
  }
};

const renderTopicChips = () => {
  if (!bankTopicChips) return;
  bankTopicChips.innerHTML = "";
  const allChip = createEl("button", "chip chip-action", "Tutti");
  allChip.type = "button";
  allChip.dataset.topicId = "";
  bankTopicChips.appendChild(allChip);
  courseTopics.forEach((topic) => {
    const chip = createEl("button", "chip chip-action", topic.name);
    chip.type = "button";
    chip.dataset.topicId = String(topic.id);
    bankTopicChips.appendChild(chip);
  });
};

const refreshQuestionBank = async () => {
  if (!bankList) return;
  const courseRaw = bankCourseSelect?.value || "";
  const topicRaw = bankTopicSelect?.value || "";
  const courseId = courseRaw === "" ? null : Number(courseRaw);
  const topicId = topicRaw === "" ? null : Number(topicRaw);
  const search = String(bankSearchInput?.value || "").trim();
  const params = new URLSearchParams();
  if (Number.isFinite(courseId)) params.set("courseId", String(courseId));
  if (Number.isFinite(topicId)) params.set("topicId", String(topicId));
  if (search) params.set("search", search);
  try {
    const payload = await apiFetch(`/api/questions?${params.toString()}`);
    renderBankList(payload.questions || []);
  } catch (err) {
    bankList.textContent = err.message;
  }
};

const renderBankList = (questions) => {
  if (!bankList) return;
  bankList.innerHTML = "";
  if (!questions.length) {
    bankList.textContent = "Nessuna domanda trovata.";
    return;
  }
  const selectedIds = new Set(state.questions.map((q) => q.sourceId).filter(Boolean));
  if (bankTopicChips) {
    const active = bankTopicSelect?.value || "";
    Array.from(bankTopicChips.querySelectorAll(".chip-action")).forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.topicId === active);
    });
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
    const previewBtn = createEl("button", "btn btn-outline-secondary btn-sm", "Preview");
    previewBtn.type = "button";
    previewBtn.dataset.action = "preview-bank";
    previewBtn.dataset.questionId = question.id;
    const alreadySelected = selectedIds.has(question.id);
    const btn = createEl("button", "btn btn-outline-primary btn-sm", "Importa");
    btn.type = "button";
    if (alreadySelected) {
      btn.disabled = true;
      btn.textContent = "Selezionata";
      item.classList.add("is-selected");
    }
    btn.addEventListener("click", () => importQuestionFromBank(question.id));
    actions.appendChild(previewBtn);
    actions.appendChild(btn);
    item.appendChild(title);
    item.appendChild(meta);
    item.appendChild(actions);
    bankList.appendChild(item);
  });
  renderTopicChips();
};

const renderSelectedQuestions = () => {
  if (!selectedList) return;
  selectedList.innerHTML = "";
  if (selectedCount) {
    selectedCount.textContent = `${state.questions.length} domande`;
  }
  if (!state.questions.length) {
    selectedList.textContent = "Nessuna domanda selezionata.";
    renderSelectedTopicStats();
    return;
  }
  renderSelectedTopicStats();
  state.questions.forEach((question, idx) => {
    const item = createEl("div", "selected-question-card");
    const badge = createEl("div", "selected-question-badge", `Es. ${idx + 1}`);
    const body = createEl("div", "selected-question-body");
    const text = createEl("div", "selected-question-text");
    renderMathDisplay(question.text, text);
    body.appendChild(text);
    if (question.image) {
      const imgWrap = createEl("div", "selected-question-image");
      const img = createEl("img", "selected-preview-thumb");
      img.src = question.image;
      img.alt = question.image;
      imgWrap.appendChild(img);
      body.appendChild(imgWrap);
    }
    const answers = question.answers.filter((ans) => String(ans.text || "").trim() !== "");
    if (answers.length) {
      const list = createEl("div", "selected-question-answers");
      answers.forEach((answer, ansIdx) => {
        const row = createEl("div", "selected-question-answer");
        const label = createEl("span", "selected-preview-answer-label", `${ansIdx + 1}.`);
        const textEl = createEl("span", "selected-preview-answer-text");
        renderMathDisplay(answer.text, textEl);
        row.appendChild(label);
        row.appendChild(textEl);
        if (answer.correct) {
          const tick = createEl("span", "answer-tick");
          tick.innerHTML =
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.4-1.4z"/></svg>';
          row.appendChild(tick);
        }
        list.appendChild(row);
      });
      body.appendChild(list);
    }
    const actions = createEl("div", "selected-question-actions");
    const removeBtn = createEl("button", "btn btn-outline-danger btn-sm", "Rimuovi");
    removeBtn.type = "button";
    removeBtn.dataset.action = "remove-selected";
    removeBtn.dataset.questionId = question.id;
    actions.appendChild(removeBtn);
    item.appendChild(badge);
    item.appendChild(body);
    item.appendChild(actions);
    selectedList.appendChild(item);
  });
};

const renderSelectedTopicStats = () => {
  if (!selectedTopicStats) return;
  selectedTopicStats.innerHTML = "";
  const counts = new Map();
  state.questions.forEach((question) => {
    (question.topics || []).forEach((topic) => {
      counts.set(topic, (counts.get(topic) || 0) + 1);
    });
  });
  if (!counts.size) {
    selectedTopicStats.textContent = "Nessun argomento selezionato.";
    return;
  }
  counts.forEach((count, topic) => {
    const chip = createEl("span", "chip");
    chip.textContent = `${topic} (${count})`;
    selectedTopicStats.appendChild(chip);
  });
};

const renderQuestionPreviewBody = (container, question) => {
  if (!container || !question) return;
  container.innerHTML = "";
  const header = createEl("div", "selected-question-badge", "Domanda");
  header.style.position = "static";
  header.style.alignSelf = "flex-start";
  const text = createEl("div", "selected-question-text");
  renderMathDisplay(question.text || "", text);
  container.appendChild(header);
  container.appendChild(text);
  if (question.image) {
    const imgWrap = createEl("div", "selected-question-image");
    const img = createEl("img", "selected-preview-thumb");
    img.src = question.image;
    img.alt = question.image;
    imgWrap.appendChild(img);
    container.appendChild(imgWrap);
  }
  const answers = (question.answers || []).filter((ans) => String(ans.text || "").trim() !== "");
  if (answers.length) {
    const list = createEl("div", "selected-question-answers");
    answers.forEach((answer, idx) => {
      const row = createEl("div", "selected-question-answer");
      const label = createEl("span", "selected-preview-answer-label", `${idx + 1}.`);
      const textEl = createEl("span", "selected-preview-answer-text");
      renderMathDisplay(answer.text, textEl);
      row.appendChild(label);
      row.appendChild(textEl);
      if (answer.isCorrect || answer.correct) {
        const tick = createEl("span", "answer-tick");
        tick.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.4-1.4z"/></svg>';
        row.appendChild(tick);
      }
      list.appendChild(row);
    });
    container.appendChild(list);
  }
};

const openBankPreviewModal = (question) => {
  if (!bankPreviewModal || !bankPreviewBackdrop || !bankPreviewBody) return;
  renderQuestionPreviewBody(bankPreviewBody, question);
  bankPreviewModal.classList.remove("is-hidden");
  bankPreviewBackdrop.classList.remove("is-hidden");
};

const closeBankPreviewModal = () => {
  if (bankPreviewModal) bankPreviewModal.classList.add("is-hidden");
  if (bankPreviewBackdrop) bankPreviewBackdrop.classList.add("is-hidden");
  if (bankPreviewBody) bankPreviewBody.innerHTML = "";
};

const importQuestionFromBank = async (questionId) => {
  try {
    const payload = await apiFetch(`/api/questions/${questionId}`);
    const q = payload.question;
    const newQuestion = createQuestion();
    newQuestion.type = q.type || "singola";
    newQuestion.text = q.text || "";
    newQuestion.sourceId = q.id;
    newQuestion.image = q.imagePath || "";
    newQuestion.imageLayoutEnabled = Boolean(q.imageLayoutEnabled);
    newQuestion.imageWidthLeft = q.imageLeftWidth || newQuestion.imageWidthLeft;
    newQuestion.imageWidthRight = q.imageRightWidth || newQuestion.imageWidthRight;
    newQuestion.imageScale = q.imageScale || newQuestion.imageScale;
    newQuestion.topics = Array.isArray(q.topics) ? q.topics : [];
    newQuestion.answers = (q.answers || []).map((answer) => ({
      text: answer.text,
      correct: Boolean(answer.isCorrect),
    }));
    state.questions.push(newQuestion);
    renderSelectedQuestions();
    renderLatex();
    scheduleAutosave(true);
  } catch (err) {
    if (examStatus) examStatus.textContent = err.message;
  }
};

const updateSaveAvailability = () => {
  const ready = Boolean(state.meta.examName) && Number.isFinite(state.meta.courseId);
  if (saveExamBtn) saveExamBtn.disabled = !ready || currentExamLocked;
  if (lockExamBtn) lockExamBtn.disabled = !ready || currentExamLocked;
};

const highlightMissingMeta = () => {
  const missingExamName = !state.meta.examName;
  const missingCourse = !Number.isFinite(state.meta.courseId);
  if (metaExamNameInput) {
    metaExamNameInput.classList.toggle("input-error", missingExamName);
  }
  if (metaCourseSelect) {
    metaCourseSelect.classList.toggle("input-error", missingCourse);
  }
};

const collectExamPayload = () => ({
  exam: {
    courseId: state.meta.courseId,
    title: state.meta.examName,
    date: state.meta.date,
    outputName: state.meta.output,
    versions: state.meta.versions,
    seed: state.meta.seed,
    randomizeQuestions: state.meta.randomizeQuestions,
    randomizeAnswers: state.meta.randomizeAnswers,
    writeR: state.meta.writeR,
    headerTitle: state.meta.title,
    headerDepartment: state.meta.department,
    headerUniversity: state.meta.university,
    headerNote: state.meta.note,
    headerLogo: state.meta.logo,
  },
  questions: state.questions.map((question) => ({
    text: question.text,
    type: question.type,
    imagePath: question.image,
    imageLayoutEnabled: question.imageLayoutEnabled,
    imageLeftWidth: question.imageWidthLeft,
    imageRightWidth: question.imageWidthRight,
    imageScale: question.imageScale,
    topics: question.topics || [],
    answers: question.answers.map((answer) => ({
      text: answer.text,
      isCorrect: Boolean(answer.correct),
    })),
  })),
});

const updateCurrentExam = async () => {
  if (currentExamLocked) return;
  if (!currentExamId) return;
  if (!state.meta.examName || !Number.isFinite(state.meta.courseId)) return;
  try {
    const payload = collectExamPayload();
    await apiFetch(`/api/exams/${currentExamId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (examStatus) examStatus.textContent = "Bozza aggiornata automaticamente.";
    setLockedState(false);
    await loadExamHistory();
  } catch (err) {
    if (examStatus) examStatus.textContent = err.message;
  }
};

const filterExamHistory = (exams) => {
  if (!Array.isArray(exams)) return [];
  const courseRaw = historyCourseSelect?.value || "";
  const statusRaw = historyStatusSelect?.value || "all";
  const searchRaw = String(historySearchInput?.value || "").trim().toLowerCase();
  const dateRaw = String(historyDateInput?.value || "").trim();
  const courseId = courseRaw === "" ? null : Number(courseRaw);
  return exams.filter((exam) => {
    if (Number.isFinite(courseId) && exam.course_id !== courseId) {
      return false;
    }
    if (statusRaw === "draft" && !exam.is_draft) return false;
    if (statusRaw === "locked" && exam.is_draft) return false;
    if (searchRaw && !String(exam.title || "").toLowerCase().includes(searchRaw)) {
      return false;
    }
    if (dateRaw) {
      const examDate = normalizeDateToInput(exam.date || "");
      if (examDate !== dateRaw) return false;
    }
    return true;
  });
};

const loadExamHistory = async () => {
  if (!examHistory) return;
  try {
    const payload = await apiFetch("/api/exams");
    const exams = payload.exams || [];
    const filtered = filterExamHistory(exams);
    renderExamHistory(filtered);
  } catch (err) {
    examHistory.textContent = err.message;
  }
};

const renderExamHistory = (exams) => {
  if (!examHistory) return;
  examHistory.innerHTML = "";
  if (!exams.length) {
    examHistory.textContent = "Nessuna traccia salvata.";
    return;
  }
  exams.forEach((exam) => {
    const item = createEl("div", "history-card");
    const band = createEl("div", "history-card-band");
    const body = createEl("div", "history-card-body");
    const title = createEl("div", "history-card-title", exam.title);
    const metaDate = exam.date ? formatDateDisplay(exam.date) : "data n/d";
    const meta = createEl(
      "div",
      "history-card-meta",
      `${exam.course_name} • ${metaDate} • ${exam.question_count} domande`
    );
    const status = createEl(
      "span",
      "history-card-status",
      exam.is_draft ? "Bozza" : "Chiusa"
    );
    status.classList.toggle("is-draft", exam.is_draft);
    status.classList.toggle("is-locked", !exam.is_draft);
    const actions = createEl("div", "history-card-actions");
    const loadBtn = createEl("button", "btn btn-outline-primary btn-sm", "Carica");
    loadBtn.type = "button";
    loadBtn.addEventListener("click", () => loadExam(exam.id));
    const duplicateBtn = createEl("button", "btn btn-outline-secondary btn-sm", "Duplica");
    duplicateBtn.type = "button";
    duplicateBtn.addEventListener("click", () => duplicateExam(exam.id));
    const deleteBtn = createEl("button", "btn btn-outline-danger btn-sm", "Elimina");
    deleteBtn.type = "button";
    deleteBtn.addEventListener("click", () => deleteExam(exam.id));
    actions.appendChild(loadBtn);
    actions.appendChild(duplicateBtn);
    actions.appendChild(deleteBtn);
    body.appendChild(title);
    body.appendChild(meta);
    body.appendChild(status);
    item.appendChild(band);
    item.appendChild(body);
    item.appendChild(actions);
    examHistory.appendChild(item);
  });
};

const saveExam = async () => {
  updateSaveAvailability();
  if (currentExamLocked) {
    if (examStatus) examStatus.textContent = "Traccia chiusa. Crea una nuova traccia.";
    return;
  }
  if (!state.meta.examName || !Number.isFinite(state.meta.courseId)) {
    highlightMissingMeta();
    if (examStatus) examStatus.textContent = "Compila nome traccia e corso.";
    return;
  }
  try {
    const payload = collectExamPayload();
    payload.exam.isDraft = true;
    const res = await apiFetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    currentExamId = res.examId;
    state.meta.isDraft = true;
    if (examStatus) examStatus.textContent = "Bozza creata.";
    setLockedState(false);
    await loadExamHistory();
  } catch (err) {
    if (examStatus) examStatus.textContent = err.message;
  }
};

const lockExam = async () => {
  if (currentExamLocked) return;
  if (!currentExamId) {
    if (examStatus) examStatus.textContent = "Crea la bozza prima di chiudere.";
    return;
  }
  try {
    await apiFetch(`/api/exams/${currentExamId}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latex: latexPreview.value,
        versions: state.meta.versions,
      }),
    });
    state.meta.isDraft = false;
    setLockedState(true);
    if (examStatus) examStatus.textContent = "Traccia chiusa.";
    await loadExamHistory();
  } catch (err) {
    if (examStatus) examStatus.textContent = err.message;
  }
};

const unlockExam = async () => {
  if (!currentExamId) return;
  try {
    await apiFetch(`/api/exams/${currentExamId}/unlock`, { method: "POST" });
    state.meta.isDraft = true;
    setLockedState(false);
    if (examStatus) examStatus.textContent = "Traccia sbloccata.";
    await loadExamHistory();
  } catch (err) {
    if (examStatus) examStatus.textContent = err.message;
  }
};

const loadExam = async (examId) => {
  try {
    const payload = await apiFetch(`/api/exams/${examId}`);
    currentExamId = payload.exam.id;
    state.meta.isDraft = Boolean(payload.exam.isDraft);
    state.meta.examName = payload.exam.title;
    state.meta.courseId = payload.exam.courseId;
    state.meta.date = normalizeDateToInput(payload.exam.date || "");
    state.meta.output = payload.exam.outputName || "exam";
    state.meta.versions = payload.exam.versions || 1;
    state.meta.seed = payload.exam.seed || 1;
    state.meta.randomizeQuestions = payload.exam.randomizeQuestions;
    state.meta.randomizeAnswers = payload.exam.randomizeAnswers;
    state.meta.writeR = payload.exam.writeR;
    state.meta.title = payload.exam.headerTitle || "";
    state.meta.department = payload.exam.headerDepartment || "";
    state.meta.university = payload.exam.headerUniversity || "";
    state.meta.note = payload.exam.headerNote || "";
    state.meta.logo = payload.exam.headerLogo || "";
    state.questions = payload.questions.map((question) => {
      const item = createQuestion();
      item.type = question.type || "singola";
      item.text = question.text || "";
      item.image = question.imagePath || "";
      item.imageLayoutEnabled = Boolean(question.imageLayoutEnabled);
      item.imageWidthLeft = question.imageLeftWidth || item.imageWidthLeft;
      item.imageWidthRight = question.imageRightWidth || item.imageWidthRight;
      item.imageScale = question.imageScale || item.imageScale;
      item.topics = question.topics || [];
      item.answers = (question.answers || []).map((ans) => ({
        text: ans.text,
        correct: Boolean(ans.isCorrect),
      }));
      return item;
    });
    applyMetaToInputs();
    if (bankCourseSelect && state.meta.courseId) {
      bankCourseSelect.value = String(state.meta.courseId);
    }
    await loadCourseTopics(state.meta.courseId);
    renderSelectedQuestions();
    renderLatex();
    await loadTopics(state.meta.courseId, bankTopicSelect, "Tutti gli argomenti");
    if (examStatus) examStatus.textContent = "Traccia caricata.";
    setLockedState(!state.meta.isDraft);
  } catch (err) {
    if (examStatus) examStatus.textContent = err.message;
  }
};

const deleteExam = async (examId) => {
  if (!confirm("Vuoi eliminare la traccia selezionata?")) return;
  try {
    await apiFetch(`/api/exams/${examId}`, { method: "DELETE" });
    if (currentExamId === examId) {
      currentExamId = null;
    }
    await loadExamHistory();
  } catch (err) {
    if (examStatus) examStatus.textContent = err.message;
  }
};

const duplicateExam = async (examId) => {
  try {
    const payload = await apiFetch(`/api/exams/${examId}`);
    const source = payload.exam;
    const duplicated = {
      exam: {
        courseId: source.courseId,
        title: `${source.title || "Traccia"} (Copia)`,
        date: normalizeDateToInput(source.date || ""),
        outputName: source.outputName || "exam",
        versions: source.versions || 1,
        seed: source.seed || 1,
        randomizeQuestions: source.randomizeQuestions,
        randomizeAnswers: source.randomizeAnswers,
        writeR: source.writeR,
        headerTitle: source.headerTitle || "",
        headerDepartment: source.headerDepartment || "",
        headerUniversity: source.headerUniversity || "",
        headerNote: source.headerNote || "",
        headerLogo: source.headerLogo || "",
        isDraft: true,
      },
      questions: (payload.questions || []).map((question) => ({
        text: question.text,
        type: question.type,
        imagePath: question.imagePath,
        imageLayoutEnabled: question.imageLayoutEnabled,
        imageLeftWidth: question.imageLeftWidth,
        imageRightWidth: question.imageRightWidth,
        imageScale: question.imageScale,
        topics: question.topics || [],
        answers: (question.answers || []).map((answer) => ({
          text: answer.text,
          isCorrect: Boolean(answer.isCorrect),
        })),
      })),
    };
    const result = await apiFetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(duplicated),
    });
    await loadExam(result.examId);
    if (examStatus) examStatus.textContent = "Bozza duplicata.";
    await loadExamHistory();
  } catch (err) {
    if (examStatus) examStatus.textContent = err.message;
  }
};

const updateMetaFromInput = (id, value) => {
  const key = metaFields[id];
  if (!key) return;
  if (key === "courseId") {
    const num = Number(value);
    state.meta.courseId = Number.isFinite(num) ? num : null;
    return;
  }
  if (typeof state.meta[key] === "boolean") {
    state.meta[key] = Boolean(value);
    return;
  }
  if (typeof state.meta[key] === "number") {
    const num = Number(value);
    state.meta[key] = Number.isFinite(num) && num > 0 ? num : state.meta[key];
    return;
  }
  state.meta[key] = value;
};

const handleMetaInput = (event) => {
  const target = event.target;
  if (!target.id || !metaFields[target.id]) return;
  if (target.type === "checkbox") {
    updateMetaFromInput(target.id, target.checked);
  } else {
    updateMetaFromInput(target.id, target.value);
  }
  highlightMissingMeta();
  if (target.id === "metaCourse") {
    loadTopics(Number(target.value), bankTopicSelect, "Tutti gli argomenti");
    loadCourseTopics(Number(target.value));
  }
  updateSaveAvailability();
  renderLatex();
  scheduleAutosave();
};


const handleBankClick = async (event) => {
  const target = event.target;
  const action = target.dataset.action;
  if (action !== "preview-bank") return;
  const questionId = target.dataset.questionId;
  if (!questionId) return;
  try {
    const payload = await apiFetch(`/api/questions/${questionId}`);
    const q = payload.question;
    const preview = {
      text: q.text || "",
      image: q.imagePath || "",
      answers: (q.answers || []).map((ans) => ({
        text: ans.text || "",
        isCorrect: Boolean(ans.isCorrect),
      })),
    };
    openBankPreviewModal(preview);
  } catch (err) {
    if (examStatus) examStatus.textContent = err.message;
  }
};
const handleSelectedClick = (event) => {
  const target = event.target;
  const action = target.dataset.action;
  if (action !== "remove-selected") return;
  const questionId = target.dataset.questionId;
  if (!questionId) return;
  state.questions = state.questions.filter((q) => q.id !== questionId);
  renderSelectedQuestions();
  renderLatex();
  scheduleAutosave(true);
};

const buildHeader = (meta) => {
  const headerLines = [];
  headerLines.push("\\documentclass[twoside]{article}");
  headerLines.push("% Generato con exam-builder");
  headerLines.push(`\\newcommand{\\examdate}{${formatDateDisplay(meta.date)}}`);
  headerLines.push(`\\newcommand{\\examtitle}{${meta.title}}`);
  headerLines.push(`\\newcommand{\\examdepartment}{${meta.department}}`);
  headerLines.push(`\\newcommand{\\examuniversity}{${meta.university}}`);
  headerLines.push(`\\newcommand{\\examnote}{${meta.note}}`);
  headerLines.push(`\\newcommand{\\examlogo}{${meta.logo}}`);
  headerLines.push("");
  headerLines.push("\\usepackage{etoolbox}");
  headerLines.push("\\usepackage{circledtext}");
  headerLines.push(`\\ifdef{\\myoutput}{}{\\def\\myoutput{${meta.output}}}`);
  headerLines.push("\\ifdef{\\myversion}{}{\\def\\myversion{1}}");
  headerLines.push(`\\ifdef{\\mynumversions}{}{\\def\\mynumversions{${meta.versions}}}`);
  headerLines.push("");
  const mcexamOptions = [
    "output=\\myoutput",
    "numberofversions=\\mynumversions",
    "version=\\myversion",
    `randomizequestions=${meta.randomizeQuestions ? "true" : "false"}`,
    `randomizeanswers=${meta.randomizeAnswers ? "true" : "false"}`,
    `seed=${meta.seed}`,
    `writeRfile=${meta.writeR ? "true" : "false"}`,
  ];
  headerLines.push(`\\usepackage[${mcexamOptions.join(",\n            ")}]{mcexam}`);
  headerLines.push("\\usepackage{amsfonts}");
  headerLines.push("\\usepackage{geometry}");
  headerLines.push("\\geometry{verbose,tmargin=2.5cm,bmargin=3cm,lmargin=1.5cm,rmargin=1.5cm,headsep=1.5cm}");
  headerLines.push("\\usepackage{fancyhdr}");
  headerLines.push("\\usepackage{graphicx}");
  headerLines.push("");
  headerLines.push("\\pagestyle{fancy}");
  headerLines.push("\\fancyhead{}");
  headerLines.push("\\fancyfoot{}");
  headerLines.push("\\itemsep 0em");
  headerLines.push("\\renewcommand{\\headrulewidth}{0pt}");
  headerLines.push("\\setlength{\\headheight}{65pt}");
  headerLines.push("\\fancyhead[L]{\\includegraphics[height=1.5cm]{\\examlogo}}");
  headerLines.push("\\fancyhead[C]{\\raisebox{-2.0em}{\\makebox[\\headwidth][c]{%}");
  headerLines.push("Nome: \\underline{\\hspace{4cm}} \\quad Cognome: \\underline{\\hspace{4cm}} \\quad Matricola: \\underline{\\hspace{3cm}}}}}");
  headerLines.push("\\fancyhead[R]{{\\bf \\examtitle - \\mctheversion}\\\\");
  headerLines.push("\\examdepartment\\\\");
  headerLines.push("\\examuniversity - \\examdate\\\\");
  headerLines.push("\\footnotesize{\\emph{\\examnote}}}");
  headerLines.push("\\fancyfoot[L]{}");
  headerLines.push("\\fancyfoot[C]{\\footnotesize {\\em Legenda}: \\singola risposta singola, \\multipla risposta multipla}");
  headerLines.push("\\fancyfoot[R]{}");
  headerLines.push("\\usepackage{subfigure}");
  headerLines.push("\\usepackage{sectsty}");
  headerLines.push("\\newcommand{\\singola}{\\circledtext[charf=\\sffamily\\bfseries\\Large]{S} }");
  headerLines.push("\\newcommand{\\multipla}{\\circledtext[charf=\\sffamily\\bfseries\\Large]{M} }");
  headerLines.push("\\makeatletter");
  headerLines.push("\\renewcommand{\\mc@babel@Version}{V.}");
  headerLines.push("\\renewcommand{\\mcversionlabelfmt}[1]{\\arabic{#1}}");
  headerLines.push("\\renewcommand{\\mcquestionlabelfmt}[1]{Es.\\ \\arabic{#1}}");
  headerLines.push("\\makeatother");
  headerLines.push("");
  return headerLines;
};

const buildQuestionBlock = (question, index) => {
  const lines = [];
  const typeCmd = question.type === "multipla" ? "\\multipla" : "\\singola";
  lines.push(`% Es. ${index + 1}`);
  lines.push(`\\question ${typeCmd} ${question.text}`.trim());
  const answers = question.answers.filter((ans) => String(ans.text || "").trim() !== "");
  if (question.image && question.imageLayoutEnabled) {
    const leftWidth = question.imageWidthLeft || "0.5\\linewidth";
    const rightWidth = question.imageWidthRight || "0.5\\linewidth";
    const imageScale = question.imageScale || "0.96\\linewidth";
    lines.push("\\begin{mcanswers}");
    lines.push("  % Figura");
    lines.push(`  \\begin{minipage}{${leftWidth}}`);
    lines.push(`    \\includegraphics[width=${imageScale}]{${question.image}}`);
    lines.push("  \\end{minipage}");
    lines.push("  % Risposte");
    lines.push(`    \\begin{minipage}{${rightWidth}}`);
    lines.push("        \\begin{enumerate}[label=]");
    if (answers.length === 0) {
      lines.push("            % TODO: aggiungi risposte");
    } else {
      answers.forEach((answer, idx) => {
        const number = idx + 1;
        const prefix = answer.correct ? "\\answer[correct]" : "\\answer";
        lines.push(
          `            \\item\\answernum{${number}} ${prefix}{${number}}{${answer.text}}`.trim()
        );
      });
    }
    lines.push("        \\end{enumerate}");
    lines.push("    \\end{minipage}");
    lines.push("\\end{mcanswers}");
  } else {
    lines.push("\\begin{mcanswerslist}");
    if (answers.length === 0) {
      lines.push("% TODO: aggiungi risposte");
    } else {
      answers.forEach((answer) => {
        const prefix = answer.correct ? "\\answer[correct]" : "\\answer";
        lines.push(`${prefix} ${answer.text}`.trim());
      });
    }
    lines.push("\\end{mcanswerslist}");
  }
  lines.push("");
  return lines;
};

const renderLatex = () => {
  const meta = state.meta;
  const output = [];
  output.push(...buildHeader(meta));
  output.push("\\begin{document}");
  output.push("");
  output.push("\\begin{mcquestions}");
  output.push("");
  if (state.questions.length === 0) {
    output.push("% TODO: inserisci almeno una domanda");
  } else {
    state.questions.forEach((question, index) => {
      output.push(...buildQuestionBlock(question, index));
    });
  }
  output.push("\\end{mcquestions}");
  output.push("");
  output.push("\\end{document}");
  latexPreview.value = output.join("\n");
  updatePdfAvailability();
  updateSaveAvailability();
  updateTracesAvailability();
};

const updatePdfAvailability = () => {
  if (!generatePdfBtn) return;
  const canGenerate = state.questions.length >= 2;
  generatePdfBtn.disabled = !canGenerate;
  if (downloadPdfBtn) downloadPdfBtn.disabled = !canGenerate;
  if (pdfStatus && !canGenerate) {
    pdfStatus.textContent = "Aggiungi almeno 2 domande per generare il PDF.";
  }
  if (pdfStatus && canGenerate && pdfStatus.textContent.includes("almeno 2")) {
    pdfStatus.textContent = "";
  }
};

const updateTracesAvailability = () => {
  if (!generateTracesBtn) return;
  const canGenerate = currentExamLocked && state.questions.length >= 2;
  generateTracesBtn.disabled = !canGenerate;
  if (pdfStatus && !canGenerate && currentExamLocked) {
    pdfStatus.textContent = "Aggiungi almeno 2 domande per generare le tracce.";
  }
  if (pdfStatus && !currentExamLocked) {
    pdfStatus.textContent = "Chiudi la traccia per generare tutte le versioni.";
  }
};

const copyLatex = async () => {
  try {
    await navigator.clipboard.writeText(latexPreview.value);
    copyLatexBtn.textContent = "Copiato!";
    setTimeout(() => {
      copyLatexBtn.textContent = "Copia LaTeX";
    }, 1200);
  } catch {
    copyLatexBtn.textContent = "Errore";
    setTimeout(() => {
      copyLatexBtn.textContent = "Copia LaTeX";
    }, 1200);
  }
};

const downloadLatex = () => {
  const filename = `${state.meta.output || "exam"}.tex`;
  const blob = new Blob([latexPreview.value], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

const compilePdf = async () => {
  if (state.questions.length < 2) {
    if (pdfStatus) {
      pdfStatus.textContent = "mcexam richiede almeno 2 domande per compilare.";
    }
    return null;
  }
  if (pdfStatus) pdfStatus.textContent = "Compilazione in corso...";
  if (latexLogWrap) latexLogWrap.open = false;
  if (latexLogWrap) latexLogWrap.classList.add("is-hidden");
  if (latexLog) latexLog.textContent = "";
  try {
    const response = await fetch("/api/compile-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latex: latexPreview.value }),
    });
    if (!response.ok) {
      const info = await response.json().catch(() => ({}));
      if (pdfStatus) {
        pdfStatus.textContent = info.error || "Errore compilazione";
      }
      if (latexLog && info.log) {
        latexLog.textContent = info.log;
        if (latexLogWrap) latexLogWrap.classList.remove("is-hidden");
        if (latexLogWrap) latexLogWrap.open = true;
      }
      return null;
    }
    const blob = await response.blob();
    lastPdfBlob = blob;
    lastPdfLatex = latexPreview.value;
    return blob;
  } catch {
    if (pdfStatus) pdfStatus.textContent = "Errore compilazione";
    return null;
  }
};

const openPdfPreview = (blob) => {
  if (!pdfPreviewFrame || !pdfPreviewBackdrop || !pdfPreviewModal) return;
  const url = URL.createObjectURL(blob);
  pdfPreviewFrame.src = url;
  pdfPreviewModal.classList.remove("is-hidden");
  pdfPreviewBackdrop.classList.remove("is-hidden");
  pdfPreviewFrame.onload = () => URL.revokeObjectURL(url);
};

const closePdfPreview = () => {
  if (pdfPreviewBackdrop) pdfPreviewBackdrop.classList.add("is-hidden");
  if (pdfPreviewModal) pdfPreviewModal.classList.add("is-hidden");
  if (pdfPreviewFrame) pdfPreviewFrame.src = "";
};

const generatePdf = async () => {
  if (!generatePdfBtn) return;
  generatePdfBtn.disabled = true;
  const upToDate = lastPdfBlob && lastPdfLatex === latexPreview.value;
  const blob = upToDate ? lastPdfBlob : await compilePdf();
  if (blob) {
    openPdfPreview(blob);
    if (pdfStatus) pdfStatus.textContent = "Preview pronta.";
  }
  generatePdfBtn.disabled = false;
};

const downloadPdf = async () => {
  if (!downloadPdfBtn) return;
  downloadPdfBtn.disabled = true;
  const upToDate = lastPdfBlob && lastPdfLatex === latexPreview.value;
  const blob = upToDate ? lastPdfBlob : await compilePdf();
  if (blob) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${state.meta.output || "exam"}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);
    if (pdfStatus) pdfStatus.textContent = "PDF scaricato.";
  }
  downloadPdfBtn.disabled = false;
};

const generateTraces = async () => {
  if (!generateTracesBtn) return;
  if (!currentExamLocked) {
    if (pdfStatus) pdfStatus.textContent = "Chiudi la traccia per generare tutte le versioni.";
    return;
  }
  if (state.questions.length < 2) {
    if (pdfStatus) {
      pdfStatus.textContent = "mcexam richiede almeno 2 domande per compilare.";
    }
    return;
  }
  generateTracesBtn.disabled = true;
  if (pdfStatus) pdfStatus.textContent = "Generazione tracce in corso...";
  if (latexLogWrap) latexLogWrap.open = false;
  if (latexLogWrap) latexLogWrap.classList.add("is-hidden");
  if (latexLog) latexLog.textContent = "";
  try {
    const response = await fetch("/api/generate-traces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latex: latexPreview.value,
        versions: state.meta.versions,
      }),
    });
    if (!response.ok) {
      const info = await response.json().catch(() => ({}));
      if (pdfStatus) {
        pdfStatus.textContent = info.error || "Errore generazione tracce";
      }
      if (latexLog && info.log) {
        latexLog.textContent = info.log;
        if (latexLogWrap) latexLogWrap.classList.remove("is-hidden");
        if (latexLogWrap) latexLogWrap.open = true;
      }
      return;
    }
    const payload = await response.json();
    const combinedBlob = new Blob([Uint8Array.from(atob(payload.combinedPdfBase64), (c) => c.charCodeAt(0))], {
      type: "application/pdf",
    });
    const answersBlob = new Blob([Uint8Array.from(atob(payload.answersPdfBase64), (c) => c.charCodeAt(0))], {
      type: "application/pdf",
    });
    const download = (blob, name) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
      URL.revokeObjectURL(link.href);
    };
    download(combinedBlob, payload.combinedName || "tracce.pdf");
    download(answersBlob, payload.answersName || "tracce-answers.pdf");
    if (pdfStatus) pdfStatus.textContent = "Tracce generate.";
  } catch {
    if (pdfStatus) pdfStatus.textContent = "Errore generazione tracce";
  } finally {
    generateTracesBtn.disabled = false;
  }
};

const initMetaFields = () => {
  applyMetaToInputs();
};

const init = () => {
  initMetaFields();
  renderSelectedQuestions();
  renderLatex();
  updateStepUI();
  highlightMissingMeta();
  setLockedState(false);
  loadCourses().then(() => {
    if (bankCourseSelect && bankCourseSelect.value) {
      loadTopics(Number(bankCourseSelect.value), bankTopicSelect, "Tutti gli argomenti");
    } else {
      renderSelectOptions(bankTopicSelect, [], "Tutti gli argomenti");
    }
  });
  loadExamHistory();

  Object.keys(metaFields).forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", handleMetaInput);
    el.addEventListener("change", handleMetaInput);
  });

  if (bankList) bankList.addEventListener("click", handleBankClick);
  if (selectedList) selectedList.addEventListener("click", handleSelectedClick);
  copyLatexBtn.addEventListener("click", copyLatex);
  downloadLatexBtn.addEventListener("click", downloadLatex);
  if (generatePdfBtn) generatePdfBtn.addEventListener("click", generatePdf);
  if (downloadPdfBtn) downloadPdfBtn.addEventListener("click", downloadPdf);
  if (generateTracesBtn) generateTracesBtn.addEventListener("click", generateTraces);
  if (unlockExamBtn) unlockExamBtn.addEventListener("click", unlockExam);
  if (saveExamBtn) saveExamBtn.addEventListener("click", () => saveExam(false));
  if (lockExamBtn) lockExamBtn.addEventListener("click", lockExam);
  if (newExamBtn) {
    newExamBtn.addEventListener("click", () => {
      resetExamState();
      openNewExamModal();
    });
  }
  if (refreshBankBtn) refreshBankBtn.addEventListener("click", refreshQuestionBank);
  if (bankCourseSelect) {
    bankCourseSelect.addEventListener("change", () => {
      loadTopics(Number(bankCourseSelect.value), bankTopicSelect, "Tutti gli argomenti");
      refreshQuestionBank();
    });
  }
  if (bankTopicSelect) {
    bankTopicSelect.addEventListener("change", refreshQuestionBank);
  }
  if (bankSearchInput) {
    bankSearchInput.addEventListener("input", refreshQuestionBank);
  }
  if (bankTopicChips) {
    bankTopicChips.addEventListener("click", (event) => {
      const target = event.target;
      if (!target.classList.contains("chip-action")) return;
      const topicId = target.dataset.topicId || "";
      if (bankTopicSelect) bankTopicSelect.value = topicId;
      refreshQuestionBank();
    });
  }
  if (historyCourseSelect) historyCourseSelect.addEventListener("change", loadExamHistory);
  if (historyStatusSelect) historyStatusSelect.addEventListener("change", loadExamHistory);
  if (historySearchInput) historySearchInput.addEventListener("input", loadExamHistory);
  if (historyDateInput) historyDateInput.addEventListener("input", loadExamHistory);
  if (toggleHistoryFiltersBtn && historyFilters) {
    toggleHistoryFiltersBtn.addEventListener("click", () => {
      historyFilters.classList.toggle("is-hidden");
    });
  }
  if (openSettingsBtn && settingsDrawer && settingsBackdrop) {
    openSettingsBtn.addEventListener("click", () => {
      settingsDrawer.classList.remove("is-hidden");
      settingsBackdrop.classList.remove("is-hidden");
    });
  }
  const closeSettings = () => {
    if (settingsDrawer) settingsDrawer.classList.add("is-hidden");
    if (settingsBackdrop) settingsBackdrop.classList.add("is-hidden");
  };
  if (closeSettingsBtn) closeSettingsBtn.addEventListener("click", closeSettings);
  if (settingsBackdrop) settingsBackdrop.addEventListener("click", closeSettings);
  if (newExamCloseBtn) newExamCloseBtn.addEventListener("click", closeNewExamModal);
  if (newExamCancelBtn) newExamCancelBtn.addEventListener("click", closeNewExamModal);
  if (newExamBackdrop) newExamBackdrop.addEventListener("click", closeNewExamModal);
  if (newBankQuestionBtn) newBankQuestionBtn.addEventListener("click", openBankQuestionModal);
  if (bankQuestionCloseBtn) bankQuestionCloseBtn.addEventListener("click", closeBankQuestionModal);
  if (bankQuestionBackdrop) bankQuestionBackdrop.addEventListener("click", closeBankQuestionModal);
  if (bankQuestionReset) bankQuestionReset.addEventListener("click", resetBankQuestion);
  if (bankQuestionSave) bankQuestionSave.addEventListener("click", saveBankQuestion);
  if (bankQuestionAddAnswer) {
    bankQuestionAddAnswer.addEventListener("click", () => {
      bankQuestionState.answers.push({ text: "", correct: false });
      renderBankQuestionAnswers();
    });
  }
  if (bankQuestionType) {
    bankQuestionType.addEventListener("change", () => {
      bankQuestionState.type = bankQuestionType.value;
      if (bankQuestionState.type === "singola") {
        const first = bankQuestionState.answers.findIndex((a) => a.correct);
        bankQuestionState.answers.forEach((a, idx) => {
          a.correct = idx === (first >= 0 ? first : 0);
        });
        renderBankQuestionAnswers();
      }
    });
  }
  if (bankQuestionText && bankQuestionPreview) {
    bankQuestionText.addEventListener("input", () => {
      bankQuestionState.text = bankQuestionText.value;
      renderMathPreview(bankQuestionText.value, bankQuestionPreview, bankQuestionText);
    });
  }
  if (bankQuestionImageLayout && bankQuestionLayoutFields) {
    bankQuestionImageLayout.addEventListener("change", () => {
      bankQuestionState.imageLayoutEnabled = bankQuestionImageLayout.checked;
      bankQuestionLayoutFields.classList.toggle("is-hidden", !bankQuestionImageLayout.checked);
    });
  }
  if (bankQuestionCourse) {
    bankQuestionCourse.addEventListener("change", () => {
      const courseId = Number(bankQuestionCourse.value || "");
      loadTopics(courseId, bankQuestionTopics, "Seleziona argomenti");
    });
  }
  if (bankQuestionPickImage) {
    bankQuestionPickImage.addEventListener("click", () => {
      const courseId = Number(bankQuestionCourse?.value || "");
      openImagePicker({ courseId, target: { type: "bankModal" } });
    });
  }
  if (examStatus) {
    const observer = new MutationObserver(() => {
      const message = examStatus.textContent.trim();
      if (!message) return;
      const tone = message.toLowerCase().includes("errore") ? "error" : "success";
      showToast(message, tone);
      examStatus.textContent = "";
    });
    observer.observe(examStatus, { childList: true, characterData: true, subtree: true });
  }
  if (bankPreviewCloseBtn) bankPreviewCloseBtn.addEventListener("click", closeBankPreviewModal);
  if (bankPreviewBackdrop) bankPreviewBackdrop.addEventListener("click", closeBankPreviewModal);
  if (pdfPreviewCloseBtn) pdfPreviewCloseBtn.addEventListener("click", closePdfPreview);
  if (pdfPreviewBackdrop) pdfPreviewBackdrop.addEventListener("click", closePdfPreview);
  if (builderImagePickerCloseBtn) builderImagePickerCloseBtn.addEventListener("click", closeImagePicker);
  if (builderImagePickerBackdrop) builderImagePickerBackdrop.addEventListener("click", closeImagePicker);
  if (builderImagePreviewCloseBtn) builderImagePreviewCloseBtn.addEventListener("click", closeImagePreview);
  if (builderImagePreviewBackdrop) builderImagePreviewBackdrop.addEventListener("click", closeImagePreview);
  stepButtons.forEach((btn) => {
    btn.addEventListener("click", () => goToStep(btn.dataset.stepTarget));
  });
};

init();
