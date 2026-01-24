"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const buildUsersRouter = ({
  requireAuth,
  requireRole,
  db,
  AVATAR_DIR,
  detectExtension,
  stripDataUrl,
  logSecurityEvent,
  createSession,
  SESSION_COOKIE_OPTIONS,
}) => {
  const router = express.Router();

  router.get("/api/users", requireRole("admin"), (req, res) => {
    const users = db
      .prepare("SELECT id, username, role, created_at FROM users ORDER BY username")
      .all();
    res.json({ users });
  });

  router.post("/api/users", requireRole("admin"), (req, res) => {
    const payload = req.body || {};
    const username = String(payload.username || "").trim();
    const password = String(payload.password || "");
    const role = String(payload.role || "").trim();
    if (!username || !password || !role) {
      res.status(400).json({ error: "Dati mancanti" });
      return;
    }
    const hash = bcrypt.hashSync(password, 10);
    try {
      const info = db
        .prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)")
        .run(username, hash, role);
      res.status(201).json({ id: info.lastInsertRowid });
    } catch (err) {
      res.status(400).json({ error: "Username già presente" });
    }
  });

  router.put("/api/users/:id", requireRole("admin"), (req, res) => {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) {
      res.status(400).json({ error: "Id non valido" });
      return;
    }
    const current = db.prepare("SELECT id, role FROM users WHERE id = ?").get(userId);
    if (!current) {
      res.status(404).json({ error: "Utente non trovato." });
      return;
    }
    const payload = req.body || {};
    const updates = [];
    const params = [];
    if (payload.username) {
      updates.push("username = ?");
      params.push(String(payload.username).trim());
    }
    if (payload.role) {
      if (current.role === "admin" && String(payload.role).trim() !== "admin") {
        res.status(400).json({ error: "Non puoi cambiare il ruolo di un amministratore." });
        return;
      }
      updates.push("role = ?");
      params.push(String(payload.role).trim());
    }
    if (payload.password) {
      updates.push("password_hash = ?");
      params.push(bcrypt.hashSync(String(payload.password), 10));
    }
    if (!updates.length) {
      res.json({ ok: true });
      return;
    }
    params.push(userId);
    try {
      db.prepare(`UPDATE users SET ${updates.join(", ")}, updated_at = datetime('now') WHERE id = ?`).run(...params);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: "Username già presente" });
    }
  });

  router.delete("/api/users/:id", requireRole("admin"), (req, res) => {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) {
      res.status(400).json({ error: "Id non valido" });
      return;
    }
    const target = db.prepare("SELECT id, role FROM users WHERE id = ?").get(userId);
    if (!target) {
      res.status(404).json({ error: "Utente non trovato." });
      return;
    }
    if (target.role === "admin") {
      res.status(400).json({ error: "Non puoi eliminare un amministratore." });
      return;
    }
    if (req.user?.id === userId) {
      res.status(400).json({ error: "Non puoi eliminare il tuo utente." });
      return;
    }
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    res.json({ ok: true });
  });

  router.post("/api/users/me/avatar", requireAuth, (req, res) => {
    const payload = req.body || {};
    const originalBase64 = String(payload.originalBase64 || "");
    const croppedBase64 = String(payload.croppedBase64 || "");
    const originalName = String(payload.originalName || "");
    if (!originalBase64 || !croppedBase64) {
      res.status(400).json({ error: "Immagine mancante" });
      return;
    }

    const ext = detectExtension(originalName, originalBase64) || ".png";
    const baseName = `avatar-${req.user.id}-${Date.now()}`;
    const originalFile = `${baseName}${ext}`;
    const thumbFile = `${baseName}-thumb.png`;
    const originalAbs = path.join(AVATAR_DIR, originalFile);
    const thumbAbs = path.join(AVATAR_DIR, thumbFile);

    try {
      fs.writeFileSync(
        originalAbs,
        Buffer.from(stripDataUrl(originalBase64), "base64")
      );
      fs.writeFileSync(
        thumbAbs,
        Buffer.from(stripDataUrl(croppedBase64), "base64")
      );
    } catch (err) {
      res.status(500).json({ error: "Salvataggio immagine fallito" });
      return;
    }

    const originalRel = path
      .relative(process.cwd(), originalAbs)
      .replace(/\\/g, "/");
    const thumbRel = path.relative(process.cwd(), thumbAbs).replace(/\\/g, "/");
    const current = db
      .prepare("SELECT avatar_path, avatar_thumb_path FROM users WHERE id = ?")
      .get(req.user.id);

    db.prepare(
      `UPDATE users
          SET avatar_path = ?, avatar_thumb_path = ?, updated_at = datetime('now')
        WHERE id = ?`
    ).run(originalRel, thumbRel, req.user.id);

    const removeIfExists = (relPath) => {
      if (!relPath) return;
      if (relPath === originalRel || relPath === thumbRel) return;
      const absPath = path.join(process.cwd(), relPath);
      if (fs.existsSync(absPath)) {
        fs.unlinkSync(absPath);
      }
    };
    removeIfExists(current?.avatar_path);
    removeIfExists(current?.avatar_thumb_path);

    res.json({ avatar_path: originalRel, avatar_thumb_path: thumbRel });
  });

  router.post("/api/users/me/password", requireAuth, (req, res) => {
    const userId = req.user.id;
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Password mancanti." });
      return;
    }
    const user = db
      .prepare("SELECT id, password_hash FROM users WHERE id = ?")
      .get(userId);
    if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
      logSecurityEvent(req, "password_change_failed", "", userId);
      res.status(400).json({ error: "Password attuale non valida." });
      return;
    }
    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
      .run(hash, userId);
    if (req.sessionToken) {
      db.prepare("DELETE FROM auth_sessions WHERE token = ?").run(req.sessionToken);
    }
    const session = createSession(userId);
    res.cookie("session_token", session.token, SESSION_COOKIE_OPTIONS(session.expiresAt));
    logSecurityEvent(req, "password_change", "", userId);
    res.json({ ok: true });
  });

  return router;
};

module.exports = buildUsersRouter;
