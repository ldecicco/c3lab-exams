"use strict";

let helmet;
try {
  helmet = require("helmet");
} catch (err) {
  console.warn(
    "[security] helmet non installato, headers di sicurezza disattivati. Esegui: npm install helmet"
  );
  helmet = null;
}

let rateLimit;
try {
  rateLimit = require("express-rate-limit");
} catch (err) {
  console.warn(
    "[security] express-rate-limit non installato, rate limiting disattivato. Esegui: npm install express-rate-limit"
  );
  rateLimit = null;
}

let csrf;
try {
  csrf = require("csurf");
} catch (err) {
  console.warn(
    "[security] csurf non installato, protezione CSRF disattivata. Esegui: npm install csurf"
  );
  csrf = null;
}

const initHelmet = (app) => {
  if (!helmet) return false;
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );
  return true;
};

const createRateLimiter = (options) => {
  if (!rateLimit) {
    return (req, res, next) => next();
  }
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
  });
};

const createCsrfProtection = ({ useSecureCookies }) =>
  csrf
    ? csrf({
        cookie: {
          key: "csrf_token",
          httpOnly: true,
          sameSite: "strict",
          secure: useSecureCookies,
        },
      })
    : null;

const applyCsrfToken = (csrfProtection) => (req, res, next) => {
  if (!csrfProtection || !req.user) return next();
  csrfProtection(req, res, (err) => {
    if (err) return next(err);
    try {
      res.locals.csrfToken = req.csrfToken();
    } catch {
      res.locals.csrfToken = null;
    }
    next();
  });
};

const ensureCsrfLocals = (basePath) => (req, res, next) => {
  if (typeof res.locals.csrfToken === "undefined") {
    res.locals.csrfToken = null;
  }
  res.locals.basePath = basePath;
  next();
};

module.exports = {
  initHelmet,
  createRateLimiter,
  createCsrfProtection,
  applyCsrfToken,
  ensureCsrfLocals,
};
