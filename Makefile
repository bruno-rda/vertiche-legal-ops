SERVICE_NAME ?=
FLAGS ?=

.PHONY: run stop down logs

run:
	docker compose up $(FLAGS) --build --remove-orphans $(SERVICE_NAME)

stop:
	docker compose stop $(SERVICE_NAME)

down:
	docker compose down --remove-orphans

logs:
	docker compose logs -f --tail=100 $(SERVICE_NAME)