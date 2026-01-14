const adminCourseNewInput = document.getElementById("adminCourseNew");
const adminAddCourseBtn = document.getElementById("adminAddCourse");
const adminCourseList = document.getElementById("adminCourseList");
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
const adminQuestionCourse = document.getElementById("adminQuestionCourse");
const adminQuestionType = document.getElementById("adminQuestionType");
const adminQuestionTopics = document.getElementById("adminQuestionTopics");
const adminQuestionImage = document.getElementById("adminQuestionImage");
const adminPickImageBtn = document.getElementById("adminPickImage");
const adminQuestionText = document.getElementById("adminQuestionText");
const adminQuestionPreview = document.getElementById("adminQuestionPreview");
const adminQuestionImageLayout = document.getElementById("adminQuestionImageLayout");
const adminQuestionLayoutFields = document.getElementById("adminQuestionLayoutFields");
const adminQuestionImageLeft = document.getElementById("adminQuestionImageLeft");
const adminQuestionImageRight = document.getElementById("adminQuestionImageRight");
const adminQuestionImageScale = document.getElementById("adminQuestionImageScale");
const adminAnswers = document.getElementById("adminAnswers");
const adminAddAnswerBtn = document.getElementById("adminAddAnswer");
const adminSaveQuestionBtn = document.getElementById("adminSaveQuestion");
const adminResetQuestionBtn = document.getElementById("adminResetQuestion");
const adminQuestionStatus = document.getElementById("adminQuestionStatus");
const adminEditBadge = document.getElementById("adminEditBadge");
const toggleCoursesBtn = document.getElementById("toggleCourses");
const toggleTopicsBtn = document.getElementById("toggleTopics");
const toggleImagesBtn = document.getElementById("toggleImages");
const adminCoursesSection = document.getElementById("adminCoursesSection");
const adminTopicsSection = document.getElementById("adminTopicsSection");
const adminImagesSection = document.getElementById("adminImagesSection");
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
let editingQuestionId = null;

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
      if (adminQuestionImage) adminQuestionImage.value = filePath;
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

const openImagePicker = async () => {
  const courseId = Number(adminQuestionCourse?.value || "");
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
  target.textContent = trimmed;
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
    target.textContent = trimmed;
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
  if (adminQuestionText && adminQuestionPreview) {
    renderMathPreview(adminQuestionText.value, adminQuestionPreview, adminQuestionText);
  }
  const answerInputs = adminAnswers?.querySelectorAll("input.form-control") || [];
  answerInputs.forEach((input) => {
    const idx = Number(input.dataset.answerIndex);
    const preview = adminAnswers.querySelector(
      `[data-preview="admin-answer"][data-answer-index="${idx}"]`
    );
    if (preview) renderMathPreview(input.value, preview, input);
  });
};

const adminQuestionState = {
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
    const preview = createEl("div", "latex-preview-inline");
    preview.dataset.preview = "admin-answer";
    preview.dataset.answerIndex = String(idx);
    const remove = createEl("button", "btn btn-outline-danger btn-sm", "Rimuovi");
    remove.type = "button";
    remove.addEventListener("click", () => {
      adminQuestionState.answers.splice(idx, 1);
      renderAdminAnswers();
    });
    row.appendChild(check);
    row.appendChild(input);
    row.appendChild(preview);
    row.appendChild(remove);
    adminAnswers.appendChild(row);
  });
  updateAdminPreviews();
};

const resetAdminQuestion = () => {
  editingQuestionId = null;
  adminQuestionState.type = "singola";
  adminQuestionState.text = "";
  adminQuestionState.topics = [];
  adminQuestionState.image = "";
  adminQuestionState.imageLayoutEnabled = false;
  adminQuestionState.imageLeft = "0.5\\linewidth";
  adminQuestionState.imageRight = "0.5\\linewidth";
  adminQuestionState.imageScale = "0.96\\linewidth";
  adminQuestionState.answers = [
    { text: "", correct: false },
    { text: "", correct: false },
    { text: "", correct: false },
    { text: "", correct: false },
  ];
  if (adminQuestionType) adminQuestionType.value = "singola";
  if (adminQuestionText) adminQuestionText.value = "";
  if (adminQuestionTopics) {
    Array.from(adminQuestionTopics.options).forEach((opt) => {
      opt.selected = false;
    });
  }
  if (adminQuestionImage) adminQuestionImage.value = "";
  if (adminQuestionImageLayout) adminQuestionImageLayout.checked = false;
  if (adminQuestionLayoutFields) adminQuestionLayoutFields.classList.add("is-hidden");
  if (adminQuestionImageLeft) adminQuestionImageLeft.value = adminQuestionState.imageLeft;
  if (adminQuestionImageRight) adminQuestionImageRight.value = adminQuestionState.imageRight;
  if (adminQuestionImageScale) adminQuestionImageScale.value = adminQuestionState.imageScale;
  renderAdminAnswers();
  updateAdminPreviews();
  if (adminSaveQuestionBtn) adminSaveQuestionBtn.textContent = "Salva nel banco";
  if (adminEditBadge) adminEditBadge.classList.add("is-hidden");
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
  adminQuestionTopics.innerHTML = "";
  topics.forEach((topic) => {
    const opt = createEl("option");
    opt.value = String(topic.id);
    opt.textContent = topic.name;
    adminQuestionTopics.appendChild(opt);
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
      if (adminQuestionImage) adminQuestionImage.value = image.file_path;
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

const loadCourses = async () => {
  const payload = await apiFetch("/api/courses");
  const courses = payload.courses || [];
  renderSelectOptions(adminTopicCourseSelect, courses, "Seleziona corso");
  renderSelectOptions(adminQuestionCourse, courses, "Seleziona corso");
  renderSelectOptions(adminImageCourseSelect, courses, "Seleziona corso");
  renderSelectOptions(bankCourseSelect, courses, "Tutti i corsi");
  renderCourseList(courses);
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
  if (adminQuestionCourse && q.courseId) {
    adminQuestionCourse.value = String(q.courseId);
    await loadQuestionTopics(q.courseId);
    if (adminImageCourseSelect) {
      adminImageCourseSelect.value = String(q.courseId);
      await loadImages(q.courseId);
    }
  }
  editingQuestionId = q.id;
  if (adminQuestionType) adminQuestionType.value = q.type || "singola";
  if (adminQuestionText) adminQuestionText.value = q.text;
  if (adminQuestionImage) adminQuestionImage.value = q.imagePath || "";
  if (adminQuestionImageLayout) adminQuestionImageLayout.checked = Boolean(q.imageLayoutEnabled);
  if (adminQuestionLayoutFields) {
    adminQuestionLayoutFields.classList.toggle("is-hidden", !q.imageLayoutEnabled);
  }
  if (adminQuestionImageLeft) adminQuestionImageLeft.value = q.imageLeftWidth || "0.5\\linewidth";
  if (adminQuestionImageRight) adminQuestionImageRight.value = q.imageRightWidth || "0.5\\linewidth";
  if (adminQuestionImageScale) adminQuestionImageScale.value = q.imageScale || "0.96\\linewidth";
  adminQuestionState.type = q.type || "singola";
  adminQuestionState.answers = (q.answers || []).map((ans) => ({
    text: ans.text,
    correct: Boolean(ans.isCorrect),
  }));
  renderAdminAnswers();
  if (adminQuestionTopics) {
    const topicIds = q.topicIds || [];
    Array.from(adminQuestionTopics.options).forEach((opt) => {
      opt.selected = topicIds.includes(Number(opt.value));
    });
  }
  if (adminQuestionStatus) adminQuestionStatus.textContent = "Modifica attiva.";
  if (adminSaveQuestionBtn) adminSaveQuestionBtn.textContent = "Aggiorna domanda";
  if (adminEditBadge) adminEditBadge.classList.remove("is-hidden");
  updateAdminPreviews();
};

const saveAdminQuestion = async () => {
  const courseId = Number(adminQuestionCourse?.value || "");
  if (!Number.isFinite(courseId)) {
    if (adminQuestionStatus) adminQuestionStatus.textContent = "Seleziona un corso.";
    return;
  }
  const text = String(adminQuestionText?.value || "").trim();
  if (!text) {
    if (adminQuestionStatus) adminQuestionStatus.textContent = "Inserisci il testo della domanda.";
    return;
  }
  const topics = Array.from(adminQuestionTopics?.selectedOptions || []).map(
    (opt) => opt.textContent
  );
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
      imagePath: String(adminQuestionImage?.value || "").trim(),
      imageLayoutEnabled: Boolean(adminQuestionImageLayout?.checked),
      imageLeftWidth: String(adminQuestionImageLeft?.value || "").trim(),
      imageRightWidth: String(adminQuestionImageRight?.value || "").trim(),
      imageScale: String(adminQuestionImageScale?.value || "").trim(),
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
  if (adminQuestionType) {
    adminQuestionType.addEventListener("change", () => {
      adminQuestionState.type = adminQuestionType.value;
      if (adminQuestionState.type === "singola") {
        const first = adminQuestionState.answers.findIndex((a) => a.correct);
        adminQuestionState.answers.forEach((a, idx) => {
          a.correct = first === -1 ? false : idx === first;
        });
        renderAdminAnswers();
      }
    });
  }
  if (adminQuestionImageLayout && adminQuestionLayoutFields) {
    adminQuestionImageLayout.addEventListener("change", () => {
      adminQuestionState.imageLayoutEnabled = adminQuestionImageLayout.checked;
      adminQuestionLayoutFields.classList.toggle("is-hidden", !adminQuestionImageLayout.checked);
    });
  }
  if (adminPickImageBtn) adminPickImageBtn.addEventListener("click", openImagePicker);
  if (imagePickerCloseBtn) imagePickerCloseBtn.addEventListener("click", closeImagePicker);
  if (imagePickerBackdrop) imagePickerBackdrop.addEventListener("click", closeImagePicker);
  if (imagePreviewCloseBtn) imagePreviewCloseBtn.addEventListener("click", closeImagePreview);
  if (imagePreviewBackdrop) imagePreviewBackdrop.addEventListener("click", closeImagePreview);
  if (adminTopicCourseSelect) {
    adminTopicCourseSelect.addEventListener("change", () => {
      loadTopics(Number(adminTopicCourseSelect.value || ""), bankTopicSelect, "Tutti gli argomenti");
    });
  }
  if (adminImageCourseSelect) {
    adminImageCourseSelect.addEventListener("change", () => {
      loadImages(Number(adminImageCourseSelect.value || ""));
    });
  }
  if (adminQuestionCourse) {
    adminQuestionCourse.addEventListener("change", () => {
      const courseId = Number(adminQuestionCourse.value || "");
      loadQuestionTopics(courseId);
      if (adminImageCourseSelect && adminImageCourseSelect.value !== String(courseId)) {
        adminImageCourseSelect.value = String(courseId);
        loadImages(courseId);
      }
    });
  }
  if (bankCourseSelect) {
    bankCourseSelect.addEventListener("change", () => {
      loadTopics(Number(bankCourseSelect.value || ""), bankTopicSelect, "Tutti gli argomenti");
      refreshQuestionBank();
    });
  }
  if (bankTopicSelect) bankTopicSelect.addEventListener("change", refreshQuestionBank);
  if (bankSearchInput) bankSearchInput.addEventListener("input", refreshQuestionBank);
  if (refreshBankBtn) refreshBankBtn.addEventListener("click", refreshQuestionBank);
  if (toggleCoursesBtn && adminCoursesSection) {
    toggleCoursesBtn.addEventListener("click", () => {
      adminCoursesSection.classList.toggle("is-hidden");
    });
  }
  if (toggleTopicsBtn && adminTopicsSection) {
    toggleTopicsBtn.addEventListener("click", () => {
      adminTopicsSection.classList.toggle("is-hidden");
    });
  }
  if (toggleImagesBtn && adminImagesSection) {
    toggleImagesBtn.addEventListener("click", () => {
      adminImagesSection.classList.toggle("is-hidden");
    });
  }
};

init();
