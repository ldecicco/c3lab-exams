"use strict";

module.exports = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS auth_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS login_2fa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS security_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    event_type TEXT NOT NULL,
    ip TEXT,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(course_id, name),
    FOREIGN KEY(course_id) REFERENCES courses(id)
  );
  CREATE TABLE IF NOT EXISTS course_shortcuts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    snippet TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(course_id, label),
    FOREIGN KEY(course_id) REFERENCES courses(id)
  );
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    type TEXT NOT NULL,
    image_path TEXT,
    image_layout_enabled INTEGER NOT NULL DEFAULT 0,
    image_layout_mode TEXT NOT NULL DEFAULT 'side',
    image_left_width TEXT,
    image_right_width TEXT,
    image_scale TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    original_name TEXT,
    file_path TEXT NOT NULL,
    mime_type TEXT,
    source_name TEXT,
    source_path TEXT,
    source_mime_type TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(course_id) REFERENCES courses(id)
  );
  CREATE TABLE IF NOT EXISTS question_topics (
    question_id INTEGER NOT NULL,
    topic_id INTEGER NOT NULL,
    PRIMARY KEY (question_id, topic_id),
    FOREIGN KEY(question_id) REFERENCES questions(id),
    FOREIGN KEY(topic_id) REFERENCES topics(id)
  );
  CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    text TEXT NOT NULL,
    is_correct INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(question_id) REFERENCES questions(id)
  );
  CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    date TEXT,
    output_name TEXT,
    versions INTEGER,
    seed INTEGER,
    randomize_questions INTEGER NOT NULL DEFAULT 1,
    randomize_answers INTEGER NOT NULL DEFAULT 1,
    write_r INTEGER NOT NULL DEFAULT 1,
    header_title TEXT,
    header_department TEXT,
    header_university TEXT,
    header_note TEXT,
    header_logo TEXT,
    is_draft INTEGER NOT NULL DEFAULT 0,
    locked_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(course_id) REFERENCES courses(id)
  );
  CREATE TABLE IF NOT EXISTS exam_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY(exam_id) REFERENCES exams(id),
    FOREIGN KEY(question_id) REFERENCES questions(id)
  );
  CREATE TABLE IF NOT EXISTS exam_question_snapshots (
    exam_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    snapshot_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (exam_id, position),
    FOREIGN KEY(exam_id) REFERENCES exams(id)
  );
  CREATE TABLE IF NOT EXISTS exam_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    title TEXT,
    result_date TEXT,
    target_top_grade REAL DEFAULT 30,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(exam_id) REFERENCES exams(id)
  );
  CREATE TABLE IF NOT EXISTS exam_multi_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    exam_id_module1 INTEGER NOT NULL,
    exam_id_module2 INTEGER NOT NULL,
    module1_min_grade REAL NOT NULL,
    module2_min_grade REAL NOT NULL,
    weight_module1 REAL NOT NULL DEFAULT 0.5,
    weight_module2 REAL NOT NULL DEFAULT 0.5,
    final_min_grade REAL NOT NULL DEFAULT 18,
    rounding TEXT NOT NULL DEFAULT 'ceil',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(exam_id_module1) REFERENCES exams(id),
    FOREIGN KEY(exam_id_module2) REFERENCES exams(id)
  );
  CREATE TABLE IF NOT EXISTS exam_multi_module_selections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    multi_module_id INTEGER NOT NULL,
    matricola TEXT NOT NULL,
    chosen_result_id_module1 INTEGER,
    chosen_result_id_module2 INTEGER,
    updated_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(multi_module_id, matricola),
    FOREIGN KEY(multi_module_id) REFERENCES exam_multi_modules(id),
    FOREIGN KEY(chosen_result_id_module1) REFERENCES exam_session_students(id),
    FOREIGN KEY(chosen_result_id_module2) REFERENCES exam_session_students(id),
    FOREIGN KEY(updated_by) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS course_multi_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    course_id_module1 INTEGER NOT NULL,
    course_id_module2 INTEGER NOT NULL,
    module1_min_grade REAL NOT NULL,
    module2_min_grade REAL NOT NULL,
    weight_module1 REAL NOT NULL DEFAULT 0.5,
    weight_module2 REAL NOT NULL DEFAULT 0.5,
    final_min_grade REAL NOT NULL DEFAULT 18,
    rounding TEXT NOT NULL DEFAULT 'ceil',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(course_id_module1) REFERENCES courses(id),
    FOREIGN KEY(course_id_module2) REFERENCES courses(id)
  );
  CREATE TABLE IF NOT EXISTS course_multi_module_selections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    multi_module_id INTEGER NOT NULL,
    matricola TEXT NOT NULL,
    chosen_result_id_module1 INTEGER,
    chosen_result_id_module2 INTEGER,
    updated_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(multi_module_id, matricola),
    FOREIGN KEY(multi_module_id) REFERENCES course_multi_modules(id),
    FOREIGN KEY(chosen_result_id_module1) REFERENCES exam_session_students(id),
    FOREIGN KEY(chosen_result_id_module2) REFERENCES exam_session_students(id),
    FOREIGN KEY(updated_by) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS exam_session_students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    matricola TEXT NOT NULL,
    nome TEXT,
    cognome TEXT,
    versione INTEGER,
    answers_json TEXT NOT NULL,
    overrides_json TEXT,
    normalized_score REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(session_id, matricola),
    FOREIGN KEY(session_id) REFERENCES exam_sessions(id)
  );
  CREATE INDEX IF NOT EXISTS idx_images_course ON images(course_id);
  CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);
  CREATE INDEX IF NOT EXISTS idx_exam_snapshots_exam ON exam_question_snapshots(exam_id);
  CREATE INDEX IF NOT EXISTS idx_questions_updated ON questions(updated_at);
  CREATE INDEX IF NOT EXISTS idx_exam_sessions_exam ON exam_sessions(exam_id);
  CREATE INDEX IF NOT EXISTS idx_exam_session_students_session ON exam_session_students(session_id);
  CREATE INDEX IF NOT EXISTS idx_exam_multi_modules_m1 ON exam_multi_modules(exam_id_module1);
  CREATE INDEX IF NOT EXISTS idx_exam_multi_modules_m2 ON exam_multi_modules(exam_id_module2);
  CREATE INDEX IF NOT EXISTS idx_exam_multi_module_selections_mm ON exam_multi_module_selections(multi_module_id);
  CREATE INDEX IF NOT EXISTS idx_exam_multi_module_selections_matricola ON exam_multi_module_selections(matricola);
  CREATE INDEX IF NOT EXISTS idx_course_multi_modules_m1 ON course_multi_modules(course_id_module1);
  CREATE INDEX IF NOT EXISTS idx_course_multi_modules_m2 ON course_multi_modules(course_id_module2);
  CREATE INDEX IF NOT EXISTS idx_course_multi_module_selections_mm ON course_multi_module_selections(multi_module_id);
  CREATE INDEX IF NOT EXISTS idx_course_multi_module_selections_matricola ON course_multi_module_selections(matricola);
  CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token);
  CREATE INDEX IF NOT EXISTS idx_course_shortcuts_course ON course_shortcuts(course_id);
`;
