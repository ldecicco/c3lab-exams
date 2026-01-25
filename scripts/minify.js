#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { minify } = require("terser");

const ROOT = path.resolve(__dirname, "..");
const JS_FILES = [
  "app.js",
  "admin.js",
  "bootstrap.js",
  "exam-builder.js",
  "dashboard.js",
  "esame-completo.js",
  "home.js",
  "history-cards.js",
  "exam-cards.js",
  "course-cards.js",
  "question-cards.js",
  "user-cards.js",
  "nav.js",
  "login.js",
  "twofa.js",
  "utils/api.js",
  "utils/format.js",
  "utils/ui.js",
];

const exists = (p) => fs.existsSync(path.join(ROOT, p));

const run = async () => {
  for (const rel of JS_FILES) {
    if (!exists(rel)) continue;
    const abs = path.join(ROOT, rel);
    const code = fs.readFileSync(abs, "utf8");
    const result = await minify(code, {
      compress: true,
      mangle: true,
      format: { comments: false },
    });
    if (!result || !result.code) {
      throw new Error(`Minify failed for ${rel}`);
    }
    fs.writeFileSync(abs, result.code, "utf8");
    process.stdout.write(`minified ${rel}\n`);
  }
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
