# Refactor Plan — server.js (Graduale)

Obiettivo: modularizzare `server.js` senza regressioni, con step piccoli e test manuali.

## Linee guida
- Ogni step deve essere piccolo e reversibile.
- Dopo ogni step: test manuale + commit + aggiornamento di questo file.
- Nessuna modifica funzionale non richiesta.

## Stato avanzamento

### Step 7.0 — Preparazione
- [x] Creare struttura cartelle di base (`config/`, `middlewares/`, `routes/`, `services/`, `repositories/`).
- [x] Definire checklist test minimi per ogni step.

Checklist test minimi (da usare dopo ogni step):
- Avvio server senza errori.
- Login/logout OK.
- `/home` carica corsi e selezione corso.
- `/exam-builder` carica tracce e banca domande.
- `/questions` apre editor e salva domanda.
- `/valutazione` carica studenti e mapping.
- `/dashboard` carica grafici e selezione tracce.
- `/esame-completo` selezione multi‑modulo.

### Step 7.1 — Config + bootstrap
- [x] Estrarre configurazione (env, paths, feature flags) in `config/`.
- [x] Estrarre bootstrap Express (setup app, view engine, static).
- [x] Test: avvio server, login, `/home`, `/valutazione`.

### Step 7.2 — Middlewares
- [x] Spostare `requireAuth`, `requireRole`.
- [x] Spostare CSRF, rate limit, helmet.
- [x] Test: login/logout, accesso ruoli, POST protetti.

### Step 7.3 — DB layer
- [x] Estrarre `db.js` + repo per domini principali.
- [x] Test: query base (exams, questions, images, users, results).

### Step 7.4 — Routes split
- [ ] Dividere per dominio (`auth`, `courses`, `questions`, `images`, `exams`, `grading`, `public`, `admin`, `multi-modules`).
  - [x] Auth routes (login/logout/2FA).
  - [x] Pages routes (home, valutazione, questions, exam-builder, dashboard, admin, guida).
  - [x] Session routes (active course/exam).
  - [x] Users routes (CRUD + avatar/password).
  - [x] Courses/topics/shortcuts routes.
  - [x] Exams + multi-modules routes.
  - [x] Questions routes.
  - [x] Images routes.
  - [x] Grading/public routes.
- [ ] Test: pagine principali + API core.

### Step 7.5 — Services
- [x] Estrarre servizi (latex, traces, thumbnails, cheating).
- [x] Test: preview PDF, generate traces, thumbnails.

### Step 7.6 — Cleanup finale
- [ ] Eliminare duplicazioni residue in server.
- [ ] Aggiornare README (struttura progetto).
- [ ] Test end‑to‑end.

---

## Registro test & commit
- Step 7.0: _ok_
- Step 7.1: _ok (avvio + login + /home + /valutazione)_
- Step 7.2: _ok (login/logout + ruoli + POST protetti)_
- Step 7.3: _ok (avvio + home + questions + valutazione)_
- Step 7.4: _ok (pagine principali + API core)_
- Step 7.5: _ok (latex service + test preview/generate)_
- Step 7.6: _pending_
