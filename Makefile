DB_PATH ?= data/exam-builder.db
BACKUP_DIR ?= data/backups
BACKUP_FILE ?=

.PHONY: build update run logs down backup-db

build:
	docker compose build

update:
	git pull
	docker compose build
	docker compose up -d

run:
	docker compose up -d

logs:
	docker compose logs -f

down:
	docker compose down

backup-db:
	@DB_PATH="$(DB_PATH)" BACKUP_DIR="$(BACKUP_DIR)" BACKUP_FILE="$(BACKUP_FILE)" node scripts/backup-db.js
