.PHONY: build update run

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
