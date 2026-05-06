#!/bin/bash
# OptiVision Database Restore Script
# Usage: ./scripts/restore.sh backups/optivision_backup_20240101_120000.sql

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

# ─── Error trap ───────────────────────────────────────────────────────────────
trap 'log_error "Restore failed unexpectedly at line $LINENO."' ERR

# ─── Load environment ─────────────────────────────────────────────────────────
if [ -f ".env" ]; then
  source .env
  log_info "Loaded .env file."
else
  log_warn ".env file not found, using defaults."
fi

# ─── Config ───────────────────────────────────────────────────────────────────
DB_URL="${DATABASE_URL:-postgresql://postgres:password@localhost:5432/optivision}"
BACKUP_FILE="${1:-}"

# ─── Check dependencies ───────────────────────────────────────────────────────
if ! command -v psql &>/dev/null; then
  log_error "psql is not installed or not in PATH."
  exit 1
fi

# ─── Validate input ───────────────────────────────────────────────────────────
if [ -z "$BACKUP_FILE" ]; then
  log_error "No backup file specified."
  echo ""
  echo "  Usage: $0 <backup_file.sql>"
  echo ""
  echo "  Available backups:"
  if ls backups/*.sql &>/dev/null; then
    ls -lht backups/*.sql | awk '{print "   " $9 "  (" $5 ")"}'
  else
    echo "    No backups found in ./backups/"
  fi
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  log_error "File not found: $BACKUP_FILE"
  exit 1
fi

if [ ! -s "$BACKUP_FILE" ]; then
  log_error "Backup file is empty: $BACKUP_FILE"
  exit 1
fi

# ─── Check DB connectivity ────────────────────────────────────────────────────
log_info "Checking database connection..."
if ! psql "$DB_URL" -c '\q' &>/dev/null; then
  log_error "Cannot connect to the database. Check your DATABASE_URL."
  exit 1
fi
log_success "Database connection OK."

# ─── Confirm ─────────────────────────────────────────────────────────────────
FILESIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo ""
log_warn "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_warn "  This will WIPE and REPLACE the current database!"
log_warn "  File : $BACKUP_FILE ($FILESIZE)"
log_warn "  DB   : $DB_URL"
log_warn "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -rp "  Type 'yes' to confirm: " confirm
echo ""

if [ "$confirm" != "yes" ]; then
  log_info "Restore cancelled."
  exit 0
fi

# ─── Run restore ──────────────────────────────────────────────────────────────
log_info "Restoring from: $BACKUP_FILE"
psql "$DB_URL" -v ON_ERROR_STOP=1 < "$BACKUP_FILE"
log_success "Restore complete."
