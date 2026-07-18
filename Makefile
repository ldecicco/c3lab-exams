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
	@docker compose run --rm --no-deps \
		-v "$(CURDIR)/scripts/backup-db.js:/app/scripts/backup-db.js:ro" \
		-e DB_PATH="$(DB_PATH)" \
		-e BACKUP_DIR="$(BACKUP_DIR)" \
		-e BACKUP_FILE="$(BACKUP_FILE)" \
		app node scripts/backup-db.js
