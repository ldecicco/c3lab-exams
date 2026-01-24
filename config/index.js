"use strict";

const path = require("path");

const PORT = process.env.PORT || 3000;
const BASE_PATH = process.env.BASE_PATH || "";
const NODE_ENV = process.env.NODE_ENV || "production";

const DATA_DIR = path.join(__dirname, "..", "data");
const IMAGE_DIR = path.join(DATA_DIR, "images");
const AVATAR_DIR = path.join(DATA_DIR, "avatars");
const DB_PATH = path.join(DATA_DIR, "exam-builder.db");

module.exports = {
  PORT,
  BASE_PATH,
  NODE_ENV,
  DATA_DIR,
  IMAGE_DIR,
  AVATAR_DIR,
  DB_PATH,
};
