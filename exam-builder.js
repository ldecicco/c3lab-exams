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
let currentExamHasResults = false;
let activeCourseId = null;
let autosaveTimer = null;
let currentStep = 1;
const totalSteps = 3;
let courseTopics = [];
let bankTopicFilter = null;
let activeImageQuestionId = null;
let lastPdfBlob = null;
let lastPdfLatex = "";
let imagePickerTarget = null;
let examStatsCache = {};

const metaFields = {
  metaExamName: "examName",
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
const saveExamBtn = document.getElementById("saveExam");
const lockExamBtn = document.getElementById("lockExam");
const unlockExamBtn = document.getElementById("unlockExam");
const newExamBtn = document.getElementById("newExam");
const examHistory = document.getElementById("examHistory");
const confirmBackdrop = document.getElementById("confirmBackdrop");
const confirmModal = document.getElementById("confirmModal");
const confirmClose = document.getElementById("confirmClose");
const confirmCancel = document.getElementById("confirmCancel");
const confirmConfirm = document.getElementById("confirmConfirm");
const confirmMessage = document.getElementById("confirmMessage");
let confirmCallback = null;
const examStatus = document.getElementById("examStatus");
const toastNotify = document.getElementById("toastNotify");
const openSettingsBtn = document.getElementById("openSettings");
const closeSettingsBtn = document.getElementById("closeSettings");
const settingsDrawer = document.getElementById("settingsDrawer");
const settingsBackdrop = document.getElementById("settingsBackdrop");
const historyStatusSelect = document.getElementById("historyStatus");
const historySearchInput = document.getElementById("historySearch");
const historyDateInput = document.getElementById("historyDate");
const historyFilters = document.getElementById("historyFilters");
const toggleHistoryFiltersBtn = document.getElementById("toggleHistoryFilters");
const newExamBackdrop = document.getElementById("newExamBackdrop");
const newExamModal = document.getElementById("newExamModal");
const newExamCloseBtn = document.getElementById("newExamClose");
const newExamCancelBtn = document.getElementById("newExamCancel");
const bankPreviewBackdrop = document.getElementById("bankPreviewBackdrop");
const bankPreviewModal = document.getElementById("bankPreviewModal");
const bankPreviewCloseBtn = document.getElementById("bankPreviewClose");
const bankPreviewBody = document.getElementById("bankPreviewBody");
const pdfPreviewBackdrop = document.getElementById("pdfPreviewBackdrop");
const pdfPreviewModal = document.getElementById("pdfPreviewModal");
const pdfPreviewCloseBtn = document.getElementById("pdfPreviewClose");
const pdfPreviewFrame = document.getElementById("pdfPreviewFrame");
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
const courseEmptyState = document.getElementById("courseEmptyState");
const mainLayout = document.getElementById("mainLayout");
const traceProgress = document.getElementById("traceProgress");
const traceProgressText = document.getElementById("traceProgressText");
const traceProgressFill = document.getElementById("traceProgressFill");

const createQuestion = () => ({
  id: String(nextQuestionId++),
  sourceId: null,
  type: "singola",
  text: "",
  note: "",
  image: "",
  imageWidthLeft: "0.5\\linewidth",
  imageWidthRight: "0.5\\linewidth",
  imageScale: "0.96\\linewidth",
  imageLayoutEnabled: false,
  imageLayoutMode: "side",
  imagePreset: "50-50",
  topics: [],
  answers: [
    { text: "", correct: false, note: "" },
    { text: "", correct: false, note: "" },
    { text: "", correct: false, note: "" },
    { text: "", correct: false, note: "" },
  ],
});

const createEl = (tag, className, text) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};

const apiFetch = typeof window.apiFetch === "function" ? window.apiFetch : fetch;
const bindModal = typeof window.bindModal === "function" ? window.bindModal : null;

const confirmModalApi = bindModal
  ? bindModal({
      modal: confirmModal,
      backdrop: confirmBackdrop,
      closers: [confirmClose, confirmCancel],
    })
  : null;
const newExamModalApi = bindModal
  ? bindModal({
      modal: newExamModal,
      backdrop: newExamBackdrop,
      closers: [newExamCloseBtn, newExamCancelBtn],
    })
  : null;
const bankPreviewModalApi = bindModal
  ? bindModal({
      modal: bankPreviewModal,
      backdrop: bankPreviewBackdrop,
      closers: [bankPreviewCloseBtn],
    })
  : null;
const pdfPreviewModalApi = bindModal
  ? bindModal({
      modal: pdfPreviewModal,
      backdrop: pdfPreviewBackdrop,
      closers: [pdfPreviewCloseBtn],
    })
  : null;
const builderImagePickerApi = bindModal
  ? bindModal({
      modal: builderImagePickerModal,
      backdrop: builderImagePickerBackdrop,
      closers: [builderImagePickerCloseBtn],
    })
  : null;
const builderImagePreviewApi = bindModal
  ? bindModal({
      modal: builderImagePreviewModal,
      backdrop: builderImagePreviewBackdrop,
      closers: [builderImagePreviewCloseBtn],
    })
  : null;

const fetchActiveCourse = async () => {
  try {
    const res = await fetch("api/session/course");
    if (!res.ok) return null;
    const payload = await res.json();
    return payload.course || null;
  } catch {
    return null;
  }
};

const fetchActiveExam = async () => {
  try {
    const res = await fetch("api/session/exam");
    if (!res.ok) return null;
    const payload = await res.json();
    return payload.exam || null;
  } catch {
    return null;
  }
};

const setActiveExam = async (examId) => {
  if (!Number.isFinite(Number(examId))) return;
  try {
    await apiFetch("/api/session/exam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId }),
    });
  } catch {
    // ignore
  }
};

const normalizeDateToInput =
  typeof window.normalizeDateToInput === "function"
    ? window.normalizeDateToInput
    : (value) => value;

const formatDateDisplay =
  typeof window.formatDateDisplay === "function"
    ? window.formatDateDisplay
    : (value) => value;

const setLockedState = (locked) => {
  currentExamLocked = locked;
  if (lockExamBtn) lockExamBtn.disabled = locked || !currentExamId;
  if (unlockExamBtn) {
    unlockExamBtn.classList.toggle("is-hidden", !locked);
    unlockExamBtn.disabled = Boolean(currentExamHasResults);
    unlockExamBtn.title = currentExamHasResults
      ? "Esistono risultati salvati: svuota i risultati per sbloccare."
      : "";
  }
  const statusText = currentExamId
    ? locked
      ? "Traccia chiusa."
      : "Bozza attiva."
    : "Nessuna traccia.";
  const main = document.querySelector("main");
  if (!main) return;
  const controls = main.querySelectorAll("input, select, textarea, button");
  controls.forEach((el) => {
    const id = el.id || "";
    const isStepper = el.dataset && el.dataset.stepTarget;
    const inHistory = el.closest("#historySection");
    const inNewExam = el.closest("#newExamModal");
    const inSettings = el.closest("#settingsDrawer");
    const allow =
      isStepper ||
      inHistory ||
      inNewExam ||
      inSettings ||
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
  if (builderImagePreviewApi) {
    builderImagePreviewApi.open();
  } else if (typeof window.openModal === "function") {
    window.openModal(builderImagePreviewModal, builderImagePreviewBackdrop);
  } else {
    builderImagePreviewBackdrop.classList.remove("is-hidden");
    builderImagePreviewModal.classList.remove("is-hidden");
  }
};

const closeImagePreview = () => {
  if (builderImagePreviewApi) {
    builderImagePreviewApi.close();
  } else if (typeof window.closeModal === "function") {
    window.closeModal(builderImagePreviewModal, builderImagePreviewBackdrop);
  } else {
    if (builderImagePreviewBackdrop) builderImagePreviewBackdrop.classList.add("is-hidden");
    if (builderImagePreviewModal) builderImagePreviewModal.classList.add("is-hidden");
  }
  if (builderImagePreviewImg) builderImagePreviewImg.src = "";
};

const renderImagePickerList = (images) => {
  if (!builderImagePickerList) return;
  builderImagePickerList.innerHTML = "";
  if (!images.length) {
    builderImagePickerList.textContent = "Nessuna immagine disponibile.";
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
      if (imagePickerTarget?.type === "question") {
        const targetQuestion = state.questions.find(
          (question) => question.id === imagePickerTarget.questionId
        );
        if (targetQuestion) {
          targetQuestion.image = filePath;
          targetQuestion.imageLayoutEnabled = true;
          renderSelectedQuestions();
          renderLatex();
          scheduleAutosave(true);
        }
      }
      closeImagePicker();
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
      builderImagePickerStatus.textContent = "Nessun corso attivo.";
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
  if (builderImagePickerApi) {
    builderImagePickerApi.open();
  } else if (typeof window.openModal === "function") {
    window.openModal(builderImagePickerModal, builderImagePickerBackdrop);
  } else {
    if (builderImagePickerBackdrop) builderImagePickerBackdrop.classList.remove("is-hidden");
    if (builderImagePickerModal) builderImagePickerModal.classList.remove("is-hidden");
  }
};

const closeImagePicker = () => {
  if (builderImagePickerApi) {
    builderImagePickerApi.close();
  } else if (typeof window.closeModal === "function") {
    window.closeModal(builderImagePickerModal, builderImagePickerBackdrop);
  } else {
    if (builderImagePickerBackdrop) builderImagePickerBackdrop.classList.add("is-hidden");
    if (builderImagePickerModal) builderImagePickerModal.classList.add("is-hidden");
  }
  activeImageQuestionId = null;
  imagePickerTarget = null;
};

const openNewExamModal = () => {
  if (newExamModalApi) {
    newExamModalApi.open();
  } else if (typeof window.openModal === "function") {
    window.openModal(newExamModal, newExamBackdrop);
  } else {
    if (newExamBackdrop) newExamBackdrop.classList.remove("is-hidden");
    if (newExamModal) newExamModal.classList.remove("is-hidden");
  }
};

const closeNewExamModal = () => {
  if (newExamModalApi) {
    newExamModalApi.close();
  } else if (typeof window.closeModal === "function") {
    window.closeModal(newExamModal, newExamBackdrop);
  } else {
    if (newExamBackdrop) newExamBackdrop.classList.add("is-hidden");
    if (newExamModal) newExamModal.classList.add("is-hidden");
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
      examStatus.textContent = "Compila nome traccia per proseguire.";
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
  if (currentStep === 2) {
    refreshQuestionBank();
  }
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

const showToast =
  typeof window.showToast === "function" ? window.showToast : () => {};

let toastTimer = null;

const showLoadingToast = (message) => {
  if (!toastNotify) return;
  if (toastTimer) clearTimeout(toastTimer);
  toastNotify.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${message}`;
  toastNotify.classList.remove("is-error", "is-success");
  toastNotify.classList.add("is-loading", "show");
};

const hideLoadingToast = () => {
  if (!toastNotify) return;
  toastNotify.classList.remove("show", "is-loading");
};

const openConfirmModal = (message, onConfirm) => {
  if (!confirmModal || !confirmBackdrop) return;
  if (confirmMessage) confirmMessage.textContent = message;
  confirmCallback = onConfirm;
  if (confirmModalApi) {
    confirmModalApi.open();
  } else if (typeof window.openModal === "function") {
    window.openModal(confirmModal, confirmBackdrop);
  } else {
    confirmBackdrop.classList.remove("is-hidden");
    confirmModal.classList.remove("is-hidden");
  }
};

const closeConfirmModal = () => {
  if (confirmModalApi) {
    confirmModalApi.close();
  } else if (typeof window.closeModal === "function") {
    window.closeModal(confirmModal, confirmBackdrop);
  } else {
    if (confirmBackdrop) confirmBackdrop.classList.add("is-hidden");
    if (confirmModal) confirmModal.classList.add("is-hidden");
  }
  confirmCallback = null;
};

const resetExamState = () => {
  currentExamId = null;
  currentExamLocked = false;
  currentExamHasResults = false;
  clearTimeout(autosaveTimer);
  autosaveTimer = null;
  state.meta.examName = "";
  state.meta.courseId = Number.isFinite(activeCourseId) ? activeCourseId : null;
  state.meta.isDraft = true;
  courseTopics = [];
  state.questions = [];
  nextQuestionId = 1;
  state.meta.date = normalizeDateToInput(state.meta.date || "");
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
    if (typeof state.meta[key] === "boolean") {
      el.checked = Boolean(state.meta[key]);
    } else {
      el.value = state.meta[key] ?? "";
    }
  });
};

const loadCourseTopics = async (courseId) => {
  if (!Number.isFinite(courseId)) {
    courseTopics = [];
    bankTopicFilter = null;
    renderSelectedQuestions();
    renderTopicChips();
    return;
  }
  try {
    const payload = await apiFetch(`/api/topics?courseId=${courseId}`);
    courseTopics = payload.topics || [];
    if (!courseTopics.some((topic) => String(topic.id) === String(bankTopicFilter))) {
      bankTopicFilter = null;
    }
    renderSelectedQuestions();
    renderTopicChips();
  } catch (err) {
    courseTopics = [];
    bankTopicFilter = null;
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
  if (!bankTopicFilter) allChip.classList.add("active");
  bankTopicChips.appendChild(allChip);
  courseTopics.forEach((topic) => {
    const chip = createEl("button", "chip chip-action", topic.name);
    chip.type = "button";
    chip.dataset.topicId = String(topic.id);
    if (String(bankTopicFilter) === String(topic.id)) {
      chip.classList.add("active");
    }
    bankTopicChips.appendChild(chip);
  });
};

const refreshQuestionBank = async () => {
  if (!bankList) return;
  const courseId = Number(state.meta.courseId);
  const topicId = bankTopicFilter ? Number(bankTopicFilter) : null;
  const search = String(bankSearchInput?.value || "").trim();
  const params = new URLSearchParams();
  if (Number.isFinite(courseId)) params.set("courseId", String(courseId));
  if (Number.isFinite(topicId)) params.set("topicId", String(topicId));
  if (search) params.set("search", search);
  try {
    params.set("includeAnswers", "1");
    params.set("unusedOnly", "1");
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
    const empty = createEl("div", "empty-state");
    const content = createEl("div", "empty-state-content");
    const title = createEl("strong", null, "Nessuna domanda trovata.");
    const link = createEl("a", "btn btn-primary", "+ Aggiungi domanda");
    link.href = "questions";
    content.appendChild(title);
    content.appendChild(link);
    empty.appendChild(content);
    bankList.appendChild(empty);
    return;
  }
  if (bankTopicChips) {
    const active = bankTopicFilter || "";
    Array.from(bankTopicChips.querySelectorAll(".chip-action")).forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.topicId === active);
    });
  }
  if (window.QuestionCards && typeof window.QuestionCards.renderBankCard === "function") {
    questions.forEach((question) => {
      const item = window.QuestionCards.renderBankCard(question, {
        renderMath: renderMathDisplay,
        formatDate: formatDateDisplay,
        answersMode: "accordion",
        actions: (q) => [
          {
            label: "Importa",
            className: "btn btn-outline-primary btn-sm",
            onClick: () => importQuestionFromBank(q.id),
          },
        ],
      });
      bankList.appendChild(item);
    });
    renderTopicChips();
    return;
  }
  questions.forEach((question) => {
    const item = createEl("div", "list-item");
    const band = createEl("div", "question-card-band");
    const badgeRow = createEl("div", "chip-row");
    const typeChip = createEl(
      "span",
      "chip chip-action",
      question.type === "multipla" ? "Multipla" : "Singola"
    );
    badgeRow.appendChild(typeChip);
    if (question.last_exam_title || question.last_exam_date) {
      const dateLabel = question.last_exam_date
        ? formatDateDisplay(question.last_exam_date)
        : "";
      const titleLabel = question.last_exam_title || "Esame";
      const label = dateLabel ? `${titleLabel} · ${dateLabel}` : titleLabel;
      const examChip = createEl("span", "chip chip-action", `Usata: ${label}`);
      badgeRow.appendChild(examChip);
    }
    band.appendChild(badgeRow);
    const content = createEl("div", "question-card-content");
    const preview = createEl("div", "bank-question-preview");
    renderQuestionPreviewBody(
      preview,
      {
        ...question,
        note: question.note || "",
        imagePath: question.image_path || question.imagePath || "",
        imageThumbnailPath: question.image_thumbnail_path || question.imageThumbnailPath || "",
        imageLayoutEnabled: Boolean(question.image_layout_enabled ?? question.imageLayoutEnabled),
        imageLayoutMode: question.image_layout_mode || question.imageLayoutMode || "side",
        imageLeftWidth: question.image_left_width || question.imageLeftWidth || "",
        imageRightWidth: question.image_right_width || question.imageRightWidth || "",
        imageScale: question.image_scale || question.imageScale || "",
        answers: (question.answers || []).map((ans) => ({
          text: ans.text,
          note: ans.note || "",
          isCorrect: Boolean(ans.isCorrect || ans.is_correct),
        })),
      },
      { answersMode: "accordion" }
    );
    const topicsRow = createEl("div", "chip-row");
    if (question.topics && question.topics.length) {
      question.topics.forEach((topic) => {
        const chip = createEl("span", "chip chip-action", topic);
        topicsRow.appendChild(chip);
      });
    } else {
      const chip = createEl("span", "chip chip-action", "Nessun argomento");
      topicsRow.appendChild(chip);
    }
    const actions = createEl("div", "list-actions");
    const btn = createEl("button", "btn btn-outline-primary btn-sm", "Importa");
    btn.type = "button";
    btn.addEventListener("click", () => importQuestionFromBank(question.id));
    actions.appendChild(btn);
    content.appendChild(preview);
    content.appendChild(topicsRow);
    content.appendChild(actions);
    item.appendChild(band);
    item.appendChild(content);
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
    if (question.note) {
      const noteWrap = createEl("div", "public-question-note");
      noteWrap.innerHTML = "<strong>Nota:</strong>";
      const noteBody = createEl("div", "public-question-note-body");
      renderMathDisplay(question.note, noteBody);
      noteWrap.appendChild(noteBody);
      body.appendChild(noteWrap);
    }
    if (question.image) {
      const imgWrap = createEl("div", "selected-question-image");
      const img = createEl("img", "selected-preview-thumb");
      img.src = question.imageThumbnail || question.image;
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
        if (answer.note) {
          const noteWrap = createEl("div", "selected-answer-note");
          noteWrap.innerHTML = "<strong>Nota:</strong>";
          const noteBody = createEl("div", "selected-answer-note-body");
          renderMathDisplay(answer.note, noteBody);
          noteWrap.appendChild(noteBody);
          row.appendChild(noteWrap);
        }
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
    const editBtn = createEl("button", "btn btn-outline-secondary btn-sm", "Modifica");
    editBtn.type = "button";
    editBtn.dataset.action = "edit-selected";
    if (question.sourceId) {
      editBtn.dataset.questionId = question.sourceId;
    } else {
      editBtn.disabled = true;
    }
    actions.appendChild(editBtn);
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

const renderQuestionPreviewBody = (container, question, options = {}) => {
  if (!container || !question) return;
  if (window.QuestionCards && typeof window.QuestionCards.renderPreview === "function") {
    window.QuestionCards.renderPreview(container, question, {
      renderMath: renderMathDisplay,
      ...options,
    });
  }
};

const openBankPreviewModal = (question) => {
  if (!bankPreviewModal || !bankPreviewBackdrop || !bankPreviewBody) return;
  renderQuestionPreviewBody(bankPreviewBody, question);
  if (bankPreviewModalApi) {
    bankPreviewModalApi.open();
  } else if (typeof window.openModal === "function") {
    window.openModal(bankPreviewModal, bankPreviewBackdrop);
  } else {
    bankPreviewModal.classList.remove("is-hidden");
    bankPreviewBackdrop.classList.remove("is-hidden");
  }
};

const closeBankPreviewModal = () => {
  if (bankPreviewModalApi) {
    bankPreviewModalApi.close();
  } else if (typeof window.closeModal === "function") {
    window.closeModal(bankPreviewModal, bankPreviewBackdrop);
  } else {
    if (bankPreviewModal) bankPreviewModal.classList.add("is-hidden");
    if (bankPreviewBackdrop) bankPreviewBackdrop.classList.add("is-hidden");
  }
  if (bankPreviewBody) bankPreviewBody.innerHTML = "";
};

const importQuestionFromBank = async (questionId) => {
  try {
    const payload = await apiFetch(`/api/questions/${questionId}`);
    const q = payload.question;
    const newQuestion = createQuestion();
    newQuestion.type = q.type || "singola";
    newQuestion.text = q.text || "";
    newQuestion.note = q.note || "";
    newQuestion.sourceId = q.id;
    newQuestion.image = q.imagePath || "";
    newQuestion.imageThumbnail = q.imageThumbnailPath || "";
    newQuestion.imageLayoutEnabled = Boolean(
      q.imageLayoutEnabled ?? q.image_layout_enabled
    );
    newQuestion.imageLayoutMode =
      q.imageLayoutMode || q.image_layout_mode || "side";
    newQuestion.imageWidthLeft = q.imageLeftWidth || newQuestion.imageWidthLeft;
    newQuestion.imageWidthRight = q.imageRightWidth || newQuestion.imageWidthRight;
    newQuestion.imageScale = q.imageScale || newQuestion.imageScale;
    newQuestion.topics = Array.isArray(q.topics) ? q.topics : [];
    newQuestion.answers = (q.answers || []).map((answer) => ({
      text: answer.text,
      correct: Boolean(answer.isCorrect),
      note: answer.note || "",
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
  if (metaExamNameInput) {
    metaExamNameInput.classList.toggle("input-error", missingExamName);
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
  questions: state.questions.map((question) => {
    if (question.sourceId) {
      return { questionId: question.sourceId };
    }
    return {
      text: question.text,
      type: question.type,
      imagePath: question.image,
      imageLayoutEnabled: question.imageLayoutEnabled,
      imageLayoutMode: question.imageLayoutMode || "side",
      imageLeftWidth: question.imageWidthLeft,
      imageRightWidth: question.imageWidthRight,
      imageScale: question.imageScale,
      topics: question.topics || [],
      answers: question.answers.map((answer) => ({
        text: answer.text,
        isCorrect: Boolean(answer.correct),
      })),
    };
  }),
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
  const statusRaw = historyStatusSelect?.value || "all";
  const searchRaw = String(historySearchInput?.value || "").trim().toLowerCase();
  const dateRaw = String(historyDateInput?.value || "").trim();
  const courseId = Number(state.meta.courseId);
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
    examStatsCache = await loadExamStats();
    renderExamHistory(filtered);
  } catch (err) {
    examHistory.textContent = err.message;
  }
};

const loadExamStats = async () => {
  try {
    const payload = await apiFetch("/api/exams/stats");
    return payload.stats || {};
  } catch {
    return {};
  }
};

const renderExamHistory = (exams) => {
  if (!examHistory || !window.ExamCards) return;
  ExamCards.render(examHistory, exams, {
    emptyText: "Nessuna traccia salvata.",
    stats: examStatsCache,
    dateFormatter: formatDateDisplay,
    actions: (exam) => {
      const hasResults = Boolean(exam.has_results || exam.hasResults);
      return [
        {
          label: "Carica",
          className: "btn btn-outline-primary btn-sm",
          onClick: () => loadExam(exam.id),
        },
        {
          label: "Duplica",
          className: "btn btn-outline-secondary btn-sm",
          onClick: () => duplicateExam(exam.id),
        },
        {
          label: "Svuota risultati",
          className: "btn btn-outline-warning btn-sm",
          hidden: !hasResults,
          onClick: () => clearExamResults(exam.id),
        },
        {
          label: "Elimina",
          className: "btn btn-outline-danger btn-sm",
          disabled: hasResults,
          title: hasResults
            ? "Esistono risultati salvati: svuota i risultati per eliminare."
            : "",
          onClick: () => deleteExam(exam.id, hasResults),
        },
      ];
    },
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
    if (examStatus) examStatus.textContent = "Compila nome traccia.";
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
    setActiveExam(currentExamId);
    if (examStatus) examStatus.textContent = "Bozza creata.";
    setLockedState(false);
    await loadExamHistory();
    closeNewExamModal();
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
    if (lockExamBtn) {
      lockExamBtn.disabled = true;
      lockExamBtn.classList.add("is-loading");
    }
    showToast("Chiusura traccia in corso...", "info");
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
  } finally {
    if (lockExamBtn) lockExamBtn.classList.remove("is-loading");
  }
};

const unlockExam = async () => {
  if (!currentExamId) return;
  if (currentExamHasResults) {
    if (examStatus) examStatus.textContent = "Impossibile sbloccare: esistono risultati salvati.";
    return;
  }
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
    currentExamHasResults = Boolean(payload.exam.hasResults);
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
      item.sourceId = question.id || null;
      item.image = question.imagePath || "";
      item.imageThumbnail = question.imageThumbnailPath || "";
      item.imageLayoutEnabled = Boolean(
        question.imageLayoutEnabled ?? question.image_layout_enabled
      );
      item.imageLayoutMode =
        question.imageLayoutMode || question.image_layout_mode || "side";
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
    await loadCourseTopics(state.meta.courseId);
    renderSelectedQuestions();
    renderLatex();
    if (examStatus) examStatus.textContent = "Traccia caricata.";
    setLockedState(!state.meta.isDraft);
    setActiveExam(currentExamId);
  } catch (err) {
    if (examStatus) examStatus.textContent = err.message;
  }
};

const deleteExam = async (examId, hasResults) => {
  if (hasResults) {
    if (examStatus) {
      examStatus.textContent = "Impossibile eliminare: esistono risultati salvati.";
    }
    return;
  }
  openConfirmModal(
    "Operazione irreversibile: verranno eliminati tutti i risultati e le sessioni.",
    async () => {
      try {
        await apiFetch(`/api/exams/${examId}`, { method: "DELETE" });
        if (currentExamId === examId) {
          currentExamId = null;
          currentExamHasResults = false;
        }
        await loadExamHistory();
      } catch (err) {
        if (examStatus) examStatus.textContent = err.message;
      }
    }
  );
};

const clearExamResults = async (examId) => {
  openConfirmModal(
    "Operazione irreversibile: verranno eliminati tutti i risultati e le sessioni.",
    async () => {
      try {
        await apiFetch(`/api/exams/${examId}/clear-results`, { method: "POST" });
        if (currentExamId === examId) {
          currentExamHasResults = false;
          setLockedState(currentExamLocked);
        }
        await loadExamHistory();
        showToast("Risultati eliminati.", "success");
      } catch (err) {
        if (examStatus) examStatus.textContent = err.message;
      }
    }
  );
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
      imageThumbnail: q.imageThumbnailPath || "",
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
  if (action === "remove-selected") {
    const questionId = target.dataset.questionId;
    if (!questionId) return;
    state.questions = state.questions.filter((q) => q.id !== questionId);
    renderSelectedQuestions();
    renderLatex();
    scheduleAutosave(true);
    return;
  }
  if (action === "edit-selected") {
    const questionId = target.dataset.questionId;
    if (!questionId) return;
    const baseTag = document.querySelector("base");
    const baseHref = baseTag ? baseTag.getAttribute("href") || "/" : "/";
    const prefix = baseHref.endsWith("/") ? baseHref : `${baseHref}/`;
    window.location.href = `${prefix}questions?editQuestion=${questionId}`;
  }
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
  headerLines.push("\\fancyhead[LO]{\\raisebox{1.2em}{\\includegraphics[height=1.5cm]{\\examlogo}}}");
  headerLines.push("\\fancyhead[CO]{\\raisebox{-2em}{\\makebox[\\headwidth][c]{%}");
  headerLines.push("Nome: \\underline{\\hspace{4cm}} \\quad Cognome: \\underline{\\hspace{4cm}} \\quad Matricola: \\underline{\\hspace{3cm}}}}}");
  headerLines.push(
    "\\fancyhead[RO]{\\raisebox{4.2em}{\\parbox[t]{\\headwidth}{\\raggedleft"
  );
  headerLines.push("{\\bf \\examtitle - \\mctheversion}\\par");
  headerLines.push("\\examdepartment\\par");
  headerLines.push("\\examuniversity - \\examdate\\par");
  headerLines.push("\\footnotesize{\\emph{\\examnote}}}}}");
  headerLines.push("\\fancyfoot[L]{}");
  headerLines.push("\\fancyfoot[C]{\\footnotesize {\\em Legenda}: \\singola risposta singola, \\multipla risposta multipla}");
  headerLines.push("\\fancyfoot[R]{}");
  headerLines.push("\\makeatletter");
  headerLines.push("\\patchcmd\\@outputpage{\\headheight}{\\ifodd\\count\\z@ 1.5cm\\else 0.5cm\\fi}{}{}");
  headerLines.push("\\patchcmd\\@outputpage{\\headsep}{\\ifodd\\count\\z@ 1.5cm\\else 0cm\\fi}{}{}");
  headerLines.push("\\patchcmd\\@outputpage{\\global\\@colht\\textheight}{\\global\\advance\\textheight by\\ifodd\\count\\z@ 2.5cm\\else -2.5cm\\fi\\global\\@colht\\textheight}{}{}");
  headerLines.push("\\makeatother");
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
    const imageScale = question.imageScale || "0.96\\linewidth";
    const layoutMode = question.imageLayoutMode || question.image_layout_mode || "side";
    if (layoutMode === "below") {
      lines.push("\\begin{center}");
      lines.push(`  \\includegraphics[width=${imageScale}]{${question.image}}`);
      lines.push("\\end{center}");
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
    } else {
      const leftWidth = question.imageWidthLeft || "0.5\\linewidth";
      const rightWidth = question.imageWidthRight || "0.5\\linewidth";
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
    }
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
    const response = await fetch("api/compile-pdf", {
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
  if (pdfPreviewModalApi) {
    pdfPreviewModalApi.open();
  } else if (typeof window.openModal === "function") {
    window.openModal(pdfPreviewModal, pdfPreviewBackdrop);
  } else {
    pdfPreviewModal.classList.remove("is-hidden");
    pdfPreviewBackdrop.classList.remove("is-hidden");
  }
  pdfPreviewFrame.onload = () => URL.revokeObjectURL(url);
};

const closePdfPreview = () => {
  if (pdfPreviewModalApi) {
    pdfPreviewModalApi.close();
  } else if (typeof window.closeModal === "function") {
    window.closeModal(pdfPreviewModal, pdfPreviewBackdrop);
  } else {
    if (pdfPreviewBackdrop) pdfPreviewBackdrop.classList.add("is-hidden");
    if (pdfPreviewModal) pdfPreviewModal.classList.add("is-hidden");
  }
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

const setTraceProgress = (percent, message) => {
  if (!traceProgress || !traceProgressFill) return;
  traceProgress.classList.remove("is-hidden");
  if (traceProgressText && message) traceProgressText.textContent = message;
  const safePercent = Math.min(Math.max(Number(percent) || 0, 0), 100);
  traceProgressFill.style.width = `${safePercent}%`;
};

const hideTraceProgress = () => {
  if (traceProgress) traceProgress.classList.add("is-hidden");
  if (traceProgressFill) traceProgressFill.style.width = "0%";
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
  showLoadingToast("Generazione tracce in corso...");
  if (pdfStatus) pdfStatus.textContent = "Generazione tracce in corso...";
  setTraceProgress(5, "Preparazione...");
  if (latexLogWrap) latexLogWrap.open = false;
  if (latexLogWrap) latexLogWrap.classList.add("is-hidden");
  if (latexLog) latexLog.textContent = "";
  try {
    const response = await fetch("api/generate-traces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latex: latexPreview.value,
        versions: state.meta.versions,
      }),
    });
    if (!response.ok) {
      const info = await response.json().catch(() => ({}));
      if (info.details) console.error("[generate-traces]", info.details);
      hideLoadingToast();
      showToast(info.error || "Errore generazione tracce", "error");
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
    const jobId = payload.jobId;
    if (!jobId || typeof window.io !== "function") {
      hideLoadingToast();
      showToast("Socket non disponibile per aggiornamenti", "error");
      if (pdfStatus) pdfStatus.textContent = "Errore generazione tracce";
      hideTraceProgress();
      return;
    }
    const baseTag = document.querySelector("base");
    const baseHref = baseTag ? baseTag.getAttribute("href") || "/" : "/";
    const socketPath = baseHref.endsWith("/")
      ? `${baseHref}socket.io`
      : `${baseHref}/socket.io`;
    const socket = window.io({ path: socketPath });
    const resolveApiUrl = (url) => {
      if (!url) return url;
      if (!url.startsWith("/")) return url;
      const baseTag = document.querySelector("base");
      const baseHref = baseTag ? baseTag.getAttribute("href") || "/" : "/";
      return baseHref.endsWith("/") ? `${baseHref}${url.slice(1)}` : `${baseHref}${url}`;
    };
    const downloadFromUrl = (url, name) => {
      const link = document.createElement("a");
      link.href = resolveApiUrl(url);
      link.download = name;
      link.click();
    };
    socket.emit("job:join", jobId);
    socket.on("job:progress", (info) => {
      if (pdfStatus && info?.message) pdfStatus.textContent = info.message;
      const step = info?.step || "";
      let percent = 10;
      if (step === "compile" && Number.isFinite(info?.version) && Number.isFinite(info?.total)) {
        percent = Math.round((info.version / info.total) * 70);
      } else if (step === "merge") {
        percent = 85;
      } else if (step === "answers") {
        percent = 95;
      }
      setTraceProgress(percent, info?.message || "Generazione tracce...");
    });
    socket.on("job:done", (info) => {
      setTraceProgress(100, "Tracce pronte.");
      if (info?.combinedUrl) downloadFromUrl(info.combinedUrl, info.combinedName || "tracce.pdf");
      if (info?.answersUrl) downloadFromUrl(info.answersUrl, info.answersName || "tracce-answers.pdf");
      hideLoadingToast();
      showToast("Tracce generate con successo", "success");
      if (pdfStatus) pdfStatus.textContent = "Tracce generate.";
      setTimeout(() => hideTraceProgress(), 1500);
      socket.disconnect();
    });
    socket.on("job:error", (info) => {
      hideLoadingToast();
      showToast(info?.error || "Errore generazione tracce", "error");
      if (pdfStatus) pdfStatus.textContent = info?.error || "Errore generazione tracce";
      hideTraceProgress();
      socket.disconnect();
    });
  } catch {
    hideLoadingToast();
    showToast("Errore generazione tracce", "error");
    if (pdfStatus) pdfStatus.textContent = "Errore generazione tracce";
    hideTraceProgress();
  } finally {
    generateTracesBtn.disabled = false;
  }
};

const initMetaFields = () => {
  applyMetaToInputs();
};

const init = async () => {
  const activeCourse = await fetchActiveCourse();
  if (!activeCourse) {
    if (courseEmptyState) courseEmptyState.classList.remove("is-hidden");
    if (mainLayout) mainLayout.classList.add("is-hidden");
    return;
  }
  if (courseEmptyState) courseEmptyState.classList.add("is-hidden");
  if (mainLayout) mainLayout.classList.remove("is-hidden");
  activeCourseId = activeCourse.id;
  if (!state.meta.courseId) {
    state.meta.courseId = activeCourse.id;
  }
  initMetaFields();
  renderSelectedQuestions();
  renderLatex();
  const params = new URLSearchParams(window.location.search);
  const stepParam = Number(params.get("step"));
  if (Number.isFinite(stepParam)) {
    currentStep = Math.max(1, Math.min(totalSteps, stepParam));
  }
  updateStepUI();
  highlightMissingMeta();
  setLockedState(false);
  const activeExam = await fetchActiveExam();
  loadCourseTopics(state.meta.courseId);
  loadExamHistory().then(async () => {
    if (activeExam?.id) {
      await loadExam(activeExam.id);
    }
  });

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
  if (bankSearchInput) {
    ["click", "mousedown", "keydown", "focus"].forEach((eventName) => {
      bankSearchInput.addEventListener(eventName, (event) => {
        event.stopPropagation();
      });
    });
    bankSearchInput.addEventListener("input", refreshQuestionBank);
  }
  if (bankTopicChips) {
    bankTopicChips.addEventListener("click", (event) => {
      const target = event.target;
      if (!target.classList.contains("chip-action")) return;
      const topicId = target.dataset.topicId || "";
      bankTopicFilter = topicId || null;
      bankTopicChips.querySelectorAll(".chip-action").forEach((chip) => {
        chip.classList.toggle("active", chip === target);
      });
      refreshQuestionBank();
    });
  }
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
  if (confirmConfirm) {
    confirmConfirm.addEventListener("click", () => {
      if (typeof confirmCallback === "function") {
        const cb = confirmCallback;
        closeConfirmModal();
        cb();
      } else {
        closeConfirmModal();
      }
    });
  }
  stepButtons.forEach((btn) => {
    btn.addEventListener("click", () => goToStep(btn.dataset.stepTarget));
  });
};

init();
