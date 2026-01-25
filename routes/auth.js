"use strict";

const express = require("express");

const buildAuthRouter = ({
  BASE_PATH,
  USE_SECURE_COOKIES,
  REQUIRE_2FA,
  loginLimiter,
  db,
  bcrypt,
  speakeasy,
  logSecurityEvent,
  createSession,
  createTwoFaToken,
  SESSION_COOKIE_OPTIONS,
  requireAuth,
}) => {
  const router = express.Router();

  router.get("/login", (req, res) => res.render("login"));
  router.get("/2fa-setup", requireAuth, (req, res) => res.render("twofa"));

  router.get("/logout", (req, res) => {
    const token = req.cookies?.session_token;
    if (token) {
      db.prepare("DELETE FROM auth_sessions WHERE token = ?").run(token);
    }
    res.clearCookie("session_token", {
      httpOnly: true,
      sameSite: "strict",
      secure: USE_SECURE_COOKIES,
    });
    if (req.user) {
      logSecurityEvent(req, "logout", "", req.user.id);
    }
    res.redirect(BASE_PATH + "/login");
  });

  router.post("/auth/login", loginLimiter, (req, res) => {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");
    if (!username || !password) {
      res.status(400).json({ error: "Credenziali mancanti" });
      return;
    }
    const user = db
      .prepare("SELECT id, username, password_hash, role, totp_enabled FROM users WHERE username = ?")
      .get(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      logSecurityEvent(req, "login_failed", `username=${username}`);
      res.status(401).json({ error: "Credenziali non valide" });
      return;
    }
    if (REQUIRE_2FA && user.totp_enabled) {
      if (!speakeasy) {
        res.status(500).json({ error: "2FA non disponibile sul server." });
        return;
      }
      const pending = createTwoFaToken(user.id);
      logSecurityEvent(req, "login_otp_required", "", user.id);
      res.json({ requiresOtp: true, tempToken: pending.token });
      return;
    }
    const session = createSession(user.id);
    res.cookie("session_token", session.token, SESSION_COOKIE_OPTIONS(session.expiresAt));
    logSecurityEvent(req, "login_success", "", user.id);
    res.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
  });

  router.post("/auth/login-2fa", loginLimiter, (req, res) => {
    if (!REQUIRE_2FA) {
      res.status(400).json({ error: "2FA disabilitata in sviluppo." });
      return;
    }
    const tempToken = String(req.body.tempToken || "");
    const otp = String(req.body.otp || "").trim();
    if (!tempToken || !otp) {
      res.status(400).json({ error: "Dati mancanti" });
      return;
    }
    const pending = db
      .prepare("SELECT user_id, expires_at FROM login_2fa WHERE token = ?")
      .get(tempToken);
    if (!pending) {
      res.status(401).json({ error: "Token non valido" });
      return;
    }
    if (new Date(pending.expires_at) <= new Date()) {
      db.prepare("DELETE FROM login_2fa WHERE token = ?").run(tempToken);
      res.status(401).json({ error: "Token scaduto" });
      return;
    }
    const user = db
      .prepare("SELECT id, username, role, totp_secret FROM users WHERE id = ?")
      .get(pending.user_id);
    if (!user || !user.totp_secret || !speakeasy) {
      res.status(401).json({ error: "2FA non configurata" });
      return;
    }
    const ok = speakeasy.totp.verify({
      secret: user.totp_secret,
      encoding: "base32",
      token: otp,
      window: 1,
    });
    if (!ok) {
      res.status(401).json({ error: "Codice non valido" });
      return;
    }
    db.prepare("DELETE FROM login_2fa WHERE token = ?").run(tempToken);
    const session = createSession(user.id);
    res.cookie("session_token", session.token, SESSION_COOKIE_OPTIONS(session.expiresAt));
    logSecurityEvent(req, "login_success", "", user.id);
    res.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
  });

  router.post("/auth/logout", (req, res) => {
    const token = req.cookies?.session_token;
    if (token) {
      db.prepare("DELETE FROM auth_sessions WHERE token = ?").run(token);
    }
    res.clearCookie("session_token", {
      httpOnly: true,
      sameSite: "strict",
      secure: USE_SECURE_COOKIES,
    });
    if (req.user) {
      logSecurityEvent(req, "logout", "", req.user.id);
    }
    res.json({ ok: true });
  });

  router.get("/auth/me", (req, res) => {
    res.json({ user: req.user || null });
  });

  return router;
};

module.exports = buildAuthRouter;
