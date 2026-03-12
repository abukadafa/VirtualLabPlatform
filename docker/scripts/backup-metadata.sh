#!/bin/bash
# Hourly backup script for session metadata and audit logs
# Part of the disaster recovery strategy

set -e

BACKUP_DIR="/backups/hourly"
TIMESTAMP=$(date +%Y%m%d_%H)
RETENTION_DAYS=7

echo "===== Hourly Metadata Backup ====="
echo "Timestamp: $TIMESTAMP"

# Create backup directory
mkdir -p "$BACKUP_DIR/$TIMESTAMP"

# Backup session state from MongoDB
echo "[1/3] Backing up session data..."
if command -v mongodump &> /dev/null; then
    mongodump \
        --uri="${MONGODB_URI:-mongodb://localhost:27017/virtuallab}" \
        --collection=sessions \
        --out="$BACKUP_DIR/$TIMESTAMP" \
        --quiet
    echo "✓ Sessions backed up"
else
    echo "⚠️  mongodump not found, skipping MongoDB backup"
fi

# Backup audit logs
echo "[2/3] Backing up audit logs..."
if command -v mongodump &> /dev/null; then
    mongodump \
        --uri="${MONGODB_URI:-mongodb://localhost:27017/virtuallab}" \
        --collection=auditlogs \
        --out="$BACKUP_DIR/$TIMESTAMP" \
        --quiet
    echo "✓ Audit logs backed up"
fi

# Cleanup old backups (older than RETENTION_DAYS)
echo "[3/3] Cleaning up old backups..."
find "$BACKUP_DIR" -type d -name "20*" -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
echo "✓ Cleaned backups older than $RETENTION_DAYS days"

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR/$TIMESTAMP" 2>/dev/null | cut -f1 || echo "unknown")
echo ""
echo "✓ Backup completed successfully"
echo "Size: $BACKUP_SIZE"
echo "Location: $BACKUP_DIR/$TIMESTAMP"
