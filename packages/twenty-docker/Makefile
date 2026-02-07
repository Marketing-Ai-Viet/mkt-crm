# Makefile for building Twenty CRM docker images.
# Set the tag and/or target build platform using make command-line variables assignments.
#
# Optional make variables:
# PLATFORM - defaults to 'linux/amd64'
# TAG      - defaults to 'latest'
# FORCE    - skip confirmation prompts (FORCE=1)
#
# Example: make
# Example: source .env && make mkt TAG=v1.4.5
# Example: make PLATFORM=linux/aarch64 TAG=my-tag
# Example: make dev-down FORCE=1  # Skip confirmation

PLATFORM ?= linux/amd64
TAG ?= latest
BASE_IMAGE ?= twentycrm/twenty:v1.2.0
FORCE ?= 0

# Confirmation helper
define confirm
	@if [ "$(FORCE)" != "1" ]; then \
		read -p "$(1) [y/N]: " answer; \
		if [ "$$answer" != "y" ] && [ "$$answer" != "Y" ]; then \
			echo "Cancelled."; \
			exit 1; \
		fi \
	fi
endef

prod-build:
	@cd ../.. && docker build -f ./packages/twenty-docker/twenty/Dockerfile --platform $(PLATFORM) --tag twenty:$(TAG) . && cd -

mkt:
	@cd ../.. && docker build \
	 -f ./packages/twenty-docker/twenty/server/Dockerfile \
	 --platform $(PLATFORM) \
	 --build-arg BASE_IMAGE=$(BASE_IMAGE) \
	 --tag mkt:$(TAG) . && cd -

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
	$(call confirm,Stop production server?)
	@docker compose -f docker-compose.server.yml down

prod-server-logs:
	@docker compose -f docker-compose.server.yml logs -f

prod-server-restart:
	@docker compose -f docker-compose.server.yml restart

# App-only commands (stop/start app while keeping db and redis running)
app-down:
	@docker compose -f docker-compose.server.yml stop server

app-up:
	@docker compose -f docker-compose.server.yml start server

app-restart:
	@docker compose -f docker-compose.server.yml restart server

app-logs:
	@docker compose -f docker-compose.server.yml logs -f server

# Watch build for hot reload (run in separate terminal)
watch-build:
	@cd ../.. && npx nx build twenty-server --watch

# =============================================================================
# Development Environment (docker-compose.dev.yml)
# =============================================================================

dev-build:
	@docker compose -f docker-compose.dev.yml build

dev-up:
	@docker compose -f docker-compose.dev.yml up -d

dev-down:
	$(call confirm,Stop development environment and reset all database?)
	@docker compose -f docker-compose.dev.yml down

dev-logs:
	@docker compose -f docker-compose.dev.yml logs -f

dev-logs-server:
	@docker compose -f docker-compose.dev.yml logs -f server

dev-restart:
	@docker compose -f docker-compose.dev.yml restart

dev-restart-server:
	@docker compose -f docker-compose.dev.yml restart server

dev-server-down:
	@docker compose -f docker-compose.dev.yml stop server worker

dev-server-up:
	@docker compose -f docker-compose.dev.yml start server worker

dev-logs-worker:
	@docker compose -f docker-compose.dev.yml logs -f worker

dev-restart-worker:
	@docker compose -f docker-compose.dev.yml restart worker

dev-clean:
	$(call confirm,Remove DEV containers and volumes? This will DELETE all data!)
	@docker compose -f docker-compose.dev.yml down -v

dev-status:
	@docker compose -f docker-compose.dev.yml ps -a

# =============================================================================
# MKT Product - Authorization Server (docker-compose.mkt-product.yml)
# =============================================================================

mkt-build:
	@docker compose -f docker-compose.mkt-product.yml build

mkt-up:
	@docker compose -f docker-compose.mkt-product.yml up -d

mkt-down:
	$(call confirm,Stop MKT Product server?)
	@docker compose -f docker-compose.mkt-product.yml down

mkt-logs:
	@docker compose -f docker-compose.mkt-product.yml logs -f

mkt-logs-server:
	@docker compose -f docker-compose.mkt-product.yml logs -f mkt-server

mkt-logs-worker:
	@docker compose -f docker-compose.mkt-product.yml logs -f mkt-worker

mkt-restart:
	@docker compose -f docker-compose.mkt-product.yml restart

mkt-clean:
	$(call confirm,Remove MKT containers and volumes? This will DELETE all data!)
	@docker compose -f docker-compose.mkt-product.yml down -v

mkt-status:
	@docker compose -f docker-compose.mkt-product.yml ps -a

# =============================================================================
# Database commands (local development - uses packages/twenty-server/.env)
# =============================================================================
db-reset:
	$(call confirm,Reset database? This will DELETE all data!)
	@cd ../.. && npx nx database:reset twenty-server && cd -

db-migrate:
	@cd ../.. && npx nx run twenty-server:database:migrate:prod && cd -

db-seed:
	@cd ../.. && npx nx command twenty-server -- workspace:seed:dev && cd -

# =============================================================================
# LocalStack - AWS S3 Emulator for Local Development
# =============================================================================

# Configuration
LOCALSTACK_COMPOSE_FILE := docker-compose.localstack.yml
LOCALSTACK_BUCKET       := crm-files-local
LOCALSTACK_ENDPOINT     := http://localhost:4566

localstack-start: ## Start LocalStack
	@docker compose -f $(LOCALSTACK_COMPOSE_FILE) up -d
	@sleep 5
	@make localstack-status

localstack-stop: ## Stop LocalStack
	@docker compose -f $(LOCALSTACK_COMPOSE_FILE) stop

localstack-down: ## Stop and remove LocalStack containers
	@docker compose -f $(LOCALSTACK_COMPOSE_FILE) down

localstack-restart: ## Restart LocalStack
	@make localstack-stop
	@make localstack-start

localstack-logs: ## Show LocalStack logs
	@docker compose -f $(LOCALSTACK_COMPOSE_FILE) logs -f localstack

localstack-status: ## Check LocalStack status
	@curl -s $(LOCALSTACK_ENDPOINT)/_localstack/health | jq . 2>/dev/null || echo "LocalStack not responding"

localstack-reset: ## Reset LocalStack (delete data and restart)
	$(call confirm,Reset LocalStack? This will DELETE all data!)
	@docker compose -f $(LOCALSTACK_COMPOSE_FILE) down -v
	@make localstack-start

# =============================================================================
# Help
# =============================================================================
help:
	@echo "Twenty CRM Docker Commands"
	@echo ""
	@echo "=== Development (CRM) ==="
	@echo "  make dev-build          Build dev image"
	@echo "  make dev-up             Start (server, worker, db, redis)"
	@echo "  make dev-down           Stop all"
	@echo "  make dev-logs           View all logs"
	@echo "  make dev-logs-server    View server logs"
	@echo "  make dev-logs-worker    View worker logs"
	@echo "  make dev-restart        Restart all"
	@echo "  make dev-restart-worker Restart worker"
	@echo "  make dev-clean          Remove containers and volumes"
	@echo "  make dev-status         Show status"
	@echo ""
	@echo "=== MKT Product (OAuth2 Server) ==="
	@echo "  make mkt-build          Build MKT image"
	@echo "  make mkt-up             Start (server, worker, db, redis)"
	@echo "  make mkt-down           Stop all"
	@echo "  make mkt-logs           View all logs"
	@echo "  make mkt-logs-server    View server logs"
	@echo "  make mkt-logs-worker    View worker logs"
	@echo "  make mkt-restart        Restart all"
	@echo "  make mkt-clean          Remove containers and volumes"
	@echo "  make mkt-status         Show status"
	@echo ""
	@echo "=== LocalStack (AWS S3 Emulator) ==="
	@echo "  make localstack-start        Start LocalStack"
	@echo "  make localstack-stop         Stop LocalStack"
	@echo "  make localstack-restart      Restart LocalStack"
	@echo "  make localstack-logs         View logs"
	@echo "  make localstack-status       Check status"
	@echo "  make localstack-reset        Complete reset"
	@echo ""
	@echo "=== Production ==="
	@echo "  make prod-server-build  Build server image"
	@echo "  make prod-server-up     Start production"
	@echo "  make prod-server-down   Stop production"
	@echo "  make prod-server-logs   View logs"
	@echo ""
	@echo "=== Database ==="
	@echo "  make db-reset           Reset database"
	@echo "  make db-migrate         Run migrations"
	@echo "  make db-seed            Seed data"
	@echo ""
	@echo "Variables: TAG=latest PLATFORM=linux/amd64 FORCE=0"
	@echo ""
	@echo "Tip: Use FORCE=1 to skip confirmation prompts"
	@echo "  Example: make dev-down FORCE=1"
