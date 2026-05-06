#!/bin/bash
# OptiVision Database Backup Script
# Usage: ./scripts/backup.sh

set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ─── Helpers ──────────────────────────────────────────────────────────────────
log_info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# ─── Cleanup on failure ───────────────────────────────────────────────────────
BACKUP_PATH=""
cleanup_on_error() {
  if [ -n "$BACKUP_PATH" ] && [ -f "$BACKUP_PATH" ]; then
    log_warn "Removing incomplete backup file..."
    rm -f "$BACKUP_PATH"
  fi
  log_error "Backup failed."
  exit 1
}
trap cleanup_on_error ERR

# ─── Load environment ─────────────────────────────────────────────────────────
if [ -f ".env" ]; then
  source .env
  log_info "Loaded .env file."
else
  log_warn ".env file not found, using defaults."
fi

# ─── Config ───────────────────────────────────────────────────────────────────
DB_URL="${DATABASE_URL:-postgresql://postgres:password@localhost:5432/optivision}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
FILENAME="optivision_backup_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${FILENAME}"
MAX_BACKUPS=10

# ─── Check dependencies ───────────────────────────────────────────────────────
if ! command -v pg_dump &>/dev/null; then
  log_error "pg_dump is not installed or not in PATH."
  exit 1
fi

# ─── Check DB connectivity ────────────────────────────────────────────────────
log_info "Checking database connection..."
if ! psql "$DB_URL" -c '\q' &>/dev/null; then
  log_error "Cannot connect to the database. Check your DATABASE_URL."
  exit 1
fi
log_success "Database connection OK."

# ─── Create backup directory ──────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR" || {
  log_error "Failed to create backup directory: $BACKUP_DIR"
  exit 1
}

# ─── Run backup ───────────────────────────────────────────────────────────────
log_info "Creating backup: $BACKUP_PATH"
pg_dump "$DB_URL" -F p --clean --if-exists -f "$BACKUP_PATH"
log_success "Backup complete: $BACKUP_PATH"

# ─── Verify backup file is not empty ─────────────────────────────────────────
if [ ! -s "$BACKUP_PATH" ]; then
  log_error "Backup file is empty, something went wrong."
  rm -f "$BACKUP_PATH"
  exit 1
fi

FILESIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
log_info "Backup size: $FILESIZE"

# ─── Rotate old backups ───────────────────────────────────────────────────────
BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/*.sql 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
  log_info "Rotating old backups (keeping last $MAX_BACKUPS)..."
  ls -t "${BACKUP_DIR}"/*.sql | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
  log_success "Old backups removed."
else
  log_info "No rotation needed ($BACKUP_COUNT/$MAX_BACKUPS backups stored)."
fi
