#!/bin/bash
# Daily cleanup script for expired sessions and stopped containers
# Runs as part of resource management strategy

set -e

echo "===== Daily Cleanup Job ====="
echo "Started at: $(date)"

# Configuration
STOPPED_CONTAINER_AGE_DAYS=${SESSION_CLEANUP_DAYS:-1}

# Remove stopped lab containers older than configured days
echo ""
echo "[1/4] Removing stopped lab containers..."
REMOVED_CONTAINERS=$(docker ps -a -f "status=exited" -f "name=*-lab-*" --format "{{.ID}} {{.Names}}" | while read -r container_id container_name; do
    # Get container creation time
    created=$(docker inspect -f '{{.Created}}' "$container_id")
    created_epoch=$(date -d "$created" +%s 2>/dev/null || echo "0")
    now_epoch=$(date +%s)
    age_days=$(( (now_epoch - created_epoch) / 86400 ))
    
    if [ "$age_days" -ge "$STOPPED_CONTAINER_AGE_DAYS" ]; then
        echo "  Removing: $container_name (stopped for $age_days days)"
        docker rm "$container_id"
        echo 1
    fi
done | wc -l)

echo "✓ Removed $REMOVED_CONTAINERS stopped containers"

# Remove unused volumes (orphaned student workspaces)
echo ""
echo "[2/4] Removing unused volumes..."
REMOVED_VOLUMES=$(docker volume ls -qf "dangling=true" | wc -l)
if [ "$REMOVED_VOLUMES" -gt 0 ]; then
    docker volume prune -f
    echo "✓ Removed $REMOVED_VOLUMES unused volumes"
else
    echo "✓ No unused volumes found"
fi

# Remove unused networks
echo ""
echo "[3/4] Removing unused networks..."
REMOVED_NETWORKS=$(docker network ls -q -f "dangling=true" | wc -l)
if [ "$REMOVED_NETWORKS" -gt 0 ]; then
    docker network prune -f
    echo "✓ Removed $REMOVED_NETWORKS unused networks"
else
    echo "✓ No unused networks found"
fi

# Remove dangling images (from rebuilds)
echo ""
echo "[4/4] Removing dangling images..."
REMOVED_IMAGES=$(docker images -qf "dangling=true" | wc -l)
if [ "$REMOVED_IMAGES" -gt 0 ]; then
    docker image prune -f
    echo "✓ Removed $REMOVED_IMAGES dangling images"
else
    echo "✓ No dangling images found"
fi

# Display system resource usage
echo ""
echo "===== Docker Resource Usage ====="
docker system df

echo ""
echo "✓ Cleanup completed successfully!"
echo "Finished at: $(date)"
