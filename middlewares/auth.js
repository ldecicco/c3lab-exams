"use strict";

const requireAuth = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: "Autenticazione richiesta" });
    return;
  }
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: "Autenticazione richiesta" });
    return;
  }
  if (!roles.includes(req.user.role)) {
    res.status(403).json({ error: "Permessi insufficienti" });
    return;
  }
  next();
};

const createRequirePageRole = (basePath) => (...roles) => (req, res, next) => {
  if (!req.user) {
    res.redirect(basePath + "/login");
    return;
  }
  if (!roles.includes(req.user.role)) {
    res.status(403).send("Permessi insufficienti");
    return;
  }
  next();
};

module.exports = {
  requireAuth,
  requireRole,
  createRequirePageRole,
};
