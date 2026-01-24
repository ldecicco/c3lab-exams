const adminCourseNewInput = document.getElementById("adminCourseNew");
const adminAddCourseBtn = document.getElementById("adminAddCourse");
const adminUpdateCourseBtn = document.getElementById("adminUpdateCourse");
const adminCancelCourseBtn = document.getElementById("adminCancelCourse");
const adminCourseStatus = document.getElementById("adminCourseStatus");
const adminCourseList = document.getElementById("adminCourseList");
const adminCoursePicker = document.getElementById("adminCoursePicker");
const adminCourseEmpty = document.getElementById("adminCourseEmpty");
const adminEditorWrap = document.getElementById("adminEditorWrap");
const adminTopicCourseSelect = document.getElementById("adminTopicCourse");
const adminTopicNewInput = document.getElementById("adminTopicNew");
const adminAddTopicBtn = document.getElementById("adminAddTopic");
const adminUpdateTopicBtn = document.getElementById("adminUpdateTopic");
const adminCancelTopicBtn = document.getElementById("adminCancelTopic");
const adminTopicStatus = document.getElementById("adminTopicStatus");
const adminTopicList = document.getElementById("adminTopicList");
const bankCourseSelect = document.getElementById("bankCourse");
const bankTopicSelect = document.getElementById("bankTopic");
const bankSearchInput = document.getElementById("bankSearch");
const bankUsageSelect = document.getElementById("bankUsage");
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
const adminImageLayoutMode = document.getElementById("adminImageLayoutMode");
const adminImageSplitFields = document.getElementById("adminImageSplitFields");
const adminImageSplit = document.getElementById("adminImageSplit");
const adminImageSplitLabel = document.getElementById("adminImageSplitLabel");
const adminImageSplitPresets = document.getElementById("adminImageSplitPresets");
const adminImageSplitPreview = document.getElementById("adminImageSplitPreview");
const adminImageScaleRange = document.getElementById("adminImageScaleRange");
const adminImageScaleLabel = document.getElementById("adminImageScaleLabel");
const adminImageScalePresets = document.getElementById("adminImageScalePresets");
const adminAnswers = document.getElementById("adminAnswers");
const adminAddAnswerBtn = document.getElementById("adminAddAnswer");
const adminQuestionStatus = document.getElementById("adminQuestionStatus");
const adminEditBadge = document.getElementById("adminEditBadge");
const adminEditBadgeTop = document.getElementById("adminEditBadgeTop");
const adminQuestionError = document.getElementById("adminQuestionError");
const adminAnswersError = document.getElementById("adminAnswersError");
const toggleCoursesBtn = document.getElementById("toggleCourses");
const toggleTopicsBtn = document.getElementById("toggleTopics");
const toggleMultiModulesBtn = document.getElementById("toggleMultiModules");
const toggleShortcutsBtn = document.getElementById("toggleShortcuts");
const toggleImagesBtn = document.getElementById("toggleImages");
const toggleUsersBtn = document.getElementById("toggleUsers");
const toggleDbBtn = document.getElementById("toggleDb");
const adminActionButtons = [
  toggleUsersBtn,
  toggleCoursesBtn,
  toggleTopicsBtn,
  toggleMultiModulesBtn,
  toggleShortcutsBtn,
  toggleImagesBtn,
  toggleDbBtn,
].filter(Boolean);
const adminCoursesSection = document.getElementById("adminCoursesSection");
const adminTopicsSection = document.getElementById("adminTopicsSection");
const adminMultiModulesSection = document.getElementById("adminMultiModulesSection");
const adminShortcutsSection = document.getElementById("adminShortcutsSection");
const adminImagesSection = document.getElementById("adminImagesSection");
const adminUsersSection = document.getElementById("adminUsersSection");
const adminDbSection = document.getElementById("adminDbSection");
const adminEmptyState = document.getElementById("adminEmptyState");
const adminUserNameInput = document.getElementById("adminUserName");
const adminUserPasswordInput = document.getElementById("adminUserPassword");
const adminUserRoleSelect = document.getElementById("adminUserRole");
const adminCreateUserBtn = document.getElementById("adminCreateUser");
const adminUpdateUserBtn = document.getElementById("adminUpdateUser");
const adminCancelUserBtn = document.getElementById("adminCancelUser");
const adminUserStatus = document.getElementById("adminUserStatus");
const courseEmptyState = document.getElementById("courseEmptyState");
const mainLayout = document.getElementById("mainLayout");

let activeCourseId = null;
let editingMultiModuleId = null;
let multiModuleCache = [];
let multiModuleExamCache = [];
const adminUserList = document.getElementById("adminUserList");
const adminToast = document.getElementById("adminToast");
const keyboardShortcutsHint = document.getElementById("keyboardShortcutsHint");
const keyboardShortcutsList = document.getElementById("keyboardShortcutsList");
const adminShortcutAddBtn = document.getElementById("adminShortcutAdd");
const shortcutModalBackdrop = document.getElementById("shortcutModalBackdrop");
const shortcutModal = document.getElementById("shortcutModal");
const shortcutModalClose = document.getElementById("shortcutModalClose");
const shortcutModalLabel = document.getElementById("shortcutModalLabel");
const shortcutModalSnippet = document.getElementById("shortcutModalSnippet");
const shortcutModalSave = document.getElementById("shortcutModalSave");
const shortcutModalStatus = document.getElementById("shortcutModalStatus");
const adminShortcutBar = document.getElementById("adminShortcutBar");
const adminShortcutEmpty = document.getElementById("adminShortcutEmpty");
const adminShortcutCourse = document.getElementById("adminShortcutCourse");
const adminShortcutLabel = document.getElementById("adminShortcutLabel");
const adminShortcutSnippet = document.getElementById("adminShortcutSnippet");
const adminCreateShortcutBtn = document.getElementById("adminCreateShortcut");
const adminUpdateShortcutBtn = document.getElementById("adminUpdateShortcut");
const adminCancelShortcutBtn = document.getElementById("adminCancelShortcut");
const adminShortcutStatus = document.getElementById("adminShortcutStatus");
const adminShortcutList = document.getElementById("adminShortcutList");
const adminImageCourse = document.getElementById("adminImageCourse");
const adminImageName = document.getElementById("adminImageName");
const adminImageDescription = document.getElementById("adminImageDescription");
const adminImageFile = document.getElementById("adminImageFile");
const adminImageSourceFile = document.getElementById("adminImageSourceFile");
const adminUploadImageBtn = document.getElementById("adminUploadImage");
const adminUpdateImageBtn = document.getElementById("adminUpdateImage");
const adminCancelImageBtn = document.getElementById("adminCancelImage");
const adminImageStatus = document.getElementById("adminImageStatus");
const adminImageList = document.getElementById("adminImageList");
let editingImageId = null;
const adminMultiModuleName = document.getElementById("adminMultiModuleName");
const adminMultiModuleExam1 = document.getElementById("adminMultiModuleExam1");
const adminMultiModuleExam2 = document.getElementById("adminMultiModuleExam2");
const adminMultiModuleMin1 = document.getElementById("adminMultiModuleMin1");
const adminMultiModuleMin2 = document.getElementById("adminMultiModuleMin2");
const adminMultiModuleWeight1 = document.getElementById("adminMultiModuleWeight1");
const adminMultiModuleWeight2 = document.getElementById("adminMultiModuleWeight2");
const adminMultiModuleWeight1Label = document.getElementById("adminMultiModuleWeight1Label");
const adminMultiModuleWeight2Label = document.getElementById("adminMultiModuleWeight2Label");
const adminCreateMultiModuleBtn = document.getElementById("adminCreateMultiModule");
const adminUpdateMultiModuleBtn = document.getElementById("adminUpdateMultiModule");
const adminCancelMultiModuleBtn = document.getElementById("adminCancelMultiModule");
const adminMultiModuleStatus = document.getElementById("adminMultiModuleStatus");
const adminMultiModuleList = document.getElementById("adminMultiModuleList");
const imagePickerBackdrop = document.getElementById("imagePickerBackdrop");
const imagePickerModal = document.getElementById("imagePickerModal");
const imagePickerCloseBtn = document.getElementById("imagePickerClose");
const imagePickerNewBtn = document.getElementById("imagePickerNew");
const imagePickerStatus = document.getElementById("imagePickerStatus");
const imagePickerList = document.getElementById("imagePickerList");
const imageUploadBackdrop = document.getElementById("imageUploadBackdrop");
const imageUploadModal = document.getElementById("imageUploadModal");
const imageUploadCloseBtn = document.getElementById("imageUploadClose");
const imageUploadNameInput = document.getElementById("imageUploadName");
const imageUploadDescriptionInput = document.getElementById("imageUploadDescription");
const imageUploadFileInput = document.getElementById("imageUploadFile");
const imageUploadSourceFileInput = document.getElementById("imageUploadSourceFile");
const imageUploadSaveBtn = document.getElementById("imageUploadSave");
const imageUploadStatus = document.getElementById("imageUploadStatus");
const imageUploadTitle = document.getElementById("imageUploadTitle");
let imagePickerEditId = null;
let imagePickerEditImage = null;
const imagePreviewBackdrop = document.getElementById("imagePreviewBackdrop");
const imagePreviewModal = document.getElementById("imagePreviewModal");
const imagePreviewCloseBtn = document.getElementById("imagePreviewClose");
const imagePreviewImg = document.getElementById("imagePreviewImg");
const imagePreviewMeta = document.getElementById("imagePreviewMeta");
const adminToolbarNew = document.getElementById("adminToolbarNew");
const adminToolbarDuplicate = document.getElementById("adminToolbarDuplicate");
const adminToolbarSave = document.getElementById("adminToolbarSave");
const adminToolbarReset = document.getElementById("adminToolbarReset");
const adminDbTableSelect = document.getElementById("adminDbTable");
const adminDbSearch = document.getElementById("adminDbSearch");
const adminDbLimit = document.getElementById("adminDbLimit");
const adminDbRefresh = document.getElementById("adminDbRefresh");
const adminDbExport = document.getElementById("adminDbExport");
const adminDbStatus = document.getElementById("adminDbStatus");
const adminDbCount = document.getElementById("adminDbCount");
const adminDbTableHead = document.getElementById("adminDbTableHead");
const adminDbTableBody = document.getElementById("adminDbTableBody");
const adminDbPrev = document.getElementById("adminDbPrev");
const adminDbNext = document.getElementById("adminDbNext");
let dbTablesCache = [];
let dbSearchTimer = null;
let dbOrderBy = "";
let dbOrderDir = "ASC";
let dbOffset = 0;
const adminPreviewRefresh = document.getElementById("adminPreviewRefresh");
const adminToolbarBank = document.getElementById("adminToolbarBank");
const adminSaveStateBadge = document.getElementById("adminSaveState");
const bankModalBackdrop = document.getElementById("bankModalBackdrop");
const bankModal = document.getElementById("bankModal");
const bankModalClose = document.getElementById("bankModalClose");
const adminImageAccordion = document.getElementById("adminImageAccordion");
const questionPreviewBackdrop = document.getElementById("questionPreviewBackdrop");
const questionPreviewModal = document.getElementById("questionPreviewModal");
const questionPreviewCloseBtn = document.getElementById("questionPreviewClose");
const questionPreviewBody = document.getElementById("questionPreviewBody");
const adminQuestionNoteBtn = document.getElementById("adminQuestionNoteBtn");
const questionNoteBackdrop = document.getElementById("questionNoteBackdrop");
const questionNoteModal = document.getElementById("questionNoteModal");
const questionNoteClose = document.getElementById("questionNoteClose");
const questionNoteCancel = document.getElementById("questionNoteCancel");
const questionNoteDelete = document.getElementById("questionNoteDelete");
const questionNoteSave = document.getElementById("questionNoteSave");
const questionNoteText = document.getElementById("questionNoteText");
const questionNotePreview = document.getElementById("questionNotePreview");
const answerNoteBackdrop = document.getElementById("answerNoteBackdrop");
const answerNoteModal = document.getElementById("answerNoteModal");
const answerNoteClose = document.getElementById("answerNoteClose");
const answerNoteCancel = document.getElementById("answerNoteCancel");
const answerNoteDelete = document.getElementById("answerNoteDelete");
const answerNoteSave = document.getElementById("answerNoteSave");
const answerNoteText = document.getElementById("answerNoteText");
const answerNotePreview = document.getElementById("answerNotePreview");
let editingQuestionId = null;
let editingAnswerNoteIndex = null;
let topicOptions = [];
let userCache = [];
let editingCourseId = null;
let editingUserId = null;
let editingTopicId = null;
let lastSavedSnapshot = "";
let shortcutCache = [];
let editingShortcutId = null;
let lastFocusedInput = null;
let adminToastTimer = null;
let imageCache = [];

const showAdminToast = (message, tone = "info") => {
  if (!adminToast) return;
  adminToast.textContent = message;
  adminToast.classList.remove("is-error", "is-success");
  if (tone === "error") adminToast.classList.add("is-error");
  if (tone === "success") adminToast.classList.add("is-success");
  adminToast.classList.add("show");
  if (adminToastTimer) clearTimeout(adminToastTimer);
  adminToastTimer = setTimeout(() => {
    adminToast.classList.remove("show");
  }, 2400);
};

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

const getSelectedImageLayoutMode = () => {
  const selected = adminImageLayoutMode?.querySelector(
    'input[name="adminImageLayoutMode"]:checked'
  );
  return selected ? selected.value : adminQuestionState.imageLayoutMode || "side";
};

const updateImageLayoutModePills = () => {
  if (!adminImageLayoutMode) return;
  const mode = getSelectedImageLayoutMode();
  Array.from(adminImageLayoutMode.querySelectorAll(".radio-pill")).forEach((pill) => {
    const input = pill.querySelector("input");
    pill.classList.toggle("is-selected", input?.checked);
  });
  adminQuestionState.imageLayoutMode = mode;
};

const updateImageLayoutModeUI = () => {
  const mode = adminQuestionState.imageLayoutMode || "side";
  if (adminImageSplitFields) {
    adminImageSplitFields.classList.toggle("is-hidden", mode !== "side");
  }
  if (adminImageScaleLabel) {
    const scale = Number(adminImageScaleRange?.value || 96);
    const safeScale = Number.isFinite(scale) ? scale : 96;
    adminImageScaleLabel.textContent =
      mode === "below" ? `${safeScale}% della pagina` : `${safeScale}% della colonna`;
  }
};

const updateImageLayoutState = () => {
  const split = Number(adminImageSplit?.value || 50);
  const safeSplit = Number.isFinite(split) ? split : 50;
  const scale = Number(adminImageScaleRange?.value || 96);
  const safeScale = Number.isFinite(scale) ? scale : 96;
  const left = Math.min(Math.max(safeSplit, 10), 90);
  const right = 100 - left;
  adminQuestionState.imageLeft = formatWidthPercent(left);
  adminQuestionState.imageRight = formatWidthPercent(right);
  adminQuestionState.imageScale = formatWidthPercent(safeScale);
  if (adminImageSplitLabel) {
    adminImageSplitLabel.textContent = `Immagine ${left}% • Risposte ${right}%`;
  }
  updateImageLayoutModeUI();
  if (adminImageSplitPreview) {
    const imageBlock = adminImageSplitPreview.querySelector(".layout-preview-image");
    const textBlock = adminImageSplitPreview.querySelector(".layout-preview-text");
    if (imageBlock) imageBlock.style.width = `${left}%`;
    if (textBlock) textBlock.style.width = `${right}%`;
  }
};

const apiFetch = async (url, options = {}) => {
  const relativeUrl = url.startsWith("/") ? url.slice(1) : url;
  const response = await fetch(relativeUrl, options);
  if (!response.ok) {
    const info = await response.json().catch(() => ({}));
    const message = info.error || `Errore ${response.status}`;
    throw new Error(message);
  }
  return response.json();
};

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

const createEl = (tag, className, text) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};

const setCourseEditState = (course) => {
  editingCourseId = course ? course.id : null;
  if (adminCourseNewInput) {
    adminCourseNewInput.value = course ? course.name : "";
  }
  if (adminAddCourseBtn) adminAddCourseBtn.classList.toggle("is-hidden", Boolean(course));
  if (adminUpdateCourseBtn) adminUpdateCourseBtn.classList.toggle("is-hidden", !course);
  if (adminCancelCourseBtn) adminCancelCourseBtn.classList.toggle("is-hidden", !course);
  if (adminCourseStatus) {
    adminCourseStatus.textContent = course ? `Modifica corso: ${course.name}` : "";
  }
};

const setTopicEditState = (topic) => {
  editingTopicId = topic ? topic.id : null;
  if (adminTopicNewInput) adminTopicNewInput.value = topic ? topic.name : "";
  if (adminAddTopicBtn) adminAddTopicBtn.classList.toggle("is-hidden", Boolean(topic));
  if (adminUpdateTopicBtn) adminUpdateTopicBtn.classList.toggle("is-hidden", !topic);
  if (adminCancelTopicBtn) adminCancelTopicBtn.classList.toggle("is-hidden", !topic);
  if (adminTopicStatus) {
    adminTopicStatus.textContent = topic ? `Modifica argomento: ${topic.name}` : "";
  }
};

const setUserEditState = (user) => {
  editingUserId = user ? user.id : null;
  if (adminUserNameInput) adminUserNameInput.value = user ? user.username : "";
  if (adminUserPasswordInput) adminUserPasswordInput.value = "";
  if (adminUserRoleSelect) {
    adminUserRoleSelect.value = user ? user.role : "creator";
    adminUserRoleSelect.disabled = Boolean(user && user.role === "admin");
  }
  if (adminCreateUserBtn) adminCreateUserBtn.classList.toggle("is-hidden", Boolean(user));
  if (adminUpdateUserBtn) adminUpdateUserBtn.classList.toggle("is-hidden", !user);
  if (adminCancelUserBtn) adminCancelUserBtn.classList.toggle("is-hidden", !user);
  if (adminUserStatus) {
    adminUserStatus.textContent = user ? `Modifica utente: ${user.username}` : "";
  }
};

const setShortcutEditState = (shortcut) => {
  editingShortcutId = shortcut ? shortcut.id : null;
  if (adminShortcutLabel) adminShortcutLabel.value = shortcut ? shortcut.label : "";
  if (adminShortcutSnippet) adminShortcutSnippet.value = shortcut ? shortcut.snippet : "";
  if (adminCreateShortcutBtn)
    adminCreateShortcutBtn.classList.toggle("is-hidden", Boolean(shortcut));
  if (adminUpdateShortcutBtn)
    adminUpdateShortcutBtn.classList.toggle("is-hidden", !shortcut);
  if (adminCancelShortcutBtn)
    adminCancelShortcutBtn.classList.toggle("is-hidden", !shortcut);
  if (adminShortcutStatus) {
    adminShortcutStatus.textContent = shortcut
      ? `Modifica scorciatoia: ${shortcut.label}`
      : "";
  }
};

const setFocusedInput = (el) => {
  if (!el) return;
  lastFocusedInput = el;
};

const insertShortcutText = (snippet) => {
  const target = lastFocusedInput || adminQuestionText;
  if (!target) return;
  const value = target.value || "";
  const start = Number.isFinite(target.selectionStart) ? target.selectionStart : value.length;
  const end = Number.isFinite(target.selectionEnd) ? target.selectionEnd : value.length;
  const nextValue = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
  target.value = nextValue;
  const cursor = start + snippet.length;
  if (typeof target.setSelectionRange === "function") {
    target.setSelectionRange(cursor, cursor);
  }
  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.focus();
};

const insertMathDelimiters = () => {
  const target = lastFocusedInput || adminQuestionText;
  if (!target) return;
  const value = target.value || "";
  const start = Number.isFinite(target.selectionStart) ? target.selectionStart : value.length;
  const end = Number.isFinite(target.selectionEnd) ? target.selectionEnd : value.length;
  const nextValue = `${value.slice(0, start)}$$${value.slice(end)}`;
  target.value = nextValue;
  const cursor = start + 1;
  if (typeof target.setSelectionRange === "function") {
    target.setSelectionRange(cursor, cursor);
  }
  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.focus();
};

const insertWrappedText = (wrapperStart, wrapperEnd = "}") => {
  const target = lastFocusedInput || adminQuestionText;
  if (!target) return;
  const value = target.value || "";
  const start = Number.isFinite(target.selectionStart) ? target.selectionStart : value.length;
  const end = Number.isFinite(target.selectionEnd) ? target.selectionEnd : value.length;
  const selected = value.slice(start, end);
  const nextValue = `${value.slice(0, start)}${wrapperStart}${selected}${wrapperEnd}${value.slice(end)}`;
  target.value = nextValue;
  const cursor = start + wrapperStart.length;
  if (typeof target.setSelectionRange === "function") {
    target.setSelectionRange(cursor, cursor);
  }
  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.focus();
};

const handleShortcutHotkeys = (event) => {
  const target = event.target;
  const isTextInput = target && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement);

  if (event.ctrlKey && !ctrlKeyDown) {
    ctrlKeyDown = true;
    if (isTextInput) {
      showKeyboardShortcutsHint();
    }
  }

  if (!event.ctrlKey) return;
  if (!isTextInput) return;

  const key = event.key;
  if (key === 'm' || key === 'M') {
    event.preventDefault();
    insertMathDelimiters();
    return;
  }
  if (key === 'b' || key === 'B') {
    event.preventDefault();
    insertWrappedText("\\textbf{");
    return;
  }
  if (key === 'i' || key === 'I') {
    event.preventDefault();
    insertWrappedText("\\textit{");
    return;
  }
  if (key === 's' || key === 'S') {
    event.preventDefault();
    saveAdminQuestion();
    return;
  }
  if (!shortcutCache.length) return;
  if (!/^[1-9]$/.test(key)) return;
  event.preventDefault();
  const index = Number(key) - 1;
  const shortcut = shortcutCache[index];
  if (shortcut) insertShortcutText(shortcut.snippet);
};

const handleKeyUp = (event) => {
  if (!event.ctrlKey && ctrlKeyDown) {
    ctrlKeyDown = false;
    hideKeyboardShortcutsHint();
  }
};

const openShortcutModal = () => {
  if (!shortcutModal || !shortcutModalBackdrop) return;
  if (shortcutModalLabel) shortcutModalLabel.value = "";
  if (shortcutModalSnippet) shortcutModalSnippet.value = "";
  if (shortcutModalStatus) shortcutModalStatus.textContent = "";
  shortcutModal.classList.remove("is-hidden");
  shortcutModalBackdrop.classList.remove("is-hidden");
  if (shortcutModalLabel) shortcutModalLabel.focus();
};

const closeShortcutModal = () => {
  if (shortcutModal) shortcutModal.classList.add("is-hidden");
  if (shortcutModalBackdrop) shortcutModalBackdrop.classList.add("is-hidden");
};

const updateKeyboardShortcutsHint = () => {
  if (!keyboardShortcutsList) return;
  keyboardShortcutsList.innerHTML = "";

  const mathShortcut = document.createElement("div");
  mathShortcut.className = "keyboard-shortcut-item";
  mathShortcut.innerHTML = `
    <span class="keyboard-shortcut-key">CTRL + M</span>
    <span class="keyboard-shortcut-label">Inserisci $$</span>
  `;
  keyboardShortcutsList.appendChild(mathShortcut);

  const boldShortcut = document.createElement("div");
  boldShortcut.className = "keyboard-shortcut-item";
  boldShortcut.innerHTML = `
    <span class="keyboard-shortcut-key">CTRL + B</span>
    <span class="keyboard-shortcut-label">Inserisci \\textbf{}</span>
  `;
  keyboardShortcutsList.appendChild(boldShortcut);

  const italicShortcut = document.createElement("div");
  italicShortcut.className = "keyboard-shortcut-item";
  italicShortcut.innerHTML = `
    <span class="keyboard-shortcut-key">CTRL + I</span>
    <span class="keyboard-shortcut-label">Inserisci \\textit{}</span>
  `;
  keyboardShortcutsList.appendChild(italicShortcut);

  const saveShortcut = document.createElement("div");
  saveShortcut.className = "keyboard-shortcut-item";
  saveShortcut.innerHTML = `
    <span class="keyboard-shortcut-key">CTRL + S</span>
    <span class="keyboard-shortcut-label">Salva domanda</span>
  `;
  keyboardShortcutsList.appendChild(saveShortcut);

  shortcutCache.forEach((shortcut, index) => {
    if (index >= 9) return;
    const item = document.createElement("div");
    item.className = "keyboard-shortcut-item";
    item.innerHTML = `
      <span class="keyboard-shortcut-key">CTRL + ${index + 1}</span>
      <span class="keyboard-shortcut-label">${shortcut.label}</span>
    `;
    keyboardShortcutsList.appendChild(item);
  });
};

let ctrlKeyDown = false;

const showKeyboardShortcutsHint = () => {
  if (!keyboardShortcutsHint) return;
  updateKeyboardShortcutsHint();
  keyboardShortcutsHint.classList.remove("is-hidden");
};

const hideKeyboardShortcutsHint = () => {
  if (!keyboardShortcutsHint) return;
  keyboardShortcutsHint.classList.add("is-hidden");
};

const createShortcutFromModal = async () => {
  const courseId = readSelectNumber(adminCoursePicker);
  const label = String(shortcutModalLabel?.value || "").trim();
  const snippet = String(shortcutModalSnippet?.value || "").trim();
  if (!Number.isFinite(courseId)) {
    if (shortcutModalStatus) shortcutModalStatus.textContent = "Seleziona un corso.";
    return;
  }
  if (!label || !snippet) {
    if (shortcutModalStatus) shortcutModalStatus.textContent = "Descrizione e testo sono obbligatori.";
    return;
  }
  try {
    await apiFetch("/api/shortcuts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, label, snippet }),
    });
    await loadShortcutsForEditor(courseId);
    closeShortcutModal();
  } catch (err) {
    if (shortcutModalStatus) {
      shortcutModalStatus.textContent = err.message || "Errore creazione scorciatoia.";
    }
  }
};

const renderShortcutBar = (shortcuts) => {
  if (!adminShortcutBar) return;
  adminShortcutBar.innerHTML = "";
  if (!shortcuts.length) {
    if (adminShortcutEmpty) adminShortcutEmpty.classList.remove("is-hidden");
    return;
  }
  if (adminShortcutEmpty) adminShortcutEmpty.classList.add("is-hidden");
  shortcuts.forEach((shortcut) => {
    const btn = createEl("button", "chip-action", shortcut.label);
    btn.type = "button";
    btn.addEventListener("click", () => insertShortcutText(shortcut.snippet));
    adminShortcutBar.appendChild(btn);
  });
};

const renderShortcutList = (shortcuts) => {
  if (!adminShortcutList) return;
  adminShortcutList.innerHTML = "";
  if (!shortcuts.length) {
    adminShortcutList.textContent = "Nessuna scorciatoia per il corso selezionato.";
    return;
  }
  shortcuts.forEach((shortcut) => {
    const item = createEl("div", "list-item");
    const header = createEl("div", "list-item-title", shortcut.label);
    const meta = createEl("div", "list-item-meta", shortcut.snippet);
    const actions = createEl("div", "actions");
    const editBtn = createEl("button", "btn btn-outline-primary btn-sm", "Modifica");
    editBtn.type = "button";
    editBtn.addEventListener("click", () => setShortcutEditState(shortcut));
    const delBtn = createEl("button", "btn btn-outline-danger btn-sm", "Elimina");
    delBtn.type = "button";
    delBtn.addEventListener("click", () => deleteShortcut(shortcut.id));
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    item.appendChild(header);
    item.appendChild(meta);
    item.appendChild(actions);
    adminShortcutList.appendChild(item);
  });
};

const loadShortcutsForEditor = async (courseId) => {
  if (!Number.isFinite(courseId)) {
    shortcutCache = [];
    renderShortcutBar([]);
    updateKeyboardShortcutsHint();
    return;
  }
  const payload = await apiFetch(`/api/shortcuts?courseId=${courseId}`);
  shortcutCache = payload.shortcuts || [];
  renderShortcutBar(shortcutCache);
  updateKeyboardShortcutsHint();
};

const loadShortcutsForAdmin = async (courseId) => {
  if (!Number.isFinite(courseId)) {
    renderShortcutList([]);
    return;
  }
  const payload = await apiFetch(`/api/shortcuts?courseId=${courseId}`);
  renderShortcutList(payload.shortcuts || []);
};

const createShortcut = async () => {
  const courseId = readSelectNumber(adminShortcutCourse);
  const label = String(adminShortcutLabel?.value || "").trim();
  const snippet = String(adminShortcutSnippet?.value || "").trim();
  if (!Number.isFinite(courseId)) {
    if (adminShortcutStatus) adminShortcutStatus.textContent = "Seleziona un corso.";
    return;
  }
  if (!label || !snippet) {
    if (adminShortcutStatus) adminShortcutStatus.textContent = "Descrizione e testo sono obbligatori.";
    return;
  }
  await apiFetch("/api/shortcuts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId, label, snippet }),
  });
  if (adminShortcutStatus) adminShortcutStatus.textContent = "Scorciatoia creata.";
  setShortcutEditState(null);
  await loadShortcutsForAdmin(courseId);
  if (adminCoursePicker) await loadShortcutsForEditor(courseId);
};

const updateShortcut = async () => {
  if (!editingShortcutId) return;
  const courseId = readSelectNumber(adminShortcutCourse);
  const label = String(adminShortcutLabel?.value || "").trim();
  const snippet = String(adminShortcutSnippet?.value || "").trim();
  if (!Number.isFinite(courseId)) {
    if (adminShortcutStatus) adminShortcutStatus.textContent = "Seleziona un corso.";
    return;
  }
  if (!label || !snippet) {
    if (adminShortcutStatus) adminShortcutStatus.textContent = "Descrizione e testo sono obbligatori.";
    return;
  }
  await apiFetch(`/api/shortcuts/${editingShortcutId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId, label, snippet }),
  });
  if (adminShortcutStatus) adminShortcutStatus.textContent = "Scorciatoia aggiornata.";
  setShortcutEditState(null);
  await loadShortcutsForAdmin(courseId);
  if (adminCoursePicker) await loadShortcutsForEditor(courseId);
};

const deleteShortcut = async (id) => {
  await apiFetch(`/api/shortcuts/${id}`, { method: "DELETE" });
  const courseId = readSelectNumber(adminShortcutCourse);
  setShortcutEditState(null);
  await loadShortcutsForAdmin(courseId);
  if (adminCoursePicker) await loadShortcutsForEditor(courseId);
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

const openBankModal = async () => {
  const courseId = Number(activeCourseId);
  if (Number.isFinite(courseId)) {
    await loadTopics(courseId, bankTopicSelect, "Tutti gli argomenti");
  } else {
    renderSelectOptions(bankTopicSelect, [], "Tutti gli argomenti");
  }
  await refreshQuestionBank();
  if (bankModalBackdrop) bankModalBackdrop.classList.remove("is-hidden");
  if (bankModal) bankModal.classList.remove("is-hidden");
};

const closeBankModal = () => {
  if (bankModalBackdrop) bankModalBackdrop.classList.add("is-hidden");
  if (bankModal) bankModal.classList.add("is-hidden");
};

const openQuestionPreviewModal = () => {
  if (questionPreviewBackdrop) questionPreviewBackdrop.classList.remove("is-hidden");
  if (questionPreviewModal) questionPreviewModal.classList.remove("is-hidden");
};

const closeQuestionPreviewModal = () => {
  if (questionPreviewBackdrop) questionPreviewBackdrop.classList.add("is-hidden");
  if (questionPreviewModal) questionPreviewModal.classList.add("is-hidden");
  if (questionPreviewBody) questionPreviewBody.innerHTML = "";
};

const openQuestionNoteModal = () => {
  if (!questionNoteModal || !questionNoteBackdrop) return;
  if (questionNoteText) questionNoteText.value = adminQuestionState.note || "";
  if (questionNotePreview) {
    renderMathPreview(adminQuestionState.note || "", questionNotePreview, null);
  }
  questionNoteModal.classList.remove("is-hidden");
  questionNoteBackdrop.classList.remove("is-hidden");
};

const closeQuestionNoteModal = () => {
  if (questionNoteModal) questionNoteModal.classList.add("is-hidden");
  if (questionNoteBackdrop) questionNoteBackdrop.classList.add("is-hidden");
};

const openAnswerNoteModal = (index) => {
  if (!answerNoteModal || !answerNoteBackdrop) return;
  const answer = adminQuestionState.answers[index];
  editingAnswerNoteIndex = Number.isFinite(index) ? index : null;
  if (answerNoteText) answerNoteText.value = answer?.note || "";
  if (answerNotePreview) {
    renderMathPreview(answer?.note || "", answerNotePreview, null);
  }
  answerNoteModal.classList.remove("is-hidden");
  answerNoteBackdrop.classList.remove("is-hidden");
};

const closeAnswerNoteModal = () => {
  if (answerNoteModal) answerNoteModal.classList.add("is-hidden");
  if (answerNoteBackdrop) answerNoteBackdrop.classList.add("is-hidden");
  editingAnswerNoteIndex = null;
};

const updateQuestionNotePreview = () => {
  if (!questionNotePreview || !questionNoteText) return;
  renderMathPreview(questionNoteText.value || "", questionNotePreview, null);
};

const updateAnswerNotePreview = () => {
  if (!answerNotePreview || !answerNoteText) return;
  renderMathPreview(answerNoteText.value || "", answerNotePreview, null);
};

const updateQuestionNoteButton = () => {
  if (!adminQuestionNoteBtn) return;
  const hasNote = String(adminQuestionState.note || "").trim().length > 0;
  adminQuestionNoteBtn.classList.toggle("is-active", hasNote);
};

const setQuestionStatus = (message, tone = "info") => {
  if (!adminQuestionStatus) return;
  if (tone === "error") {
    showAdminToast(message, "error");
  }
  adminQuestionStatus.textContent = message;
  adminQuestionStatus.classList.remove(
    "text-danger",
    "text-success",
    "text-secondary",
    "is-error",
    "is-success",
    "is-info",
    "is-visible"
  );
  if (tone === "error") {
    adminQuestionStatus.textContent = "";
    return;
  } else if (tone === "success") {
    adminQuestionStatus.classList.add("text-success", "is-success");
  } else {
    adminQuestionStatus.classList.add("text-secondary", "is-info");
  }
  if (message) adminQuestionStatus.classList.add("is-visible");
};

const setSaveState = (state) => {
  if (!adminSaveStateBadge) return;
  if (state === "saved") {
    adminSaveStateBadge.textContent = "Salvato";
    adminSaveStateBadge.classList.remove("is-error");
    adminSaveStateBadge.classList.add("is-success");
  } else {
    adminSaveStateBadge.textContent = "Modifiche non salvate";
    adminSaveStateBadge.classList.remove("is-success");
    adminSaveStateBadge.classList.add("is-error");
  }
};

const getQuestionSnapshot = () => {
  const answers = adminQuestionState.answers.map((answer) => ({
    text: String(answer.text || "").trim(),
    note: String(answer.note || "").trim(),
    correct: Boolean(answer.correct),
  }));
  const topicIds = [...adminQuestionState.topicIds].sort((a, b) => a - b);
  return JSON.stringify({
    type: adminQuestionState.type,
    text: String(adminQuestionState.text || "").trim(),
    note: String(adminQuestionState.note || "").trim(),
    topicIds,
    image: String(adminQuestionState.image || "").trim(),
    imageLayoutEnabled: Boolean(adminQuestionState.imageLayoutEnabled),
    imageLayoutMode: adminQuestionState.imageLayoutMode || "side",
    imageLeft: String(adminQuestionState.imageLeft || "").trim(),
    imageRight: String(adminQuestionState.imageRight || "").trim(),
    imageScale: String(adminQuestionState.imageScale || "").trim(),
    answers,
  });
};

const updateSaveStateFromSnapshot = () => {
  const snapshot = getQuestionSnapshot();
  if (!lastSavedSnapshot) {
    setSaveState("dirty");
    return;
  }
  setSaveState(snapshot === lastSavedSnapshot ? "saved" : "dirty");
};

const renderQuestionPreview = (question) => {
  if (!questionPreviewBody) return;
  questionPreviewBody.innerHTML = "";
  const header = createEl("div", "preview-card-header");
  const title = createEl("div");
  const label = createEl(
    "div",
    "text-secondary small",
    question.type === "multipla" ? "Risposta multipla" : "Risposta singola"
  );
  title.appendChild(label);
  header.appendChild(title);
  questionPreviewBody.appendChild(header);

  const textBlock = createEl("div", "latex-preview-block");
  renderMathPreview(question.text, textBlock, null);
  questionPreviewBody.appendChild(textBlock);

  const answersWrap = createEl("div", "preview-answer-list");
  question.answers.forEach((answer, idx) => {
    const row = createEl("div", "preview-answer-row");
    const label = createEl("div", "preview-answer-label", String.fromCharCode(65 + idx));
    const text = createEl("div", "preview-answer-text");
    renderMathDisplay(answer.text, text);
    row.appendChild(label);
    row.appendChild(text);
    if (answer.isCorrect) {
      const tick = createEl("span", "answer-tick");
      tick.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.4-1.4z"/></svg>';
      row.appendChild(tick);
    }
    answersWrap.appendChild(row);
  });
  if (question.imageLayoutEnabled && question.imagePath) {
    const imageWrap = createEl("div", "preview-image");
    const img = document.createElement("img");
    const thumb = question.imageThumbnailPath || question.imagePath;
    img.src = thumb;
    img.alt = "Anteprima immagine";
    const meta = createEl("div", "preview-image-meta", question.imagePath.split("/").pop());
    imageWrap.appendChild(img);
    imageWrap.appendChild(meta);
    const mode = question.imageLayoutMode || "side";
    if (mode === "side") {
      const split = createEl("div", "preview-image-split");
      split.appendChild(imageWrap);
      split.appendChild(answersWrap);
      questionPreviewBody.appendChild(split);
    } else {
      questionPreviewBody.appendChild(imageWrap);
      questionPreviewBody.appendChild(answersWrap);
    }
  } else {
    questionPreviewBody.appendChild(answersWrap);
  }
};

const showAdminSection = (section) => {
  const sections = [
    adminUsersSection,
    adminCoursesSection,
    adminTopicsSection,
    adminMultiModulesSection,
    adminShortcutsSection,
    adminImagesSection,
    adminDbSection,
  ];
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
  if (section === adminMultiModulesSection && toggleMultiModulesBtn)
    toggleMultiModulesBtn.classList.add("is-active");
  if (section === adminShortcutsSection && toggleShortcutsBtn)
    toggleShortcutsBtn.classList.add("is-active");
  if (section === adminImagesSection && toggleImagesBtn)
    toggleImagesBtn.classList.add("is-active");
  if (section === adminDbSection && toggleDbBtn) toggleDbBtn.classList.add("is-active");
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
    const previewPath = image.thumbnail_path || image.file_path || "";
    const filePath = image.file_path || "";
    if (isPreviewableImage(previewPath)) {
      const img = document.createElement("img");
      img.src = previewPath;
      img.alt = image.name;
      img.addEventListener("click", () =>
        openImagePreview(previewPath, image.name, image.description)
      );
      thumb.appendChild(img);
    } else {
      const extLabel = filePath.split(".").pop().toUpperCase() || "FILE";
      const fallback = createEl("div", "image-thumb-fallback", extLabel);
      thumb.appendChild(fallback);
    }
    const details = createEl("div", "image-details");
    const title = createEl("div", "list-title", image.name);
    if (image.is_locked) {
      const badge = createEl("span", "chip is-warning", "In uso (chiusa)");
      title.appendChild(badge);
    }
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
    const editBtn = createEl("button", "btn btn-outline-secondary btn-sm", "Modifica");
    editBtn.type = "button";
    if (image.is_locked) {
      editBtn.disabled = true;
      editBtn.title = "Immagine usata in una traccia chiusa";
    }
    editBtn.addEventListener("click", () => {
      openImageEditModal(image);
    });
    actions.appendChild(selectBtn);
    actions.appendChild(editBtn);
    details.appendChild(title);
    details.appendChild(desc);
    details.appendChild(actions);
    item.appendChild(thumb);
    item.appendChild(details);
    imagePickerList.appendChild(item);
  });
};

const renderDbTables = (tables) => {
  if (!adminDbTableSelect) return;
  adminDbTableSelect.innerHTML = "";
  if (!tables.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Nessuna tabella";
    adminDbTableSelect.appendChild(opt);
    adminDbTableSelect.disabled = true;
    return;
  }
  tables.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    adminDbTableSelect.appendChild(opt);
  });
  adminDbTableSelect.disabled = false;
};

const loadDbTables = async () => {
  if (!adminDbTableSelect) return;
  try {
    const payload = await apiFetch("/api/db/tables");
    dbTablesCache = payload.tables || [];
    renderDbTables(dbTablesCache);
  } catch (err) {
    if (adminDbStatus) adminDbStatus.textContent = err.message;
    renderDbTables([]);
  }
};

const renderDbRows = ({ columns, rows, total }) => {
  if (adminDbTableHead) adminDbTableHead.innerHTML = "";
  if (adminDbTableBody) adminDbTableBody.innerHTML = "";
  if (adminDbCount) {
    const shown = rows.length;
    const start = total ? dbOffset + 1 : 0;
    const end = total ? dbOffset + shown : 0;
    adminDbCount.textContent =
      total !== null ? `Mostrate ${start}-${end} di ${total} righe` : "";
  }
  if (!columns || !columns.length) return;
  if (adminDbTableHead) {
    const tr = document.createElement("tr");
    columns.forEach((col) => {
      const th = document.createElement("th");
      const name = typeof col === "string" ? col : col.name;
      th.textContent = name || "";
      if (name) {
        th.classList.add("sortable");
        th.style.cursor = "pointer";
        if (dbOrderBy === name) {
          th.textContent = `${name} ${dbOrderDir === "ASC" ? "▲" : "▼"}`;
        }
        th.addEventListener("click", () => {
          if (dbOrderBy === name) {
            dbOrderDir = dbOrderDir === "ASC" ? "DESC" : "ASC";
          } else {
            dbOrderBy = name;
            dbOrderDir = "ASC";
          }
          dbOffset = 0;
          loadDbRows();
        });
      }
      tr.appendChild(th);
    });
    adminDbTableHead.appendChild(tr);
  }
  if (adminDbTableBody) {
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      columns.forEach((col) => {
        const td = document.createElement("td");
        const name = typeof col === "string" ? col : col.name;
        const value = row[name];
        td.textContent = value === null || value === undefined ? "" : String(value);
        tr.appendChild(td);
      });
      adminDbTableBody.appendChild(tr);
    });
  }
  if (adminDbPrev) adminDbPrev.disabled = dbOffset <= 0;
  if (adminDbNext) adminDbNext.disabled = !total || dbOffset + rows.length >= total;
};

const loadDbRows = async () => {
  let table = adminDbTableSelect?.value;
  if (!table && dbTablesCache.length && adminDbTableSelect) {
    adminDbTableSelect.value = dbTablesCache[0];
    table = adminDbTableSelect.value;
  }
  if (!table) return;
  const search = String(adminDbSearch?.value || "").trim();
  const limit = Number(adminDbLimit?.value || 100);
  try {
    if (adminDbStatus) adminDbStatus.textContent = "Caricamento...";
    const payload = await apiFetch("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table,
        search,
        limit,
        offset: dbOffset,
        orderBy: dbOrderBy,
        orderDir: dbOrderDir,
      }),
    });
    renderDbRows(payload);
    if (adminDbStatus) adminDbStatus.textContent = "";
  } catch (err) {
    if (adminDbStatus) adminDbStatus.textContent = err.message;
    renderDbRows({ columns: [], rows: [], total: 0 });
  }
};

const exportDbCsv = async () => {
  const table = adminDbTableSelect?.value;
  if (!table) return;
  const search = String(adminDbSearch?.value || "").trim();
  const limit = Number(adminDbLimit?.value || 100);
  try {
    const response = await fetch("/api/db/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table,
        search,
        limit,
        orderBy: dbOrderBy,
        orderDir: dbOrderDir,
      }),
    });
    if (!response.ok) throw new Error("Errore export");
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${table}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (err) {
    if (adminDbStatus) adminDbStatus.textContent = err.message;
  }
};

const updateImageFieldState = () => {
  const enabled = Boolean(adminQuestionImageLayout?.checked);
  if (adminPickImageBtn) adminPickImageBtn.disabled = !enabled;
  if (adminImageLayoutMode) {
    adminImageLayoutMode.querySelectorAll("input").forEach((input) => {
      input.disabled = !enabled;
    });
  }
  const mode = adminQuestionState.imageLayoutMode || "side";
  const splitEnabled = enabled && mode === "side";
  if (adminImageSplit) adminImageSplit.disabled = !splitEnabled;
  if (adminImageScaleRange) adminImageScaleRange.disabled = !enabled;
  if (adminImageSplitPresets) {
    adminImageSplitPresets.querySelectorAll("button").forEach((btn) => {
      btn.disabled = !splitEnabled;
    });
  }
  if (adminImageScalePresets) {
    adminImageScalePresets.querySelectorAll("button").forEach((btn) => {
      btn.disabled = !enabled;
    });
  }
  updateImageLayoutModeUI();
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

const setImageUploadMode = (mode, image = null) => {
  const isEdit = mode === "edit";
  imagePickerEditId = isEdit ? image?.id || null : null;
  imagePickerEditImage = isEdit ? image : null;
  if (imageUploadTitle) {
    imageUploadTitle.textContent = isEdit ? "Modifica immagine" : "Nuova immagine";
  }
  if (imageUploadSaveBtn) {
    imageUploadSaveBtn.textContent = isEdit ? "Salva modifiche" : "Carica immagine";
  }
  if (imageUploadStatus) imageUploadStatus.textContent = "";
  if (imageUploadNameInput) imageUploadNameInput.value = image?.name || "";
  if (imageUploadDescriptionInput)
    imageUploadDescriptionInput.value = image?.description || "";
  if (imageUploadFileInput) imageUploadFileInput.value = "";
  if (imageUploadSourceFileInput) imageUploadSourceFileInput.value = "";
};

const openImageUploadModal = () => {
  closeImagePicker();
  setImageUploadMode("new");
  if (imageUploadBackdrop) imageUploadBackdrop.classList.remove("is-hidden");
  if (imageUploadModal) imageUploadModal.classList.remove("is-hidden");
};

const openImageEditModal = (image) => {
  closeImagePicker();
  setImageUploadMode("edit", image);
  if (imageUploadBackdrop) imageUploadBackdrop.classList.remove("is-hidden");
  if (imageUploadModal) imageUploadModal.classList.remove("is-hidden");
};

const closeImageUploadModal = () => {
  if (imageUploadBackdrop) imageUploadBackdrop.classList.add("is-hidden");
  if (imageUploadModal) imageUploadModal.classList.add("is-hidden");
  imagePickerEditId = null;
  imagePickerEditImage = null;
};

const uploadImageFromModal = async () => {
  const courseId = Number(activeCourseId);
  if (!Number.isFinite(courseId)) {
    if (imageUploadStatus) imageUploadStatus.textContent = "Seleziona un corso.";
    return;
  }
  const name = String(imageUploadNameInput?.value || "").trim();
  const description = String(imageUploadDescriptionInput?.value || "").trim();
  const file = imageUploadFileInput?.files?.[0];
  const sourceFile = imageUploadSourceFileInput?.files?.[0];
  try {
    const dataBase64 = file ? await readFileAsDataUrl(file) : "";
    const sourceBase64 = sourceFile ? await readFileAsDataUrl(sourceFile) : "";
    if (imagePickerEditId) {
      await apiFetch(`/api/images/${imagePickerEditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || imagePickerEditImage?.name || "",
          description,
          originalName: file?.name || "",
          dataBase64,
          mimeType: file?.type || "",
          sourceOriginalName: sourceFile?.name || "",
          sourceBase64,
          sourceMimeType: sourceFile?.type || "",
        }),
      });
    } else {
      if (!file) {
        if (imageUploadStatus) imageUploadStatus.textContent = "Seleziona un file.";
        return;
      }
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
          sourceOriginalName: sourceFile?.name || "",
          sourceBase64,
          sourceMimeType: sourceFile?.type || "",
        }),
      });
    }
    if (imageUploadNameInput) imageUploadNameInput.value = "";
    if (imageUploadDescriptionInput) imageUploadDescriptionInput.value = "";
    if (imageUploadFileInput) imageUploadFileInput.value = "";
    if (imageUploadSourceFileInput) imageUploadSourceFileInput.value = "";
    if (imageUploadStatus) {
      imageUploadStatus.textContent = imagePickerEditId
        ? "Immagine aggiornata."
        : "Immagine caricata.";
    }
    await loadImages(courseId);
    closeImageUploadModal();
    imagePickerEditId = null;
    imagePickerEditImage = null;
  } catch (err) {
    if (imageUploadStatus) {
      imageUploadStatus.textContent = err.message || "Errore upload immagine.";
    }
  }
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
  updateSaveStateFromSnapshot();
  if (adminPreviewMeta) {
    const typeLabel = adminQuestionState.type === "multipla" ? "Multipla" : "Singola";
    const answersCount = adminQuestionState.answers.length;
    adminPreviewMeta.textContent = `${typeLabel} • ${answersCount} risposte`;
  }
  if (adminPreviewImageWrap && adminPreviewImage) {
    const path = adminQuestionState.image || "";
    const showImage = Boolean(adminQuestionState.imageLayoutEnabled) && Boolean(path);
    if (showImage) {
      const found = imageCache.find((image) => image.file_path === path);
      const previewPath = found?.thumbnail_path || path;
      adminPreviewImageWrap.classList.remove("is-hidden");
      adminPreviewImage.src = previewPath;
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
  note: "",
  topicIds: [],
  image: "",
  imageLayoutEnabled: false,
  imageLayoutMode: "side",
  imageLeft: "0.5\\linewidth",
  imageRight: "0.5\\linewidth",
  imageScale: "0.96\\linewidth",
  answers: [
    { text: "", note: "", correct: false },
    { text: "", note: "", correct: false },
    { text: "", note: "", correct: false },
    { text: "", note: "", correct: false },
  ],
};

const renderAdminAnswers = () => {
  if (!adminAnswers) return;
  adminAnswers.innerHTML = "";
  const disabled = adminQuestionState.topicIds.length === 0;
  adminQuestionState.answers.forEach((answer, idx) => {
    const row = createEl("div", "answer-builder-admin");
    const check = createEl("input", "form-check-input");
    check.type = "checkbox";
    check.checked = Boolean(answer.correct);
    check.disabled = disabled;
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
    input.disabled = disabled;
    input.addEventListener("focus", () => setFocusedInput(input));
    input.addEventListener("input", () => {
      adminQuestionState.answers[idx].text = input.value;
      updateAdminPreviews();
    });
    const noteBtn = createEl("button", "btn btn-outline-secondary btn-sm", "Note");
    noteBtn.type = "button";
    noteBtn.disabled = disabled;
    if (answer.note && answer.note.trim()) {
      noteBtn.classList.add("is-active");
    }
    noteBtn.addEventListener("click", () => {
      openAnswerNoteModal(idx);
    });
    const remove = createEl("button", "btn btn-outline-danger btn-sm", "Rimuovi");
    remove.type = "button";
    remove.disabled = disabled;
    remove.addEventListener("click", () => {
      adminQuestionState.answers.splice(idx, 1);
      renderAdminAnswers();
    });
    row.appendChild(check);
    row.appendChild(input);
    row.appendChild(noteBtn);
    row.appendChild(remove);
    adminAnswers.appendChild(row);
  });
  updateAdminPreviews();
};

const resetAdminQuestion = () => {
  editingQuestionId = null;
  adminQuestionState.type = "singola";
  adminQuestionState.text = "";
  adminQuestionState.note = "";
  adminQuestionState.topicIds = [];
  adminQuestionState.image = "";
  adminQuestionState.imageLayoutEnabled = false;
  adminQuestionState.imageLayoutMode = "side";
  adminQuestionState.imageLeft = "0.5\\linewidth";
  adminQuestionState.imageRight = "0.5\\linewidth";
  adminQuestionState.imageScale = "0.96\\linewidth";
  adminQuestionState.image = "";
  adminQuestionState.answers = [
    { text: "", note: "", correct: false },
    { text: "", note: "", correct: false },
    { text: "", note: "", correct: false },
    { text: "", note: "", correct: false },
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
  if (adminImageLayoutMode) {
    const radio = adminImageLayoutMode.querySelector('input[value="side"]');
    if (radio) radio.checked = true;
    updateImageLayoutModePills();
  }
  updateImageLayoutState();
  updateImageFieldState();
  updateImagePickButton();
  updateImageLayoutState();
  if (adminImageAccordion) adminImageAccordion.open = false;
  renderAdminAnswers();
  updateAdminPreviews();
  updateQuestionNoteButton();
  if (adminEditBadge) adminEditBadge.classList.add("is-hidden");
  if (adminEditBadgeTop) adminEditBadgeTop.classList.add("is-hidden");
  lastSavedSnapshot = getQuestionSnapshot();
  setSaveState("saved");
};

const duplicateAdminQuestion = () => {
  if (!adminQuestionText) return;
  editingQuestionId = null;
  if (adminEditBadge) adminEditBadge.classList.add("is-hidden");
  if (adminEditBadgeTop) adminEditBadgeTop.classList.add("is-hidden");
  if (adminQuestionStatus) adminQuestionStatus.textContent = "Duplica attiva: salva per creare una nuova domanda.";
  updateAdminPreviews();
  lastSavedSnapshot = "";
  setSaveState("dirty");
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
      updateTopicGate();
      updateAdminPreviews();
    });
    adminQuestionTopics.appendChild(pill);
  });
  updateTopicGate();
};

const updateTopicGate = () => {
  const enabled = adminQuestionState.topicIds.length > 0;
  if (adminQuestionText) adminQuestionText.disabled = !enabled;
  const textField = adminQuestionText?.closest(".field");
  if (textField) textField.classList.toggle("editor-disabled", !enabled);
  if (adminShortcutBar) adminShortcutBar.classList.toggle("editor-disabled", !enabled);
  if (adminShortcutAddBtn) adminShortcutAddBtn.disabled = !enabled;
  if (adminToolbarSave) adminToolbarSave.disabled = !enabled;
  if (adminQuestionNoteBtn) adminQuestionNoteBtn.disabled = !enabled;
  const answersBlock = adminAnswers?.closest(".answers-builder");
  if (answersBlock) answersBlock.classList.toggle("editor-disabled", !enabled);
  if (adminAddAnswerBtn) adminAddAnswerBtn.disabled = !enabled;
  if (adminImageAccordion) {
    adminImageAccordion.classList.toggle("is-disabled", !enabled);
    if (!enabled) adminImageAccordion.open = false;
  }
  if (adminQuestionImageLayout) adminQuestionImageLayout.disabled = !enabled;
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
  renderAdminAnswers();
};

const renderCourseList = (courses) => {
  if (!adminCourseList) return;
  if (window.CourseCards && typeof window.CourseCards.render === "function") {
    CourseCards.render(adminCourseList, courses, {
      emptyText: "Nessun corso presente.",
      actions: (course) => {
        const blocked = course.has_exams || course.has_topics || course.has_images;
        return [
          {
            label: "Modifica",
            className: "btn btn-outline-secondary btn-sm",
            onClick: () => setCourseEditState(course),
          },
          {
            label: "Elimina",
            className: "btn btn-outline-danger btn-sm",
            disabled: blocked,
            title: blocked
              ? "Non eliminabile: esistono tracce/argomenti/immagini associate"
              : "",
            onClick: () => deleteCourse(course.id),
          },
        ];
      },
    });
    return;
  }
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
    const editBtn = createEl("button", "btn btn-outline-secondary btn-sm", "Modifica");
    editBtn.type = "button";
    editBtn.addEventListener("click", () => {
      setCourseEditState(course);
    });
    const deleteBtn = createEl("button", "btn btn-outline-danger btn-sm", "Elimina");
    deleteBtn.type = "button";
    deleteBtn.addEventListener("click", () => deleteCourse(course.id));
    actions.appendChild(editBtn);
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
    const count = Number(topic.question_count || 0);
    const meta = createEl("div", "list-meta");
    const badge = createEl("span", "pill-badge", `Domande: ${count}`);
    const actions = createEl("div", "list-actions");
    const editBtn = createEl("button", "btn btn-outline-secondary btn-sm", "Modifica");
    editBtn.type = "button";
    editBtn.addEventListener("click", () => {
      setTopicEditState(topic);
    });
    const deleteBtn = createEl("button", "btn btn-outline-danger btn-sm", "Elimina");
    deleteBtn.type = "button";
    deleteBtn.addEventListener("click", () => deleteTopic(topic.id));
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    item.appendChild(title);
    meta.appendChild(badge);
    item.appendChild(meta);
    item.appendChild(actions);
    adminTopicList.appendChild(item);
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
    const item = createEl("div", "list-item question-bank-card");
    const band = createEl("div", "question-card-band");
    const badgeRow = createEl("div", "chip-row");
    const isLocked = Boolean(question.is_locked);
    const isUsed = Boolean(question.is_used);
    const typeChip = createEl(
      "span",
      "chip chip-action",
      question.type === "multipla" ? "Multipla" : "Singola"
    );
    badgeRow.appendChild(typeChip);
    if (isLocked) {
      const lockedChip = createEl("span", "chip is-warning", "In uso (chiusa)");
      badgeRow.appendChild(lockedChip);
    }
    if (question.image_path) {
      const imageChip = createEl("span", "chip chip-action", "Immagine");
      badgeRow.appendChild(imageChip);
    }
    if (question.last_exam_title || question.last_exam_date) {
      const dateLabel = question.last_exam_date
        ? formatDateDisplay(question.last_exam_date)
        : "";
      const titleLabel = question.last_exam_title || "Esame";
      const label = dateLabel ? `${titleLabel} · ${dateLabel}` : titleLabel;
      const dateChip = createEl("span", "chip chip-action", `Usata: ${label}`);
      badgeRow.appendChild(dateChip);
    }
    band.appendChild(badgeRow);
    const content = createEl("div", "question-card-content");
    const preview = createEl("div", "bank-question-preview");
    if (window.QuestionCards && typeof window.QuestionCards.renderPreview === "function") {
      window.QuestionCards.renderPreview(preview, question, {
        renderMath: renderMathDisplay,
        answersMode: "accordion",
      });
    } else {
      renderMathDisplay(question.text || "", preview);
    }
    const meta = createEl("div", "list-meta");
    if (question.topics.length) {
      question.topics.forEach((topic) => {
        const chip = createEl("span", "chip chip-action", topic);
        meta.appendChild(chip);
      });
    } else {
      meta.textContent = "Nessun argomento";
    }
    const actions = createEl("div", "list-actions");
    const dupBtn = createEl("button", "btn btn-outline-secondary btn-sm", "Duplica");
    dupBtn.type = "button";
    dupBtn.addEventListener("click", () => duplicateQuestion(question.id));
    actions.appendChild(dupBtn);
    if (!isLocked) {
      const editBtn = createEl("button", "btn btn-outline-primary btn-sm", "Modifica");
      editBtn.type = "button";
      editBtn.addEventListener("click", () => {
        closeBankModal();
        loadQuestionForEdit(question.id);
      });
      const delBtn = createEl("button", "btn btn-outline-danger btn-sm", "Elimina");
      delBtn.type = "button";
      if (isUsed) {
        delBtn.disabled = true;
        delBtn.title = "Domanda usata in una traccia";
      } else {
        delBtn.addEventListener("click", () => deleteQuestion(question.id));
      }
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
    }
    content.appendChild(preview);
    content.appendChild(meta);
    content.appendChild(actions);
    item.appendChild(band);
    item.appendChild(content);
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
    if (bankCourseSelect) bankCourseSelect.value = "";
    renderSelectOptions(bankTopicSelect, [], "Tutti gli argomenti");
    renderTopicOptions([]);
    renderShortcutBar([]);
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
  if (syncBank && bankCourseSelect && bankCourseSelect.value !== String(courseId)) {
    bankCourseSelect.value = String(courseId);
  }
  if (resetTopics) {
    adminQuestionState.topicIds = [];
  }
  await loadQuestionTopics(courseId);
  await loadTopics(courseId, bankTopicSelect, "Tutti gli argomenti");
  await loadShortcutsForEditor(courseId);
  await loadMultiModuleExams(courseId);
  await loadMultiModules(courseId);
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
  renderSelectOptions(adminShortcutCourse, courses, "Seleziona corso");
  renderSelectOptions(adminImageCourse, courses, "Seleziona corso");
  renderSelectOptions(bankCourseSelect, courses, "Tutti i corsi");
  renderCourseList(courses);
  const storedCourseId = getStoredAdminCourseId();
  const storedExists = Number.isFinite(storedCourseId)
    ? courses.some((course) => course.id === storedCourseId)
    : false;
  const activeExists = Number.isFinite(activeCourseId)
    ? courses.some((course) => course.id === activeCourseId)
    : false;
  const fallbackId = courses[0]?.id;
  const preferredId = activeExists ? activeCourseId : storedExists ? storedCourseId : fallbackId;
  if (Number.isFinite(preferredId)) {
    await setActiveCourse(preferredId, { persist: true });
    if (adminShortcutCourse) adminShortcutCourse.value = String(preferredId);
  } else {
    await setActiveCourse(Number.NaN, { persist: false });
  }
  return courses;
};

const setMultiModuleEditState = (group) => {
  editingMultiModuleId = group ? group.id : null;
  if (adminMultiModuleName) adminMultiModuleName.value = group ? group.name : "";
  if (adminMultiModuleExam1) adminMultiModuleExam1.value = group ? String(group.exam_id_module1) : "";
  if (adminMultiModuleExam2) adminMultiModuleExam2.value = group ? String(group.exam_id_module2) : "";
  if (adminMultiModuleMin1) adminMultiModuleMin1.value = group ? String(group.module1_min_grade) : "16";
  if (adminMultiModuleMin2) adminMultiModuleMin2.value = group ? String(group.module2_min_grade) : "16";
  if (adminMultiModuleWeight1) adminMultiModuleWeight1.value = group ? String(group.weight_module1) : "0.5";
  if (adminMultiModuleWeight2) adminMultiModuleWeight2.value = group ? String(group.weight_module2) : "0.5";
  if (adminMultiModuleWeight1Label)
    adminMultiModuleWeight1Label.textContent = adminMultiModuleWeight1?.value || "0.5";
  if (adminMultiModuleWeight2Label)
    adminMultiModuleWeight2Label.textContent = adminMultiModuleWeight2?.value || "0.5";
  if (adminCreateMultiModuleBtn)
    adminCreateMultiModuleBtn.classList.toggle("is-hidden", Boolean(group));
  if (adminUpdateMultiModuleBtn)
    adminUpdateMultiModuleBtn.classList.toggle("is-hidden", !group);
  if (adminCancelMultiModuleBtn)
    adminCancelMultiModuleBtn.classList.toggle("is-hidden", !group);
  if (adminMultiModuleStatus) {
    adminMultiModuleStatus.textContent = group ? `Modifica gruppo: ${group.name}` : "";
  }
};

const renderMultiModuleList = (groups) => {
  if (!adminMultiModuleList) return;
  adminMultiModuleList.innerHTML = "";
  if (!groups.length) {
    adminMultiModuleList.textContent = "Nessun gruppo multi-modulo per questo corso.";
    return;
  }
  groups.forEach((group) => {
    const item = createEl("div", "list-item");
    const content = createEl("div", "question-card-content");
    const title = createEl("div", "list-item-title", group.name);
    const meta = createEl(
      "div",
      "list-item-meta",
      `Modulo 1: ${group.module1_title || "—"} (${group.module1_date || "n.d."}) · Modulo 2: ${
        group.module2_title || "—"
      } (${group.module2_date || "n.d."})`
    );
    const chips = createEl("div", "chip-row");
    const min1 = createEl("span", "chip", `Soglia M1: ${group.module1_min_grade}`);
    const min2 = createEl("span", "chip", `Soglia M2: ${group.module2_min_grade}`);
    const weights = createEl(
      "span",
      "chip",
      `Pesi: ${group.weight_module1} / ${group.weight_module2}`
    );
    const finalMin = createEl("span", "chip", `Finale: ≥ ${group.final_min_grade}`);
    const rounding = createEl("span", "chip", "Arrotondamento: ceil");
    chips.appendChild(min1);
    chips.appendChild(min2);
    chips.appendChild(weights);
    chips.appendChild(finalMin);
    chips.appendChild(rounding);
    const actions = createEl("div", "list-actions");
    const editBtn = createEl("button", "btn btn-outline-secondary btn-sm", "Modifica");
    editBtn.type = "button";
    editBtn.addEventListener("click", () => setMultiModuleEditState(group));
    const deleteBtn = createEl("button", "btn btn-outline-danger btn-sm", "Elimina");
    deleteBtn.type = "button";
    deleteBtn.addEventListener("click", () => deleteMultiModule(group.id));
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    content.appendChild(title);
    content.appendChild(meta);
    content.appendChild(chips);
    content.appendChild(actions);
    item.appendChild(content);
    adminMultiModuleList.appendChild(item);
  });
};

const loadMultiModuleExams = async (courseId) => {
  if (!Number.isFinite(courseId)) {
    renderSelectOptions(adminMultiModuleExam1, [], "Seleziona modulo 1");
    renderSelectOptions(adminMultiModuleExam2, [], "Seleziona modulo 2");
    multiModuleExamCache = [];
    return [];
  }
  const payload = await apiFetch("/api/exams");
  const exams = (payload.exams || [])
    .filter((exam) => exam.course_id === courseId)
    .sort((a, b) => {
      const ta = a.date ? new Date(a.date).getTime() : 0;
      const tb = b.date ? new Date(b.date).getTime() : 0;
      if (tb !== ta) return tb - ta;
      return String(b.updated_at || "").localeCompare(String(a.updated_at || ""));
    });
  multiModuleExamCache = exams;
  const examOptions = exams.map((exam) => ({
    id: exam.id,
    name: `${exam.title}${exam.date ? ` • ${exam.date}` : ""}`,
  }));
  renderSelectOptions(adminMultiModuleExam1, examOptions, "Seleziona modulo 1");
  renderSelectOptions(adminMultiModuleExam2, examOptions, "Seleziona modulo 2");
  return exams;
};

const loadMultiModules = async (courseId) => {
  if (!Number.isFinite(courseId)) {
    renderMultiModuleList([]);
    return;
  }
  const payload = await apiFetch(`/api/multi-modules?courseId=${courseId}`);
  multiModuleCache = payload.multiModules || [];
  renderMultiModuleList(multiModuleCache);
};

const createMultiModule = async () => {
  const courseId = Number(activeCourseId);
  const name = String(adminMultiModuleName?.value || "").trim();
  const examIdModule1 = readSelectNumber(adminMultiModuleExam1);
  const examIdModule2 = readSelectNumber(adminMultiModuleExam2);
  const module1MinGrade = Number(adminMultiModuleMin1?.value || "");
  const module2MinGrade = Number(adminMultiModuleMin2?.value || "");
  const weightModule1 = Number(adminMultiModuleWeight1?.value || "");
  const weightModule2 = Number(adminMultiModuleWeight2?.value || "");
  if (!Number.isFinite(courseId)) {
    if (adminMultiModuleStatus) adminMultiModuleStatus.textContent = "Seleziona un corso.";
    return;
  }
  if (!name || !Number.isFinite(examIdModule1) || !Number.isFinite(examIdModule2)) {
    if (adminMultiModuleStatus) adminMultiModuleStatus.textContent = "Compila nome e moduli.";
    return;
  }
  if (!Number.isFinite(module1MinGrade) || !Number.isFinite(module2MinGrade)) {
    if (adminMultiModuleStatus) adminMultiModuleStatus.textContent = "Soglie non valide.";
    return;
  }
  if (!Number.isFinite(weightModule1) || !Number.isFinite(weightModule2)) {
    if (adminMultiModuleStatus) adminMultiModuleStatus.textContent = "Pesi non validi.";
    return;
  }
  if (weightModule1 < 0 || weightModule2 < 0) {
    if (adminMultiModuleStatus) adminMultiModuleStatus.textContent = "I pesi devono essere positivi.";
    return;
  }
  const weightSum = Number((weightModule1 + weightModule2).toFixed(4));
  if (weightSum !== 1) {
    if (adminMultiModuleStatus)
      adminMultiModuleStatus.textContent = "La somma dei pesi deve essere 1.0.";
    return;
  }
  try {
    await apiFetch("/api/multi-modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        examIdModule1,
        examIdModule2,
        module1MinGrade,
        module2MinGrade,
        weightModule1,
        weightModule2,
      }),
    });
    setMultiModuleEditState(null);
    if (adminMultiModuleStatus) adminMultiModuleStatus.textContent = "Gruppo creato.";
    await loadMultiModules(courseId);
  } catch (err) {
    if (adminMultiModuleStatus) {
      adminMultiModuleStatus.textContent = err.message || "Errore creazione gruppo.";
    }
  }
};

const updateMultiModule = async () => {
  if (!editingMultiModuleId) return;
  const courseId = Number(activeCourseId);
  const name = String(adminMultiModuleName?.value || "").trim();
  const module1MinGrade = Number(adminMultiModuleMin1?.value || "");
  const module2MinGrade = Number(adminMultiModuleMin2?.value || "");
  const weightModule1 = Number(adminMultiModuleWeight1?.value || "");
  const weightModule2 = Number(adminMultiModuleWeight2?.value || "");
  if (!Number.isFinite(courseId) || !name) {
    if (adminMultiModuleStatus) adminMultiModuleStatus.textContent = "Compila il nome.";
    return;
  }
  try {
    await apiFetch(`/api/multi-modules/${editingMultiModuleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        module1MinGrade,
        module2MinGrade,
        weightModule1,
        weightModule2,
      }),
    });
    setMultiModuleEditState(null);
    if (adminMultiModuleStatus) adminMultiModuleStatus.textContent = "Gruppo aggiornato.";
    await loadMultiModules(courseId);
  } catch (err) {
    if (adminMultiModuleStatus) {
      adminMultiModuleStatus.textContent = err.message || "Errore aggiornamento gruppo.";
    }
  }
};

const cancelMultiModuleEdit = () => {
  setMultiModuleEditState(null);
};

const deleteMultiModule = async (id) => {
  if (!confirm("Vuoi eliminare il gruppo multi-modulo?")) return;
  await apiFetch(`/api/multi-modules/${id}`, { method: "DELETE" });
  if (Number.isFinite(activeCourseId)) {
    await loadMultiModules(activeCourseId);
  }
};

const loadTopics = async (courseId, select, placeholder) => {
  if (!Number.isFinite(courseId)) {
    if (select) renderSelectOptions(select, [], placeholder);
    renderTopicList([]);
    return;
  }
  const payload = await apiFetch(`/api/topics?courseId=${courseId}`);
  if (select) renderSelectOptions(select, payload.topics || [], placeholder);
  renderTopicList(payload.topics || []);
};

const loadImages = async (courseId) => {
  if (!Number.isFinite(courseId)) {
    imageCache = [];
    return;
  }
  const payload = await apiFetch(`/api/images?courseId=${courseId}`);
  imageCache = payload.images || [];
};

const loadImageCourses = () => {
  if (adminCoursePicker?.value && adminImageCourse) {
    adminImageCourse.value = adminCoursePicker.value;
  }
};

const renderAdminImageList = (images) => {
  if (!adminImageList) return;
  adminImageList.innerHTML = "";
  if (!images.length) {
    adminImageList.textContent = "Nessuna immagine disponibile per il corso selezionato.";
    return;
  }
  images.forEach((image) => {
    const item = document.createElement("div");
    item.className = "image-bank-item";
    item.innerHTML = `
      <img src="${image.file_path}" alt="${image.name}" />
      <div class="image-bank-info">
        <strong>${image.name}</strong>
        ${image.is_locked ? `<span class="chip is-warning">In uso (chiusa)</span>` : ""}
        ${image.description ? `<span>${image.description}</span>` : ""}
      </div>
      <div class="image-bank-actions">
        <button class="btn btn-outline-secondary btn-sm edit-btn">Modifica</button>
        <button class="btn btn-outline-danger btn-sm delete-btn">Elimina</button>
      </div>
    `;
    const editBtn = item.querySelector(".edit-btn");
    if (editBtn) {
      if (image.is_locked) {
        editBtn.disabled = true;
        editBtn.title = "Immagine usata in una traccia chiusa";
      }
      editBtn.addEventListener("click", () => setImageEditState(image));
    }
    const deleteBtn = item.querySelector(".delete-btn");
    deleteBtn?.addEventListener("click", async () => {
      if (!confirm(`Eliminare l'immagine "${image.name}"?`)) return;
      try {
        await apiFetch(`/api/images/${image.id}`, { method: "DELETE" });
        loadImagesForAdmin();
      } catch (err) {
        if (adminImageStatus) adminImageStatus.textContent = err.message || "Errore eliminazione.";
      }
    });
    adminImageList.appendChild(item);
  });
};

const setImageEditState = (image) => {
  editingImageId = image ? image.id : null;
  if (adminImageName) adminImageName.value = image ? image.name : "";
  if (adminImageDescription) adminImageDescription.value = image ? (image.description || "") : "";
  if (adminImageFile) adminImageFile.value = "";
  if (adminImageSourceFile) adminImageSourceFile.value = "";
  if (adminImageStatus) adminImageStatus.textContent = image ? `Modifica: ${image.name}` : "";
  if (adminUploadImageBtn) adminUploadImageBtn.classList.toggle("is-hidden", Boolean(image));
  if (adminUpdateImageBtn) adminUpdateImageBtn.classList.toggle("is-hidden", !image);
  if (adminCancelImageBtn) adminCancelImageBtn.classList.toggle("is-hidden", !image);
  if (adminImageCourse) adminImageCourse.disabled = Boolean(image);
};

const cancelImageEdit = () => {
  setImageEditState(null);
};

const loadImagesForAdmin = async () => {
  const courseId = Number(adminImageCourse?.value || "");
  if (!Number.isFinite(courseId) || courseId <= 0) {
    if (adminImageList) adminImageList.innerHTML = "";
    return;
  }
  try {
    const payload = await apiFetch(`/api/images?courseId=${courseId}`);
    renderAdminImageList(payload.images || []);
  } catch (err) {
    if (adminImageStatus) adminImageStatus.textContent = err.message || "Errore caricamento.";
  }
};

const formatUserDate = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleDateString("it-IT");
};

const renderUserList = () => {
  if (!adminUserList) return;
  if (!window.UserCards) {
    adminUserList.textContent = "Caricamento utenti...";
    return;
  }
  const users = userCache.map((user) => ({
    ...user,
    created_at: formatUserDate(user.created_at),
  }));
  window.UserCards.render(adminUserList, users, {
    emptyText: "Nessun utente disponibile.",
    actions: (user) => [
      {
        label: "Modifica",
        className: "btn btn-outline-secondary btn-sm",
        onClick: () => setUserEditState(user),
      },
      {
        label: "Elimina",
        className: "btn btn-outline-danger btn-sm",
        disabled: user.role === "admin",
        title: user.role === "admin" ? "Non puoi eliminare un amministratore." : "",
        onClick: async () => {
          if (user.role === "admin") return;
          if (!confirm("Vuoi eliminare questo utente?")) return;
          try {
            await apiFetch(`/api/users/${user.id}`, { method: "DELETE" });
            await loadUsers();
          } catch (err) {
            if (adminUserStatus) adminUserStatus.textContent = err.message || "Errore eliminazione.";
          }
        },
      },
    ],
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

const updateUser = async () => {
  if (!editingUserId) return;
  const username = String(adminUserNameInput?.value || "").trim();
  const password = String(adminUserPasswordInput?.value || "");
  const role = String(adminUserRoleSelect?.value || "").trim();
  if (!username || !role) {
    if (adminUserStatus) adminUserStatus.textContent = "Compila username e ruolo.";
    return;
  }
  const payload = { username, role };
  if (password) payload.password = password;
  try {
    await apiFetch(`/api/users/${editingUserId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setUserEditState(null);
    if (adminUserStatus) adminUserStatus.textContent = "Utente aggiornato.";
    await loadUsers();
  } catch (err) {
    if (adminUserStatus) adminUserStatus.textContent = err.message || "Errore aggiornamento utente.";
  }
};

const cancelUserEdit = () => {
  setUserEditState(null);
};

const createCourse = async () => {
  const name = adminCourseNewInput?.value.trim() || "";
  if (!name) {
    if (adminCourseStatus) adminCourseStatus.textContent = "Inserisci il nome del corso.";
    return;
  }
  try {
    await apiFetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (adminCourseNewInput) adminCourseNewInput.value = "";
    if (adminCourseStatus) adminCourseStatus.textContent = "Corso creato.";
    await loadCourses();
  } catch (err) {
    if (adminCourseStatus) adminCourseStatus.textContent = err.message || "Errore creazione corso.";
  }
};

const updateCourse = async () => {
  if (!editingCourseId) return;
  const name = adminCourseNewInput?.value.trim() || "";
  if (!name) {
    if (adminCourseStatus) adminCourseStatus.textContent = "Inserisci il nome del corso.";
    return;
  }
  try {
    await apiFetch(`/api/courses/${editingCourseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setCourseEditState(null);
    if (adminCourseStatus) adminCourseStatus.textContent = "Corso aggiornato.";
    await loadCourses();
  } catch (err) {
    if (adminCourseStatus) adminCourseStatus.textContent = err.message || "Errore aggiornamento corso.";
  }
};

const cancelCourseEdit = () => {
  setCourseEditState(null);
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
  if (adminTopicStatus) adminTopicStatus.textContent = "Argomento creato.";
  await loadTopics(courseId, bankTopicSelect, "Tutti gli argomenti");
  await loadQuestionTopics(courseId);
};

const updateTopic = async () => {
  if (!editingTopicId) return;
  const courseId = Number(adminTopicCourseSelect?.value || "");
  const name = adminTopicNewInput?.value.trim() || "";
  if (!Number.isFinite(courseId) || !name) {
    if (adminTopicStatus) adminTopicStatus.textContent = "Inserisci il nome dell'argomento.";
    return;
  }
  try {
    await apiFetch(`/api/topics/${editingTopicId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, name }),
    });
    setTopicEditState(null);
    if (adminTopicStatus) adminTopicStatus.textContent = "Argomento aggiornato.";
    await loadTopics(courseId, bankTopicSelect, "Tutti gli argomenti");
    await loadQuestionTopics(courseId);
  } catch (err) {
    if (adminTopicStatus) adminTopicStatus.textContent = err.message || "Errore aggiornamento argomento.";
  }
};

const cancelTopicEdit = () => {
  setTopicEditState(null);
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
  const fallbackCourseId = Number.isFinite(Number(activeCourseId))
    ? Number(activeCourseId)
    : null;
  const courseId =
    courseRaw === "" ? fallbackCourseId : Number(courseRaw);
  const topicId = topicRaw === "" ? null : Number(topicRaw);
  const search = String(bankSearchInput?.value || "").trim();
  const params = new URLSearchParams();
  if (Number.isFinite(courseId)) params.set("courseId", String(courseId));
  if (Number.isFinite(topicId)) params.set("topicId", String(topicId));
  if (search) params.set("search", search);
  params.set("includeAnswers", "1");
  const payload = await apiFetch(`/api/questions?${params.toString()}`);
  let questions = payload.questions || [];
  const usage = String(bankUsageSelect?.value || "all");
  if (usage === "used") {
    questions = questions.filter((question) => Boolean(question.is_used));
  } else if (usage === "unused") {
    questions = questions.filter((question) => !question.is_used);
  }
  renderBankList(questions);
};

const duplicateQuestion = async (questionId) => {
  const courseId = Number.isFinite(Number(activeCourseId))
    ? Number(activeCourseId)
    : Number(bankCourseSelect?.value || "");
  await apiFetch(`/api/questions/${questionId}/duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId }),
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
  if (adminImageLayoutMode) {
    const mode = q.imageLayoutMode || "side";
    const radio = adminImageLayoutMode.querySelector(`input[value="${mode}"]`);
    if (radio) radio.checked = true;
    updateImageLayoutModePills();
  }
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
  adminQuestionState.note = q.note || "";
  adminQuestionState.image = q.imagePath || "";
  adminQuestionState.imageLayoutEnabled = Boolean(q.imageLayoutEnabled);
  adminQuestionState.imageLayoutMode = q.imageLayoutMode || "side";
  adminQuestionState.imageLeft = q.imageLeftWidth || "0.5\\linewidth";
  adminQuestionState.imageRight = q.imageRightWidth || "0.5\\linewidth";
  adminQuestionState.imageScale = q.imageScale || "0.96\\linewidth";
  adminQuestionState.answers = (q.answers || []).map((ans) => ({
    text: ans.text,
    note: ans.note || "",
    correct: Boolean(ans.isCorrect),
  }));
  adminQuestionState.topicIds = q.topicIds || [];
  renderAdminAnswers();
  renderTopicOptions(topicOptions);
  if (adminQuestionStatus) adminQuestionStatus.textContent = "Modifica attiva.";
  if (adminEditBadge) adminEditBadge.classList.remove("is-hidden");
  if (adminEditBadgeTop) adminEditBadgeTop.classList.remove("is-hidden");
  updateImageLayoutState();
  updateImagePickButton();
  updateAdminPreviews();
  updateQuestionNoteButton();
  lastSavedSnapshot = getQuestionSnapshot();
  setSaveState("saved");
};

const saveAdminQuestion = async () => {
  const courseId = readSelectNumber(adminCoursePicker);
  if (!Number.isFinite(courseId)) {
    setQuestionStatus("Seleziona un corso.", "error");
    return;
  }
  const text = String(adminQuestionText?.value || "").trim();
  if (!text) {
    setQuestionStatus("Inserisci il testo della domanda.", "error");
    return;
  }
  const topics = topicOptions
    .filter((topic) => adminQuestionState.topicIds.includes(topic.id))
    .map((topic) => topic.name);
  if (!topics.length) {
    setQuestionStatus("Seleziona almeno un argomento.", "error");
    return;
  }
  const answers = adminQuestionState.answers.filter((answer) => answer.text.trim() !== "");
  if (answers.length < 2) {
    setQuestionStatus("Inserisci almeno due risposte.", "error");
    return;
  }
  const payload = {
    courseId,
    question: {
      text,
      note: String(adminQuestionState.note || "").trim(),
      type: adminQuestionState.type,
      imagePath: String(adminQuestionState.image || "").trim(),
      imageLayoutEnabled: Boolean(adminQuestionImageLayout?.checked),
      imageLayoutMode: adminQuestionState.imageLayoutMode || "side",
      imageLeftWidth: String(adminQuestionState.imageLeft || "").trim(),
      imageRightWidth: String(adminQuestionState.imageRight || "").trim(),
      imageScale: String(adminQuestionState.imageScale || "").trim(),
      topics: Array.from(new Set(topics)),
      answers: answers.map((answer) => ({
        text: answer.text.trim(),
        note: String(answer.note || "").trim(),
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
    setQuestionStatus("Domanda aggiornata.", "success");
  } else {
    await apiFetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (typeof showToast === "function") {
      showToast("Domanda salvata nel banco.", "success");
    } else {
      setQuestionStatus("Domanda salvata nel banco.", "success");
    }
  }
  lastSavedSnapshot = getQuestionSnapshot();
  setSaveState("saved");
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
  const activeCourse = await fetchActiveCourse();
  if (!activeCourse) {
    if (courseEmptyState) courseEmptyState.classList.remove("is-hidden");
    if (mainLayout) mainLayout.classList.add("is-hidden");
    return;
  }
  activeCourseId = activeCourse.id;
  if (courseEmptyState) courseEmptyState.classList.add("is-hidden");
  if (mainLayout) mainLayout.classList.remove("is-hidden");
  await loadCourses();
  renderSelectOptions(bankTopicSelect, [], "Tutti gli argomenti");
  resetAdminQuestion();
  if (adminImageAccordion) adminImageAccordion.open = false;

  if (adminAddCourseBtn) adminAddCourseBtn.addEventListener("click", createCourse);
  if (adminAddTopicBtn) adminAddTopicBtn.addEventListener("click", createTopic);
  if (adminAddAnswerBtn) {
    adminAddAnswerBtn.addEventListener("click", () => {
      adminQuestionState.answers.push({ text: "", note: "", correct: false });
      renderAdminAnswers();
    });
  }
  if (adminQuestionText) {
    adminQuestionText.addEventListener("focus", () => setFocusedInput(adminQuestionText));
    adminQuestionText.addEventListener("input", () => {
      adminQuestionState.text = adminQuestionText.value;
      updateAdminPreviews();
    });
  }
if (adminToolbarReset) adminToolbarReset.addEventListener("click", resetAdminQuestion);
if (adminToolbarNew) adminToolbarNew.addEventListener("click", resetAdminQuestion);
if (adminToolbarDuplicate) adminToolbarDuplicate.addEventListener("click", duplicateAdminQuestion);
if (adminToolbarSave) {
  adminToolbarSave.addEventListener("click", () => {
    saveAdminQuestion();
  });
}
  if (adminPreviewRefresh) adminPreviewRefresh.addEventListener("click", updateAdminPreviews);
  if (adminToolbarBank) adminToolbarBank.addEventListener("click", openBankModal);
  if (bankModalClose) bankModalClose.addEventListener("click", closeBankModal);
  if (bankModalBackdrop) bankModalBackdrop.addEventListener("click", closeBankModal);
if (questionPreviewCloseBtn) questionPreviewCloseBtn.addEventListener("click", closeQuestionPreviewModal);
if (questionPreviewBackdrop) questionPreviewBackdrop.addEventListener("click", closeQuestionPreviewModal);
  if (adminQuestionNoteBtn) adminQuestionNoteBtn.addEventListener("click", openQuestionNoteModal);
  if (questionNoteClose) questionNoteClose.addEventListener("click", closeQuestionNoteModal);
  if (questionNoteCancel) questionNoteCancel.addEventListener("click", closeQuestionNoteModal);
  if (questionNoteBackdrop) questionNoteBackdrop.addEventListener("click", closeQuestionNoteModal);
  if (questionNoteText) questionNoteText.addEventListener("input", updateQuestionNotePreview);
  if (questionNoteSave) {
    questionNoteSave.addEventListener("click", () => {
      adminQuestionState.note = String(questionNoteText?.value || "").trim();
      closeQuestionNoteModal();
      updateQuestionNoteButton();
      updateSaveStateFromSnapshot();
    });
  }
  if (questionNoteDelete) {
    questionNoteDelete.addEventListener("click", () => {
      if (questionNoteText) questionNoteText.value = "";
      adminQuestionState.note = "";
      updateQuestionNotePreview();
      updateQuestionNoteButton();
      updateSaveStateFromSnapshot();
    });
  }
  if (answerNoteClose) answerNoteClose.addEventListener("click", closeAnswerNoteModal);
  if (answerNoteCancel) answerNoteCancel.addEventListener("click", closeAnswerNoteModal);
  if (answerNoteBackdrop) answerNoteBackdrop.addEventListener("click", closeAnswerNoteModal);
  if (answerNoteText) answerNoteText.addEventListener("input", updateAnswerNotePreview);
  if (answerNoteSave) {
    answerNoteSave.addEventListener("click", () => {
      if (!Number.isFinite(editingAnswerNoteIndex)) return;
      adminQuestionState.answers[editingAnswerNoteIndex].note = String(
        answerNoteText?.value || ""
      ).trim();
      closeAnswerNoteModal();
      renderAdminAnswers();
      updateSaveStateFromSnapshot();
    });
  }
  if (answerNoteDelete) {
    answerNoteDelete.addEventListener("click", () => {
      if (!Number.isFinite(editingAnswerNoteIndex)) return;
      adminQuestionState.answers[editingAnswerNoteIndex].note = "";
      if (answerNoteText) answerNoteText.value = "";
      updateAnswerNotePreview();
      renderAdminAnswers();
      updateSaveStateFromSnapshot();
    });
  }
  if (adminShortcutAddBtn) adminShortcutAddBtn.addEventListener("click", openShortcutModal);
  if (shortcutModalClose) shortcutModalClose.addEventListener("click", closeShortcutModal);
  if (shortcutModalBackdrop) shortcutModalBackdrop.addEventListener("click", closeShortcutModal);
  if (shortcutModalSave) shortcutModalSave.addEventListener("click", createShortcutFromModal);
  document.addEventListener("keydown", handleShortcutHotkeys);
  document.addEventListener("keyup", handleKeyUp);
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
  if (adminImageLayoutMode) {
    adminImageLayoutMode.addEventListener("change", (event) => {
      const target = event.target;
      if (!target || target.name !== "adminImageLayoutMode") return;
      adminQuestionState.imageLayoutMode = target.value || "side";
      updateImageLayoutModePills();
      updateImageFieldState();
      updateImageLayoutState();
      updateAdminPreviews();
    });
    updateImageLayoutModePills();
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
  if (imagePickerNewBtn) {
    imagePickerNewBtn.addEventListener("click", () => {
      closeImagePicker();
      openImageUploadModal();
    });
  }
  if (imagePickerList) {
    imagePickerList.addEventListener("click", (event) => {
      const btn = event.target?.closest?.("button");
      if (!btn) return;
      const label = String(btn.textContent || "").trim().toLowerCase();
      if (label !== "modifica") return;
      closeImagePicker();
    });
  }
  if (imagePickerCloseBtn) imagePickerCloseBtn.addEventListener("click", closeImagePicker);
  if (imagePickerBackdrop) imagePickerBackdrop.addEventListener("click", closeImagePicker);
  if (imageUploadCloseBtn) imageUploadCloseBtn.addEventListener("click", closeImageUploadModal);
  if (imageUploadBackdrop) imageUploadBackdrop.addEventListener("click", closeImageUploadModal);
  if (imageUploadSaveBtn) imageUploadSaveBtn.addEventListener("click", uploadImageFromModal);
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
  if (adminShortcutCourse) {
    adminShortcutCourse.addEventListener("change", () => {
      setShortcutEditState(null);
      loadShortcutsForAdmin(readSelectNumber(adminShortcutCourse));
    });
  }
  if (bankCourseSelect) {
    bankCourseSelect.addEventListener("change", () => {
      setActiveCourse(readSelectNumber(bankCourseSelect));
    });
  }
  if (bankTopicSelect) bankTopicSelect.addEventListener("change", refreshQuestionBank);
  if (bankSearchInput) bankSearchInput.addEventListener("input", refreshQuestionBank);
  if (bankUsageSelect) bankUsageSelect.addEventListener("change", refreshQuestionBank);
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
  if (toggleMultiModulesBtn && adminMultiModulesSection) {
    toggleMultiModulesBtn.addEventListener("click", () => {
      const willOpen = adminMultiModulesSection.classList.contains("is-hidden");
      showAdminSection(willOpen ? adminMultiModulesSection : null);
      if (willOpen && Number.isFinite(activeCourseId)) {
        loadMultiModuleExams(activeCourseId);
        loadMultiModules(activeCourseId);
      }
    });
  }
  if (toggleShortcutsBtn && adminShortcutsSection) {
    toggleShortcutsBtn.addEventListener("click", () => {
      const willOpen = adminShortcutsSection.classList.contains("is-hidden");
      showAdminSection(willOpen ? adminShortcutsSection : null);
      if (willOpen && adminShortcutCourse) {
        if (!adminShortcutCourse.value && adminCoursePicker?.value) {
          adminShortcutCourse.value = adminCoursePicker.value;
        }
        loadShortcutsForAdmin(readSelectNumber(adminShortcutCourse));
      }
    });
  }
  if (toggleUsersBtn && adminUsersSection) {
    toggleUsersBtn.addEventListener("click", () => {
      const willOpen = adminUsersSection.classList.contains("is-hidden");
      showAdminSection(willOpen ? adminUsersSection : null);
      if (willOpen) loadUsers();
    });
  }
  if (toggleDbBtn && adminDbSection) {
    toggleDbBtn.addEventListener("click", () => {
      const willOpen = adminDbSection.classList.contains("is-hidden");
      showAdminSection(willOpen ? adminDbSection : null);
      if (willOpen) {
        loadDbTables();
        loadDbRows();
      }
    });
  }
  if (toggleImagesBtn && adminImagesSection) {
    toggleImagesBtn.addEventListener("click", () => {
      const willOpen = adminImagesSection.classList.contains("is-hidden");
      showAdminSection(willOpen ? adminImagesSection : null);
      if (willOpen) {
        loadImageCourses();
        loadImagesForAdmin();
      }
    });
  }
  if (adminImageCourse) {
    adminImageCourse.addEventListener("change", loadImagesForAdmin);
  }
  if (adminUploadImageBtn) {
    adminUploadImageBtn.addEventListener("click", async () => {
      const courseId = Number(adminImageCourse?.value || "");
      const name = adminImageName?.value?.trim();
      const description = adminImageDescription?.value?.trim() || "";
      const file = adminImageFile?.files?.[0];
      const sourceFile = adminImageSourceFile?.files?.[0];
      if (!courseId || !name || !file) {
        if (adminImageStatus) adminImageStatus.textContent = "Seleziona corso, nome e file.";
        return;
      }
      try {
        if (adminImageStatus) adminImageStatus.textContent = "Caricamento...";
        const dataBase64 = await readFileAsDataUrl(file);
        const sourceBase64 = sourceFile ? await readFileAsDataUrl(sourceFile) : "";
        await apiFetch("/api/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            name,
            description,
            originalName: file.name,
            dataBase64,
            mimeType: file.type,
            sourceOriginalName: sourceFile?.name || "",
            sourceBase64,
            sourceMimeType: sourceFile?.type || "",
          }),
        });
        if (adminImageName) adminImageName.value = "";
        if (adminImageDescription) adminImageDescription.value = "";
        if (adminImageFile) adminImageFile.value = "";
        if (adminImageSourceFile) adminImageSourceFile.value = "";
        if (adminImageStatus) adminImageStatus.textContent = "Immagine caricata.";
        loadImagesForAdmin();
      } catch (err) {
        if (adminImageStatus) adminImageStatus.textContent = err.message || "Errore caricamento.";
      }
    });
  }
  if (adminUpdateImageBtn) {
    adminUpdateImageBtn.addEventListener("click", async () => {
      if (!editingImageId) return;
      const name = adminImageName?.value?.trim();
      const description = adminImageDescription?.value?.trim() || "";
      const file = adminImageFile?.files?.[0];
      const sourceFile = adminImageSourceFile?.files?.[0];
      if (!name) {
        if (adminImageStatus) adminImageStatus.textContent = "Inserisci un nome.";
        return;
      }
      try {
        if (adminImageStatus) adminImageStatus.textContent = "Aggiornamento...";
        const dataBase64 = file ? await readFileAsDataUrl(file) : "";
        const sourceBase64 = sourceFile ? await readFileAsDataUrl(sourceFile) : "";
        await apiFetch(`/api/images/${editingImageId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            originalName: file?.name || "",
            dataBase64,
            mimeType: file?.type || "",
            sourceOriginalName: sourceFile?.name || "",
            sourceBase64,
            sourceMimeType: sourceFile?.type || "",
          }),
        });
        cancelImageEdit();
        if (adminImageStatus) adminImageStatus.textContent = "Immagine aggiornata.";
        loadImagesForAdmin();
      } catch (err) {
        if (adminImageStatus) adminImageStatus.textContent = err.message || "Errore aggiornamento.";
      }
    });
  }
  if (adminCancelImageBtn) {
    adminCancelImageBtn.addEventListener("click", cancelImageEdit);
  }
  if (adminUpdateCourseBtn) adminUpdateCourseBtn.addEventListener("click", updateCourse);
  if (adminCancelCourseBtn) adminCancelCourseBtn.addEventListener("click", cancelCourseEdit);
  if (adminUpdateTopicBtn) adminUpdateTopicBtn.addEventListener("click", updateTopic);
  if (adminCancelTopicBtn) adminCancelTopicBtn.addEventListener("click", cancelTopicEdit);
  if (adminCreateMultiModuleBtn) adminCreateMultiModuleBtn.addEventListener("click", createMultiModule);
  if (adminUpdateMultiModuleBtn) adminUpdateMultiModuleBtn.addEventListener("click", updateMultiModule);
  if (adminCancelMultiModuleBtn)
    adminCancelMultiModuleBtn.addEventListener("click", cancelMultiModuleEdit);
  if (adminCreateShortcutBtn) adminCreateShortcutBtn.addEventListener("click", createShortcut);
  if (adminUpdateShortcutBtn) adminUpdateShortcutBtn.addEventListener("click", updateShortcut);
  if (adminCancelShortcutBtn)
    adminCancelShortcutBtn.addEventListener("click", () => setShortcutEditState(null));
  if (adminCreateUserBtn) adminCreateUserBtn.addEventListener("click", createUser);
  if (adminUpdateUserBtn) adminUpdateUserBtn.addEventListener("click", updateUser);
  if (adminCancelUserBtn) adminCancelUserBtn.addEventListener("click", cancelUserEdit);
  if (adminMultiModuleWeight1) {
    adminMultiModuleWeight1.addEventListener("input", () => {
      const value = Number(adminMultiModuleWeight1.value || "0");
      const clamped = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
      const counterpart = Number((1 - clamped).toFixed(2));
      if (adminMultiModuleWeight2) adminMultiModuleWeight2.value = String(counterpart);
      if (adminMultiModuleWeight1Label) adminMultiModuleWeight1Label.textContent = String(clamped);
      if (adminMultiModuleWeight2Label) adminMultiModuleWeight2Label.textContent = String(counterpart);
    });
  }
  if (adminMultiModuleWeight2) {
    adminMultiModuleWeight2.addEventListener("input", () => {
      const value = Number(adminMultiModuleWeight2.value || "0");
      const clamped = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
      const counterpart = Number((1 - clamped).toFixed(2));
      if (adminMultiModuleWeight1) adminMultiModuleWeight1.value = String(counterpart);
      if (adminMultiModuleWeight2Label) adminMultiModuleWeight2Label.textContent = String(clamped);
      if (adminMultiModuleWeight1Label) adminMultiModuleWeight1Label.textContent = String(counterpart);
    });
  }
  if (adminDbTableSelect) {
    adminDbTableSelect.addEventListener("change", () => {
      dbOffset = 0;
      dbOrderBy = "";
      dbOrderDir = "ASC";
      loadDbRows();
    });
  }
  if (adminDbRefresh)
    adminDbRefresh.addEventListener("click", () => {
      dbOffset = 0;
      loadDbRows();
    });
  if (adminDbExport) adminDbExport.addEventListener("click", exportDbCsv);
  if (adminDbLimit)
    adminDbLimit.addEventListener("change", () => {
      dbOffset = 0;
      loadDbRows();
    });
  if (adminDbSearch) {
    adminDbSearch.addEventListener("input", () => {
      if (dbSearchTimer) clearTimeout(dbSearchTimer);
      dbSearchTimer = setTimeout(() => {
        dbOffset = 0;
        loadDbRows();
      }, 250);
    });
  }
  if (adminDbPrev) {
    adminDbPrev.addEventListener("click", () => {
      const limit = Number(adminDbLimit?.value || 100);
      dbOffset = Math.max(0, dbOffset - limit);
      loadDbRows();
    });
  }
  if (adminDbNext) {
    adminDbNext.addEventListener("click", () => {
      const limit = Number(adminDbLimit?.value || 100);
      dbOffset += limit;
      loadDbRows();
    });
  }

  const params = new URLSearchParams(window.location.search);
  const editQuestionId = Number(params.get("editQuestion"));
  if (Number.isFinite(editQuestionId)) {
    try {
      await loadQuestionForEdit(editQuestionId);
    } catch (err) {
      setQuestionStatus(err.message || "Errore caricamento domanda", "error");
    }
  }
};

init();
