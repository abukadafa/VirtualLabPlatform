#!/bin/bash
# Health check script for lab containers and Guacamole
# Can be run manually or via monitoring system

set -e

echo "===== Virtual Lab Health Check ====="
echo "Timestamp: $(date)"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    exit 1
fi
echo "✓ Docker daemon is running"

# Check Guacamole services
echo ""
echo "=== Guacamole Stack ===" 
for service in guacamole-postgres guacd guacamole; do
    if docker ps --format "{{.Names}}" | grep -q "^${service}$"; then
        STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$service" 2>/dev/null || echo "running")
        if [ "$STATUS" = "healthy" ] || [ "$STATUS" = "running" ]; then
            echo "✓ $service: $STATUS"
        else
            echo "⚠️  $service: $STATUS"
        fi
    else
        echo "❌ $service: NOT RUNNING"
    fi
done

# Check lab containers
echo ""
echo "=== Lab Containers ==="
for lab in ai-lab-1 cyber-lab-1 mis-lab-1; do
    if docker ps --format "{{.Names}}" | grep -q "^${lab}$"; then
        # Check if VNC port is listening
        VNC_PORT=$(docker port "$lab" 5901 2>/dev/null | cut -d: -f2)
        if [ -n "$VNC_PORT" ]; then
            echo "✓ $lab: Running (VNC on port $VNC_PORT)"
        else
            echo "⚠️  $lab: Running but VNC port not exposed"
        fi
        
        # Check resource usage
        CPU=$(docker stats --no-stream --format "{{.CPUPerc}}" "$lab")
        MEM=$(docker stats --no-stream --format "{{.MemUsage}}" "$lab")
        echo "  Resources: CPU=$CPU MEM=$MEM"
    else
        echo "○ $lab: Not running"
    fi
done

# Check volumes
echo ""
echo "=== Volumes ==="
for volume in guacamole-db-data ai-lab-data cyber-lab-data mis-lab-data; do
    if docker volume ls --format "{{.Name}}" | grep -q "^${volume}$"; then
        SIZE=$(docker system df -v 2>/dev/null | grep "$volume" | awk '{print $3}' || echo "unknown")
        echo "✓ $volume: $SIZE"
    else
        echo "⚠️  $volume: Missing"
    fi
done

# Check networks
echo ""\n\n echo "=== Networks ==="
if docker network ls --format "{{.Name}}" | grep -q "guacamole-network"; then
    CONTAINERS=$(docker network inspect guacamole-network --format='{{len .Containers}}')
    echo "✓ guacamole-network: $CONTAINERS containers connected"
else
    echo "❌ guacamole-network: Not found"
fi

# Overall health summary
echo ""
echo "========================================="
RUNNING=$(docker ps -q | wc -l)
TOTAL=$(docker ps -aq | wc -l)
echo "Summary: $RUNNING/$TOTAL containers running"
echo "========================================="
