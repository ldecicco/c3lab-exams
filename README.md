# C3LAB Esami

Applicazione web per creare tracce d’esame, gestire il banco domande, correggere elaborati e pubblicare i risultati.

## Requisiti
- Node.js + npm
- Docker + Docker Compose (per deploy)

## Sviluppo locale
```bash
npm install
npm start
```
L’app parte su `http://localhost:3000`.

Per disabilitare 2FA in sviluppo:  
impostare `NODE_ENV=development` (la 2FA è attiva in produzione).

## Produzione (Docker)
Build immagine:
```bash
make build
```

Avvio in background:
```bash
make run
```

Aggiornamento (git pull + build + restart):
```bash
make update
```

Log e stop:
```bash
make logs
make down
```

## Configurazione
Variabili principali in `.env` (vedi `.env.example`):
- `NODE_ENV`
- `BASE_PATH`
- `SESSION_SECRET`
- `CSRF_SECRET`
- `PORT`

## Note
- Il database SQLite è in `data/exam-builder.db`
- I file caricati (immagini/avatar) vivono in `data/`  
