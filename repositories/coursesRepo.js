"use strict";

const db = require("../db");

const getCourseNameById = (id) => {
  if (!id) return null;
  const row = db.prepare("SELECT name FROM courses WHERE id = ?").get(id);
  return row?.name || null;
};

const getExamTitleById = (id) => {
  if (!id) return null;
  const row = db.prepare("SELECT title FROM exams WHERE id = ?").get(id);
  return row?.title || null;
};

module.exports = {
  getCourseNameById,
  getExamTitleById,
};
