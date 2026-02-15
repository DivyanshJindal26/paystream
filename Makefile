# PayStream Docker Makefile
# Convenience commands for Docker operations

.PHONY: help build up down restart logs clean rebuild

# Default target
help:
	@echo "PayStream Docker Commands:"
	@echo "  make setup      - Copy env example and setup environment"
	@echo "  make build      - Build all Docker images"
	@echo "  make up         - Start all services"
	@echo "  make down       - Stop all services"
	@echo "  make restart    - Restart all services"
	@echo "  make logs       - View logs from all services"
	@echo "  make logs-f     - Follow logs from all services"
	@echo "  make logs-be    - View backend logs"
	@echo "  make logs-fe    - View frontend logs"
	@echo "  make logs-db    - View MongoDB logs"
	@echo "  make clean      - Stop services and remove volumes (DELETES DATA)"
	@echo "  make rebuild    - Rebuild and restart all services"
	@echo "  make status     - Show service status"
	@echo "  make shell-be   - Open shell in backend container"
	@echo "  make shell-fe   - Open shell in frontend container"
	@echo "  make shell-db   - Open MongoDB shell"

# Setup environment
setup:
	@if [ ! -f .env.docker ]; then \
		cp .env.docker.example .env.docker; \
		echo "Created .env.docker - please edit it with your values"; \
	else \
		echo ".env.docker already exists"; \
	fi

# Build images
build:
	docker-compose --env-file .env.docker build

# Start services
up:
	docker-compose --env-file .env.docker up -d

# Stop services
down:
	docker-compose --env-file .env.docker down

# Restart services
restart:
	docker-compose --env-file .env.docker restart

# View logs
logs:
	docker-compose --env-file .env.docker logs

logs-f:
	docker-compose --env-file .env.docker logs -f

logs-be:
	docker-compose --env-file .env.docker logs -f backend

logs-fe:
	docker-compose --env-file .env.docker logs -f frontend

logs-db:
	docker-compose --env-file .env.docker logs -f mongodb

# Clean everything (WARNING: deletes data)
clean:
	docker-compose --env-file .env.docker down -v
	docker system prune -f

# Rebuild and restart
rebuild:
	docker-compose --env-file .env.docker up -d --build

# Show status
status:
	docker-compose --env-file .env.docker ps

# Open shells
shell-be:
	docker exec -it paystream-backend sh

shell-fe:
	docker exec -it paystream-frontend sh

shell-db:
	docker exec -it paystream-mongodb mongosh -u admin -p paystream_secure_password
