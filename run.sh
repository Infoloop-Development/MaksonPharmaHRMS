#!/usr/bin/env bash
# ==============================================================================
# MAMS — Single Command Docker Runner & Stack Manager
# Usage:
#   ./run.sh              # Build & start stack in background
#   ./run.sh up           # Build & start stack in background
#   ./run.sh down         # Stop all services
#   ./run.sh restart      # Restart services
#   ./run.sh logs [svc]   # Stream logs (api, web, mongo)
#   ./run.sh status       # Show stack status & container health
#   ./run.sh seed         # Run database seeding inside api container
#   ./run.sh build        # Rebuild images without starting
#   ./run.sh clean        # Stop and purge volumes/orphans
# ==============================================================================

set -eo pipefail

# ------------------------------------------------------------------------------
# Color Output Helpers
# ------------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Determine project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ------------------------------------------------------------------------------
# Helper Functions
# ------------------------------------------------------------------------------
log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✔${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✖${NC} $1" >&2
}

banner() {
  echo -e "${CYAN}${BOLD}"
  echo "=================================================================="
  echo "     __  __    _    __  __ ____    _   _ ____  __  __ ____        "
  echo "    |  \/  |  / \  |  \/  / ___|  | | | |  _ \|  \/  / ___|       "
  echo "    | |\/| | / _ \ | |\/| \___ \  | |_| | |_) | |\/| \___ \       "
  echo "    | |  | |/ ___ \| |  | |___) | |  _  |  _ <| |  | |___) |      "
  echo "    |_|  |_/_/   \_\_|  |_|____/  |_| |_|_| \_\_|  |_|____/       "
  echo "         Makson Attendance Management System (On-Prem Stack)       "
  echo "=================================================================="
  echo -e "${NC}"
}

# Check Docker CLI and Daemon
check_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    log_error "Docker is not installed. Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    log_error "Docker daemon is not running. Please start Docker Engine or Docker Desktop."
    exit 1
  fi

  # Determine Compose Command
  if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
  else
    log_error "Docker Compose is not installed."
    exit 1
  fi
}

# Ensure .env exists with secure keys
ensure_env() {
  if [ ! -f .env ] && [ ! -f mams/.env.onprem ]; then
    log_info "No .env file found. Creating default .env from template..."
    
    ACCESS_SECRET=$(head -c 32 /dev/urandom 2>/dev/null | base64 2>/dev/null || openssl rand -base64 32 2>/dev/null || echo "mams_jwt_access_secret_$(date +%s)_32b")
    REFRESH_SECRET=$(head -c 32 /dev/urandom 2>/dev/null | base64 2>/dev/null || openssl rand -base64 32 2>/dev/null || echo "mams_jwt_refresh_secret_$(date +%s)_32b")

    cat <<EOF > .env
# Auto-generated MAMS Production Configuration
NODE_ENV=production
PORT=3001
WEB_PORT=8089
MONGO_URI=mongodb://mongo:27017/mams_prod
JWT_ACCESS_SECRET=${ACCESS_SECRET}
JWT_REFRESH_SECRET=${REFRESH_SECRET}
CORS_ORIGIN=http://localhost:8089
PUBLIC_APP_URL=http://localhost:8089
TZ=Asia/Kolkata
EOF
    log_success "Created .env with secure random JWT secrets."
  fi
}

# Wait for stack health
wait_for_health() {
  local max_retries=60
  local count=0
  local target_port="${WEB_PORT:-8089}"
  
  echo ""
  log_info "Waiting for services to become healthy..."
  
  while [ $count -lt $max_retries ]; do
    if curl -sf "http://127.0.0.1:${target_port}/api/health" >/dev/null 2>&1; then
      echo ""
      log_success "All services are up and healthy!"
      return 0
    fi
    printf "."
    sleep 2
    count=$((count + 1))
  done

  echo ""
  log_warn "Health check timed out waiting for http://127.0.0.1:${target_port}/api/health"
  log_warn "Check container logs using: ./run.sh logs"
  return 1
}

# Print Access Info Banner
show_access_info() {
  local port="${WEB_PORT:-8089}"
  echo ""
  echo -e "${GREEN}${BOLD}==================================================================${NC}"
  echo -e "${GREEN}${BOLD}  MAMS APPLICATION READY                                          ${NC}"
  echo -e "${GREEN}${BOLD}==================================================================${NC}"
  echo -e "  ${BOLD}URL:${NC}        ${CYAN}http://localhost:${port}/login${NC}"
  echo -e "  ${BOLD}API Health:${NC} ${CYAN}http://localhost:${port}/api/health${NC}"
  echo ""
  echo -e "  ${BOLD}Default Credentials:${NC}"
  echo -e "    - Admin:      ${YELLOW}hr.admin@makson-group.com${NC}  / ${YELLOW}makson2026${NC}"
  echo -e "    - Compliance: ${YELLOW}hr.compliance@makson-group.com${NC} / ${YELLOW}makson2026${NC}"
  echo -e "    - Org Admin:  ${YELLOW}org.admin@makson-group.com${NC}  / ${YELLOW}makson2026${NC}"
  echo -e "${GREEN}${BOLD}==================================================================${NC}"
  echo ""
}

# ------------------------------------------------------------------------------
# Action Handlers
# ------------------------------------------------------------------------------
cmd_up() {
  banner
  check_docker
  ensure_env
  
  log_info "Building optimized Docker images and starting containers..."
  export DOCKER_BUILDKIT=1
  export COMPOSE_DOCKER_CLI_BUILD=1
  
  $DOCKER_COMPOSE up -d --build "$@"
  
  wait_for_health || true
  show_access_info
}

cmd_down() {
  check_docker
  log_info "Stopping MAMS containers..."
  $DOCKER_COMPOSE down
  log_success "All MAMS services stopped."
}

cmd_restart() {
  check_docker
  log_info "Restarting MAMS containers..."
  $DOCKER_COMPOSE restart "$@"
  wait_for_health || true
  show_access_info
}

cmd_build() {
  check_docker
  log_info "Building Docker images..."
  export DOCKER_BUILDKIT=1
  export COMPOSE_DOCKER_CLI_BUILD=1
  $DOCKER_COMPOSE build "$@"
  log_success "Build complete."
}

cmd_logs() {
  check_docker
  $DOCKER_COMPOSE logs -f "$@"
}

cmd_status() {
  check_docker
  echo -e "\n${BOLD}Container Status:${NC}"
  $DOCKER_COMPOSE ps
  
  echo -e "\n${BOLD}Health Check:${NC}"
  local port="${WEB_PORT:-8089}"
  if curl -sf "http://127.0.0.1:${port}/api/health" >/dev/null 2>&1; then
    echo -e "  API Health: ${GREEN}OK${NC} (http://localhost:${port}/api/health)"
  else
    echo -e "  API Health: ${RED}UNAVAILABLE${NC}"
  fi
}

cmd_seed() {
  check_docker
  log_info "Running seed inside API container..."
  $DOCKER_COMPOSE exec api npm run seed:users
  log_success "Seed completed successfully."
}

cmd_clean() {
  check_docker
  log_warn "Stopping containers and removing named volumes..."
  $DOCKER_COMPOSE down -v --remove-orphans
  log_success "Purged all containers and volumes."
}

cmd_help() {
  banner
  echo -e "${BOLD}Usage:${NC} ./run.sh [command] [options]"
  echo ""
  echo -e "${BOLD}Commands:${NC}"
  echo -e "  ${GREEN}up | start${NC}     Build and launch the full stack in background (default)"
  echo -e "  ${GREEN}down | stop${NC}    Stop all containers"
  echo -e "  ${GREEN}restart${NC}        Restart all services"
  echo -e "  ${GREEN}build${NC}          Rebuild container images (e.g. ./run.sh build --no-cache)"
  echo -e "  ${GREEN}logs [svc]${NC}     Stream logs (e.g. ./run.sh logs api)"
  echo -e "  ${GREEN}status | ps${NC}    Show container status and health"
  echo -e "  ${GREEN}seed${NC}           Seed initial admin credentials"
  echo -e "  ${GREEN}clean${NC}          Stop and remove containers, networks, and persistent volumes"
  echo -e "  ${GREEN}help${NC}           Show this help message"
  echo ""
}

# ------------------------------------------------------------------------------
# CLI Router
# ------------------------------------------------------------------------------
ACTION="${1:-up}"
shift || true

case "$ACTION" in
  up|start)
    cmd_up "$@"
    ;;
  down|stop)
    cmd_down
    ;;
  restart)
    cmd_restart "$@"
    ;;
  build)
    cmd_build "$@"
    ;;
  logs)
    cmd_logs "$@"
    ;;
  status|ps)
    cmd_status
    ;;
  seed)
    cmd_seed
    ;;
  clean)
    cmd_clean
    ;;
  help|-h|--help)
    cmd_help
    ;;
  *)
    log_error "Unknown command: $ACTION"
    cmd_help
    exit 1
    ;;
esac
