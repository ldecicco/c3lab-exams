const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = process.env.DB_PATH || "data/exam-builder.db";
const backupDir = process.env.BACKUP_DIR || "data/backups";
const backupFile = process.env.BACKUP_FILE;

const timestamp = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace(/\..+$/, "")
  .replace("T", "-");

const targetPath = backupFile || path.join(backupDir, `exam-builder-${timestamp}.db`);

if (!fs.existsSync(dbPath)) {
  console.error(`Database non trovato: ${dbPath}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(targetPath), { recursive: true });

const db = new Database(dbPath, { readonly: true, fileMustExist: true });

db.backup(targetPath)
  .then(() => {
    console.log(`Backup creato: ${targetPath}`);
  })
  .catch((err) => {
    console.error(`Errore backup database: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    db.close();
  });
