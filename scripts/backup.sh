#!/bin/bash
# scripts/backup.sh
# Simple shell script to dump the PostgreSQL database and compress it.
# Schedule this with cron, e.g., `0 2 * * * /path/to/backup.sh`

set -e

DB_CONTAINER_NAME="serve-db"
DB_USER="postgres"
DB_NAME="hano_db"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Starting backup of database $DB_NAME..."

# Execute pg_dump inside the docker container
docker exec -t $DB_CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_FILE"

echo "Backup created successfully: $BACKUP_FILE"

# Optional: Clean up backups older than 7 days
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -delete
echo "Old backups cleaned up."
