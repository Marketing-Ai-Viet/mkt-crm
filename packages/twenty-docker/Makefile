# Makefile for building Twenty CRM docker images.
# Set the tag and/or target build platform using make command-line variables assignments.
#
# Optional make variables:
# PLATFORM - defaults to 'linux/amd64'
# TAG      - defaults to 'latest'
#
# Example: make
# Example: make PLATFORM=linux/aarch64 TAG=my-tag

PLATFORM ?= linux/amd64
TAG ?= latest

prod-build:
	@cd ../.. && docker build -f ./packages/twenty-docker/twenty/Dockerfile --platform $(PLATFORM) --tag twenty:$(TAG) . && cd -

prod-run:
	@docker run -d -p 3000:3000 --name twenty twenty:$(TAG)

prod-postgres-run:
	@docker run -d -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres --name twenty-postgres twenty-postgres:$(TAG)

prod-website-build:
	@cd ../.. && docker build -f ./packages/twenty-docker/twenty-website/Dockerfile --platform $(PLATFORM) --tag twenty-website:$(TAG) . && cd -

prod-website-run:
	@docker run -d -p 3000:3000 --name twenty-website twenty-website:$(TAG)

# Server-only build (without frontend)
prod-server-build:
	@cd ../.. && docker build -f ./packages/twenty-docker/twenty/Dockerfile.server --platform $(PLATFORM) --tag twenty-server:$(TAG) . && cd -

prod-server-run:
	@docker run -d -p 3003:3003 --name twenty-server twenty-server:$(TAG)

# Docker Compose commands for server-only (uses ../twenty-server/.env)
prod-server-up:
	@docker compose -f docker-compose.server.yml up -d

prod-server-down:
	@docker compose -f docker-compose.server.yml down

prod-server-logs:
	@docker compose -f docker-compose.server.yml logs -f

prod-server-restart:
	@docker compose -f docker-compose.server.yml restart

# Database commands (local development - uses packages/twenty-server/.env)
db-reset:
	@cd ../.. && npx nx database:reset twenty-server && cd -

db-migrate:
	@cd ../.. && npx nx run twenty-server:database:migrate:prod && cd -

db-seed:
	@cd ../.. && npx nx command twenty-server -- workspace:seed:dev && cd -
