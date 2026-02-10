"use strict";

const express = require("express");

const buildImagesRouter = (deps) => {
  const {
    requireRole,
    db,
    IMAGE_DIR,
    detectExtension,
    sanitizeFileBase,
    stripDataUrl,
    canThumbnailExtension,
    generateThumbnail,
    fs,
    path,
    baseDir,
  } = deps;
  const rootDir = baseDir || __dirname;
  const router = express.Router();

  router.get("/api/images", requireRole("admin", "creator"), (req, res) => {
    const courseId = Number(req.query.courseId);
    if (!Number.isFinite(courseId)) {
      res.status(400).json({ error: "courseId mancante" });
      return;
    }
    const rows = db
      .prepare(
        `SELECT id, name, description, original_name, file_path, mime_type,
                thumbnail_path,
                source_name, source_path, source_mime_type
           FROM images
          WHERE course_id = ?
          ORDER BY created_at DESC`
      )
      .all(courseId);
    const updatedRows = rows.map((row) => {
      if (!row.thumbnail_path) {
        const ext = path.extname(row.file_path || "").toLowerCase();
        if (canThumbnailExtension(ext)) {
          const absPath = path.join(rootDir, row.file_path);
          if (fs.existsSync(absPath)) {
            const baseName = path.parse(absPath).name;
            const destDir = path.dirname(absPath);
            const thumbAbs = generateThumbnail(absPath, destDir, baseName, ext);
            if (thumbAbs) {
              const thumbRel = path.relative(rootDir, thumbAbs).replace(/\\/g, "/");
              db.prepare(
                "UPDATE images SET thumbnail_path = ?, updated_at = datetime('now') WHERE id = ?"
              ).run(thumbRel, row.id);
              return { ...row, thumbnail_path: thumbRel };
            }
          }
        }
      }
      return row;
    });
    res.json({ images: updatedRows });
  });

  router.post("/api/images", requireRole("admin", "creator"), (req, res) => {
    const payload = req.body || {};
    const courseId = Number(payload.courseId);
    const name = String(payload.name || "").trim();
    const description = String(payload.description || "").trim();
    const originalName = String(payload.originalName || "").trim();
    const dataBase64 = String(payload.dataBase64 || "").trim();
    const sourceOriginalName = String(payload.sourceOriginalName || "").trim();
    const sourceBase64 = String(payload.sourceBase64 || "").trim();
    if (!Number.isFinite(courseId) || !dataBase64) {
      res.status(400).json({ error: "Payload non valido" });
      return;
    }
    const course = db.prepare("SELECT id FROM courses WHERE id = ?").get(courseId);
    if (!course) {
      res.status(404).json({ error: "Corso non trovato" });
      return;
    }
    const ext = detectExtension(originalName, dataBase64);
    if (!ext) {
      res.status(400).json({ error: "Estensione file non valida" });
      return;
    }
    const base = sanitizeFileBase(name || originalName || "immagine");
    const fileName = `${Date.now()}-${base || "immagine"}${ext}`;
    const destDir = path.join(IMAGE_DIR, String(courseId));
    fs.mkdirSync(destDir, { recursive: true });
    const filePath = path.join(destDir, fileName);
    const buffer = Buffer.from(stripDataUrl(dataBase64), "base64");
    fs.writeFileSync(filePath, buffer);
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, "/");
    const baseName = path.parse(fileName).name;
    const thumbnailAbs = canThumbnailExtension(ext)
      ? generateThumbnail(filePath, destDir, baseName, ext)
      : null;
    const thumbnailRel = thumbnailAbs
      ? path.relative(rootDir, thumbnailAbs).replace(/\\/g, "/")
      : null;
    let sourceRelPath = null;
    if (sourceBase64) {
      const sourceExt =
        detectExtension(sourceOriginalName, sourceBase64) || ".bin";
      const sourceName = `${Date.now()}-${base || "immagine"}-source${sourceExt}`;
      const sourcePath = path.join(destDir, sourceName);
      const sourceBuffer = Buffer.from(stripDataUrl(sourceBase64), "base64");
      fs.writeFileSync(sourcePath, sourceBuffer);
      sourceRelPath = path.relative(rootDir, sourcePath).replace(/\\/g, "/");
    }
    const info = db
      .prepare(
        `INSERT INTO images (
          course_id,
          name,
          description,
          original_name,
          file_path,
          mime_type,
          thumbnail_path,
          source_name,
          source_path,
          source_mime_type
        )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        courseId,
        name || originalName || fileName,
        description || null,
        originalName || null,
        relPath,
        String(payload.mimeType || "") || null,
        thumbnailRel,
        sourceOriginalName || null,
        sourceRelPath,
        String(payload.sourceMimeType || "") || null
      );
    const image = db
      .prepare(
        `SELECT id, name, description, original_name, file_path, mime_type,
                thumbnail_path,
                source_name, source_path, source_mime_type
           FROM images WHERE id = ?`
      )
      .get(info.lastInsertRowid);
    res.json({ image });
  });

  router.delete("/api/images/:id", requireRole("admin", "creator"), (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Id non valido" });
      return;
    }
    const image = db
      .prepare("SELECT id, file_path, source_path, thumbnail_path FROM images WHERE id = ?")
      .get(id);
    if (!image) {
      res.status(404).json({ error: "Immagine non trovata" });
      return;
    }
    const used = db
      .prepare("SELECT 1 FROM questions WHERE image_path = ? LIMIT 1")
      .get(image.file_path);
    if (used) {
      res.status(400).json({ error: "Immagine usata in una domanda" });
      return;
    }
    const absPath = path.join(rootDir, image.file_path);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
    if (image.thumbnail_path) {
      const thumbAbs = path.join(rootDir, image.thumbnail_path);
      if (fs.existsSync(thumbAbs)) {
        fs.unlinkSync(thumbAbs);
      }
    }
    if (image.source_path) {
      const sourceAbs = path.join(rootDir, image.source_path);
      if (fs.existsSync(sourceAbs)) {
        fs.unlinkSync(sourceAbs);
      }
    }
    db.prepare("DELETE FROM images WHERE id = ?").run(id);
    res.json({ ok: true });
  });

  router.post("/api/images/:id/thumbnail", requireRole("admin", "creator"), (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Id non valido" });
      return;
    }
    const image = db
      .prepare(
        "SELECT id, file_path, thumbnail_path FROM images WHERE id = ?"
      )
      .get(id);
    if (!image) {
      res.status(404).json({ error: "Immagine non trovata" });
      return;
    }
    const absPath = path.join(rootDir, image.file_path);
    if (!fs.existsSync(absPath)) {
      res.status(404).json({ error: "File immagine non trovato" });
      return;
    }
    const ext = path.extname(absPath).toLowerCase();
    if (!canThumbnailExtension(ext)) {
      res.status(400).json({ error: "Thumbnail non supportata per questo formato" });
      return;
    }
    const baseName = path.parse(absPath).name;
    const destDir = path.dirname(absPath);
    const thumbAbs = generateThumbnail(absPath, destDir, baseName, ext);
    if (!thumbAbs) {
      res.status(500).json({ error: "Impossibile generare la thumbnail" });
      return;
    }
    const thumbRel = path.relative(rootDir, thumbAbs).replace(/\\/g, "/");
    db.prepare(
      "UPDATE images SET thumbnail_path = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(thumbRel, id);
    res.json({ thumbnail_path: thumbRel });
  });

  return router;
};

module.exports = buildImagesRouter;
