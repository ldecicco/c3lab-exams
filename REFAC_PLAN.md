# Refactor Plan (Graduale)

Obiettivo: ridurre duplicazioni JS e rendere il codice più manutenibile senza regressioni.

## Linee guida
- Ogni step deve essere piccolo e verificabile.
- Dopo ogni step: test manuale + commit + aggiornamento di questo file.
- Niente refactor “big‑bang”.

## Stato avanzamento

### Step 0 — Inventario duplicati (PRE‑WORK)
- [ ] Mappare funzioni duplicate (toast, modal, apiFetch, format date).
- [ ] Annotare file interessati: `app.js`, `admin.js`, `exam-builder.js`, `dashboard.js`, `questions.js`, `home.js`, `nav.js`.

### Step 1 — Utilities UI (toast + modal)
- [ ] Creare `utils/ui.js` con `showToast`, `openModal`, `closeModal`.
- [ ] Rimuovere implementazioni duplicate di `showToast` nei file JS.
- [ ] Aggiornare i layout EJS per includere `utils/ui.js`.
- [ ] Test: toast e modali in Domande / Tracce / Valutazione / Dashboard.

### Step 2 — API helper
- [ ] Creare `utils/api.js` con `apiFetch` + gestione CSRF.
- [ ] Sostituire fetch duplicati nei moduli principali.
- [ ] Test: CRUD base + error handling.

### Step 3 — Formatting & helpers
- [ ] Creare `utils/format.js` (date, score, badge label).
- [ ] Sostituire logiche ripetute nei rendering.
- [ ] Test: visualizzazione coerente in moduli.

### Step 4 — Componenti lista/cards
- [ ] Standardizzare cards: `exam-cards.js`, `course-cards.js`, `question-cards.js`, `user-cards.js`.
- [ ] Rimuovere markup duplicato.
- [ ] Test: liste in Admin / Tracce / Domande / Esame completo.

### Step 5 — Modali condivisi
- [ ] Unificare comportamento modali (ESC, backdrop, focus).
- [ ] Rimuovere duplicazioni JS.
- [ ] Test: modali principali (image picker, override, 2FA, password).

### Step 6 — Cleanup finale
- [ ] Rimuovere funzioni inutilizzate.
- [ ] Verificare build minify.
- [ ] Test completo end‑to‑end.

---

## Registro test & commit
- Step 1: _pending_
- Step 2: _pending_
- Step 3: _pending_
- Step 4: _pending_
- Step 5: _pending_
- Step 6: _pending_
