# Refactor Plan (Graduale)

Obiettivo: ridurre duplicazioni JS e rendere il codice più manutenibile senza regressioni.

## Linee guida
- Ogni step deve essere piccolo e verificabile.
- Dopo ogni step: test manuale + commit + aggiornamento di questo file.
- Niente refactor “big‑bang”.

## Stato avanzamento

### Step 0 — Inventario duplicati (PRE‑WORK)
- [x] Mappare funzioni duplicate (toast, modal, apiFetch, format date).
- [x] Annotare file interessati: `app.js`, `admin.js`, `exam-builder.js`, `dashboard.js`, `home.js`, `nav.js`, `esame-completo.js`.
  - **showToast**: `app.js`, `admin.js` (usa globale), `exam-builder.js`, `dashboard.js`, `home.js`, `nav.js`, `esame-completo.js`.
  - **apiFetch**: `admin.js`, `exam-builder.js`, `esame-completo.js`.
  - **open/close modal**: `nav.js`, `esame-completo.js` (pattern simili).
  - **toggle class is-hidden / is-active**: diffuso in `app.js`, `admin.js`, `exam-builder.js`, `dashboard.js`.
  - **format score**: `app.js`/`esame-completo.js` (simile).

### Step 1 — Utilities UI (toast + modal)
- [x] Creare `utils/ui.js` con `showToast`, `openModal`, `closeModal`.
- [x] Rimuovere implementazioni duplicate di `showToast` nei file JS.
- [x] Aggiornare i layout EJS per includere `utils/ui.js`.
- [x] Test: toast e modali in Domande / Tracce / Valutazione / Dashboard.

### Step 2 — API helper
- [x] Creare `utils/api.js` con `apiFetch` + gestione CSRF.
- [x] Sostituire fetch duplicati nei moduli principali.
- [x] Test: CRUD base + error handling.

### Step 3 — Formatting & helpers
- [x] Creare `utils/format.js` (date, score, badge label).
- [x] Sostituire logiche ripetute nei rendering.
- [x] Test: visualizzazione coerente in moduli.

### Step 4 — Componenti lista/cards
- [x] Standardizzare cards: `exam-cards.js`, `course-cards.js`, `question-cards.js`, `user-cards.js`.
- [x] Rimuovere markup duplicato.
- [x] Test: liste in Admin / Tracce / Domande / Esame completo.

### Step 5 — Modali condivisi
- [x] Aggiungere helper `bindModal` in `utils/ui.js`.
- [x] Migrare modali principali in `esame-completo.js` e `dashboard.js`.
- [x] Unificare comportamento modali (ESC + focus base).
- [x] Migrare modali principali in `/questions` (admin.js).
- [x] Migrare modali principali in `nav.js`, `exam-builder.js`, `app.js`.
- [x] Rimuovere duplicazioni JS residue.
- [x] Test: modali principali (image picker, override, 2FA, password).

### Step 6 — Cleanup finale
- [x] Rimuovere funzioni inutilizzate (admin.js: preview domanda legacy).
- [x] Verificare build minify.
- [x] Test completo end‑to‑end.

---

## Registro test & commit
- Step 1: _pending_
- Step 2: _pending_
- Step 3: _pending_
- Step 4: _pending_
- Step 5: _pending_
- Step 6: _ok (smoke test /questions + modali)_
