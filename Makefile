SERVICE_NAME ?=
MODULE ?=

.PHONY: run stop down logs script

run:
	docker compose up $(FLAGS) --build --remove-orphans $(SERVICE_NAME)

stop:
	docker compose stop $(SERVICE_NAME)

down:
	docker compose down --remove-orphans

logs:
	docker compose logs -f --tail=100 $(SERVICE_NAME)

script:
	docker compose exec backend python -m $(MODULE)