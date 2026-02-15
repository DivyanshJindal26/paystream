# PayStream Docker Deployment Guide

This guide will help you run the entire PayStream application using Docker.

## Prerequisites

- Docker Engine 20.10+ installed
- Docker Compose 2.0+ installed
- At least 2GB of free disk space

## Quick Start

### 1. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.docker.example .env.docker
```

Edit `.env.docker` and set your values:
- `MONGO_ROOT_PASSWORD`: Strong password for MongoDB
- `ORACLE_PRIVATE_KEY`: Your oracle wallet private key for off-ramp functionality
- Ports if defaults (3000, 5000, 27017) are already in use

### 2. Build and Start Services

```bash
# Build and start all services
docker-compose --env-file .env.docker up -d

# Or use the default .env file if you rename it
docker-compose up -d
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MongoDB**: localhost:27017

## Available Commands

### Start Services
```bash
# Start all services in detached mode
docker-compose up -d

# Start and view logs
docker-compose up

# Start specific service
docker-compose up -d backend
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Rebuild Services
```bash
# Rebuild and restart after code changes
docker-compose up -d --build

# Rebuild specific service
docker-compose up -d --build backend
```

## Service Details

### MongoDB
- **Image**: mongo:7-jammy
- **Port**: 27017 (configurable)
- **Volumes**: Persistent data storage
- **Health Check**: Automatic readiness check

### Backend
- **Build**: Node.js 20 Alpine
- **Port**: 5000 (configurable)
- **Dependencies**: MongoDB (waits for health check)
- **Health Check**: HTTP endpoint verification

### Frontend
- **Build**: Multi-stage (Node.js build + Nginx serve)
- **Port**: 80 mapped to 3000 (configurable)
- **Features**: Gzip compression, SPA routing, static asset caching

## Development vs Production

### Development Mode

For development with hot reload, you may want to use volume mounts:

```yaml
# Add to docker-compose.yml under backend service
volumes:
  - ./backend:/app
  - /app/node_modules

# Add to docker-compose.yml under frontend service  
command: npm run dev
volumes:
  - ./frontend:/app
  - /app/node_modules
```

### Production Mode

Current configuration is optimized for production:
- Multi-stage builds for minimal image size
- Health checks for all services
- Automatic restart policies
- Nginx serving with caching and compression

## Troubleshooting

### Services won't start
```bash
# Check service status
docker-compose ps

# View logs for errors
docker-compose logs
```

### Port conflicts
Edit `.env.docker` and change port mappings:
```env
FRONTEND_PORT=8080
BACKEND_PORT=8000
MONGO_PORT=27018
```

### MongoDB connection issues
```bash
# Verify MongoDB is healthy
docker-compose ps mongodb

# Check MongoDB logs
docker-compose logs mongodb

# Test connection
docker exec -it paystream-mongodb mongosh -u admin -p paystream_secure_password
```

### Reset everything
```bash
# Stop services and remove all data
docker-compose down -v

# Remove images
docker-compose down --rmi all -v

# Rebuild from scratch
docker-compose up -d --build
```

## Data Persistence

Database data is stored in Docker volumes:
- `mongodb_data`: Database files
- `mongodb_config`: MongoDB configuration

To backup data:
```bash
# Export database
docker exec paystream-mongodb mongodump --out /tmp/backup

# Copy backup to host
docker cp paystream-mongodb:/tmp/backup ./mongodb-backup
```

To restore data:
```bash
# Copy backup to container
docker cp ./mongodb-backup paystream-mongodb:/tmp/restore

# Import database
docker exec paystream-mongodb mongorestore /tmp/restore
```

## Security Notes

1. **Change default passwords** in `.env.docker`
2. **Never commit** `.env.docker` to version control
3. **Use secrets management** for production deployments
4. **Enable MongoDB authentication** in production
5. **Use reverse proxy** (nginx/traefik) with SSL in production

## Performance Tuning

### MongoDB
```yaml
# Add to mongodb service in docker-compose.yml
command: mongod --wiredTigerCacheSizeGB 1
```

### Backend
```yaml
# Add to backend service
environment:
  NODE_OPTIONS: --max-old-space-size=512
```

## Updating

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build
```

## Monitoring

```bash
# View resource usage
docker stats

# Inspect specific container
docker inspect paystream-backend

# Execute commands in container
docker exec -it paystream-backend sh
```
