#!/bin/bash
# Daily full volume backup script
# Part of the disaster recovery strategy

set -e

BACKUP_DIR="/backups/daily"
TIMESTAMP=$(date +%Y%m%d)
RETENTION_DAYS=30

echo "===== Daily Full Backup ====="
echo "Date: $TIMESTAMP"

# Create backup directory
mkdir -p "$BACKUP_DIR/$TIMESTAMP/volumes"
mkdir -p "$BACKUP_DIR/$TIMESTAMP/database"

# Backup Docker volumes
echo ""
echo "[1/2] Backing up Docker volumes..."
for volume in ai-lab-data cyber-lab-data mis-lab-data; do
    echo "  Backing up $volume..."
    docker run --rm \
        -v "$volume":/data \
        -v "$BACKUP_DIR/$TIMESTAMP/volumes":/backup \
        ubuntu tar czf "/backup/${volume}.tar.gz" /data
    echo "  ✓ $volume backed up"
done

# Backup MongoDB database
echo ""
echo "[2/2] Backing up MongoDB database..."
if command -v mongodump &> /dev/null; then
    mongodump \
        --uri="${MONGODB_URI:-mongodb://localhost:27017/virtuallab}" \
        --out="$BACKUP_DIR/$TIMESTAMP/database" \
        --gzip \        --quiet
    echo "✓ Database backed up"
else
    echo "⚠️  mongodump not found, skipping database backup"
fi

# Cleanup old backups
echo ""
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -type d -name "20*"  -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true

# Calculate total backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR/$TIMESTAMP" 2>/dev/null | cut -f1 || echo "unknown")

echo ""
echo "✓ Full backup completed!"
echo "Size: $BACKUP_SIZE"
echo "Location: $BACKUP_DIR/$TIMESTAMP"

# Optional: Sync to cloud storage (uncomment if using AWS S3)
# if [ "$NODE_ENV" = "production" ] && command -v aws &> /dev/null; then
#     echo ""
#     echo "Syncing to S3..."
#     aws s3 sync "$BACKUP_DIR/$TIMESTAMP" "s3://virtuallab-backups/$TIMESTAMP" \
#         --storage-class STANDARD_IA
#     echo "✓ Synced to cloud storage"
# fi
