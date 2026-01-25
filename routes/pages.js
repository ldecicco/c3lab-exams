"use strict";

const express = require("express");

const buildPagesRouter = ({ BASE_PATH, requireAuth, requirePageRole }) => {
  const router = express.Router();

  router.get("/", (req, res) => res.redirect(BASE_PATH + "/home"));

  router.get("/home", requirePageRole("admin", "creator", "evaluator"), (req, res) =>
    res.render("home")
  );

  router.get("/valutazione", (req, res) => res.render("index"));
  router.get("/valutazione/", (req, res) => res.render("index"));
  router.get("/index", (req, res) => res.redirect(BASE_PATH + "/valutazione"));
  router.get("/index.html", (req, res) => res.redirect(BASE_PATH + "/valutazione"));

  router.get("/questions", requirePageRole("admin", "creator"), (req, res) =>
    res.render("questions")
  );
  router.get("/questions.html", requirePageRole("admin", "creator"), (req, res) =>
    res.render("questions")
  );

  router.get("/exam-builder", requirePageRole("admin", "creator"), (req, res) =>
    res.render("exam-builder")
  );
  router.get("/exam-builder.html", requirePageRole("admin", "creator"), (req, res) =>
    res.render("exam-builder")
  );

  router.get("/dashboard", requirePageRole("admin", "creator"), (req, res) =>
    res.render("dashboard")
  );
  router.get("/dashboard.html", requirePageRole("admin", "creator"), (req, res) =>
    res.render("dashboard")
  );

  router.get("/esame-completo", requirePageRole("admin", "creator", "evaluator"), (req, res) =>
    res.render("esame-completo")
  );
  router.get("/esame-completo.html", requirePageRole("admin", "creator", "evaluator"), (req, res) =>
    res.render("esame-completo")
  );

  router.get("/admin", requirePageRole("admin"), (req, res) => res.render("admin"));
  router.get("/admin.html", requirePageRole("admin"), (req, res) =>
    res.render("admin")
  );

  router.get("/guida", requireAuth, (req, res) => res.render("guida"));
  router.get("/guida.html", requireAuth, (req, res) => res.render("guida"));

  return router;
};

module.exports = buildPagesRouter;
