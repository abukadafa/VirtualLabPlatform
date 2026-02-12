# Docker Lab Setup - Quick Start Guide

## Overview

This guide will help you set up the Virtual Lab Platform's Docker infrastructure on your local development machine.

## Prerequisites

- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- **16GB RAM** minimum (recommended for running 3-5 containers)
- **100GB free disk space**
- **Git** (for version control)

## Installation Steps

### Step 1: Install Docker Desktop

**Windows:**
1. Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. Run the installer
3. Restart your computer
4. Open Docker Desktop and ensure it's running

**Verify installation:**
```powershell
docker --version
docker-compose --version
```

### Step 2: Configure Environment

1. Navigate to the docker directory:
```powershell
cd "c:\Users\user\Desktop\My first App\VirtualLabPlatform\docker"
```

2. Copy the example environment file:
```powershell
copy .env.example .env
```

3. Edit `.env` and customize as needed (optional for local development)

### Step 3: Build Lab Images

This will take 30-60 minutes on first build:

```powershell
# Build all lab images
docker-compose build

# Or build individually:
docker-compose build ai-lab
docker-compose build cyber-lab
docker-compose build mis-lab
```

### Step 4: Start Guacamole Stack

```powershell
# Start database and Guacamole services
docker-compose up -d guacamole-db guacd guacamole

# Check logs to ensure services are healthy
docker-compose logs -f guacamole
```

Wait for the message: `Guacamole started successfully`

### Step 5: Initialize Guacamole Database

The database will be automatically initialized on first startup. To verify:

```powershell
docker exec -it guacamole-postgres psql -U guacamole_user -d guacamole_db -c "\dt"
```

You should see several tables (guacamole_connection, guacamole_user, etc.)

### Step 6: Access Guacamole

1. Open your browser: http://localhost:8080/guacamole
2. Login with default credentials:
   - **Username**: `guacadmin`
   - **Password**: `guacadmin`

> ⚠️ **IMPORTANT**: Change the default password immediately:
> Settings → Users → guacadmin → Change Password

### Step 7: Start a Lab Container

```powershell
# Start AI Lab
docker-compose up -d ai-lab

# Check if running
docker ps | findstr ai-lab
```

### Step 8: Configure Guacamole Connection (Manual - Temporary)

> This is a temporary manual step until we implement the backend API integration

1. In Guacamole, go to: Settings → Connections → New Connection
2. Enter details:
   - **Name**: AI Lab - Container 1
   - **Protocol**: VNC
   - **Hostname**: ai-lab-1
   - **Port**: 5901
   - **Password**: `labpassword`
3. Save

4. Click on "AI Lab - Container 1" to connect
5. You should see the XFCE desktop!

---

## Testing Your Setup

### Run Health Check

```powershell
# Make script executable (if on Linux/Mac)
# chmod +x ./scripts/health-check.sh

# Run health check
bash ./scripts/health-check.sh
```

### Test All Labs

```powershell
# Start all labs
docker-compose up -d

# Verify all containers are running
docker ps

# Check resource usage
docker stats
```

You should see:
- guacamole-postgres
- guacd
- guacamole
- ai-lab-1
- cyber-lab-1
- mis-lab-1

---

## Common Issues & Solutions

### Issue: Docker Desktop not starting
**Solution**: 
- Enable WSL 2 (Windows Settings → Windows Features → Windows Subsystem for Linux)
- Restart computer
- Check antivirus isn't blocking Docker

### Issue: "Port already in use"
**Solution**:
```powershell
# Check what's using the port
netstat -ano | findstr :8080

# Stop conflicting service or change port in docker-compose.yml
```

### Issue: Container won't start
**Solution**:
```powershell
# Check logs
docker-compose logs ai-lab

# Common fixes:
# - Increase Docker Desktop memory limit (Settings → Resources)
# - Rebuild without cache: docker-compose build --no-cache ai-lab
```

### Issue: Can't connect via Guacamole
**Solution**:
1. Verify container is running: `docker ps`
2. Check VNC is running inside container:
   ```powershell
   docker exec -it ai-lab-1 bash
   ps aux | grep vnc
   ```
3. Test VNC directly with a VNC client (connect to localhost:5901)

### Issue: Slow performance
**Solution**:
- Increase Docker Desktop resources (Settings → Resources)
- Close other applications
- Run fewer containers simultaneously

---

## Operational Scripts

### Weekly Security Updates

```powershell
# Update base images and scan for vulnerabilities
bash ./scripts/update-images.sh
```

### Daily Cleanup

```powershell
# Remove stopped containers and unused resources
bash ./scripts/cleanup.sh
```

### Backup Data

```powershell
# Hourly metadata backup (run via cron/task scheduler)
bash ./scripts/backup-metadata.sh

# Daily full backup
bash ./scripts/backup-daily.sh
```

---

## Stopping Services

### Stop Specific Lab

```powershell
docker-compose stop ai-lab
```

### Stop All Services

```powershell
docker-compose down
```

### Stop and Remove All Data (⚠️ Caution!)

```powershell
# This will delete all student workspaces!
docker-compose down -v
```

---

## Next Steps

✅ Docker infrastructure is now running locally!

**Continue with**:
1. **Phase 2B**: Backend integration (dockerode, session management)
2. **Phase 2C**: Frontend updates (Guacamole iframe integration)
3. **Phase 2D**: Monitoring setup (Prometheus/Grafana)

---

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Apache Guacamole Manual](https://guacamole.apache.org/doc/gug/)
- [Implementation Plan](../brain/implementation_plan.md)

## Support

For issues, check the health check output:
```powershell
bash ./scripts/health-check.sh
```

Review Docker logs:
```powershell
docker-compose logs -f
```
