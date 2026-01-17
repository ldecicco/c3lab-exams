const courseGrid = document.getElementById("courseGrid");
const courseActiveStatus = document.getElementById("courseActiveStatus");
const courseToast = document.getElementById("courseToast");

let toastTimer = null;

const showToast = (message, tone = "info") => {
  if (!courseToast) return;
  courseToast.textContent = message;
  courseToast.classList.remove("is-error", "is-success");
  if (tone === "error") courseToast.classList.add("is-error");
  if (tone === "success") courseToast.classList.add("is-success");
  courseToast.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => courseToast.classList.remove("show"), 2400);
};

const loadActiveCourse = async () => {
  try {
    const res = await fetch("/api/session/course");
    if (!res.ok) return null;
    const payload = await res.json();
    return payload.course || null;
  } catch {
    return null;
  }
};

const setActiveCourse = async (courseId, courseName) => {
  try {
    const res = await fetch("/api/session/course", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId }),
    });
    if (!res.ok) {
      showToast("Errore nel salvataggio del corso.", "error");
      return;
    }
    if (courseActiveStatus) {
      courseActiveStatus.textContent = `Corso attivo: ${courseName}`;
    }
    showToast("Corso selezionato.", "success");
  } catch {
    showToast("Errore nel salvataggio del corso.", "error");
  }
};

const renderCourses = async () => {
  if (!courseGrid || !window.CourseCards) return;
  const res = await fetch("/api/courses");
  if (!res.ok) {
    courseGrid.textContent = "Errore nel caricamento corsi.";
    return;
  }
  const payload = await res.json();
  const active = await loadActiveCourse();
  CourseCards.render(courseGrid, payload.courses || [], {
    activeId: active?.id || null,
    actions: (course) => [
      {
        label: "Seleziona",
        className: "btn btn-outline-primary btn-sm",
        onClick: async () => {
          await setActiveCourse(course.id, course.name);
          renderCourses();
        },
      },
    ],
  });
};

const initHome = async () => {
  const active = await loadActiveCourse();
  if (courseActiveStatus) {
    courseActiveStatus.textContent = active
      ? `Corso attivo: ${active.name}`
      : "Nessun corso attivo";
  }
  await renderCourses();
};

initHome();
