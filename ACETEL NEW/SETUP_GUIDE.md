# Virtual Lab Platform - Setup Guide

## Prerequisites

Before you can test the Docker lab implementation, you need to set up the required infrastructure:

### Required Services

1. **Docker Desktop** ✅ (Already installed)
2. **MongoDB** - Database for sessions and users
3. **Redis** - Queue management
4. **Apache Guacamole** - VNC gateway

---

## Quick Start

### Step 1: Start MongoDB

```powershell
# Using Docker
docker run -d --name mongodb -p 27017:27017 mongo:latest

# Or install MongoDB locally from https://www.mongodb.com/try/download/community
```

### Step 2: Start Redis

```powershell
# Using Docker
docker run -d --name redis -p 6379:6379 redis:latest

# Or install Redis locally from https://redis.io/download
```

### Step 3: Start Apache Guacamole

Create `docker-compose.guacamole.yml`:

```yaml
version: '3'
services:
  guacd:
    image: guacamole/guacd:latest
    container_name: guacd
    networks:
      - lab-network

  guacamole-db:
    image: postgres:15
    container_name: guacamole-db
    environment:
      POSTGRES_DB: guacamole_db
      POSTGRES_USER: guacamole_user
      POSTGRES_PASSWORD: guacamole_pass
    networks:
      - lab-network

  guacamole:
    image: guacamole/guacamole:latest
    container_name: guacamole
    ports:
      - "8080:8080"
    environment:
      GUACD_HOSTNAME: guacd
      POSTGRES_HOSTNAME: guacamole-db
      POSTGRES_DATABASE: guacamole_db
      POSTGRES_USER: guacamole_user
      POSTGRES_PASSWORD: guacamole_pass
    depends_on:
      - guacd
      - guacamole-db
    networks:
      - lab-network

networks:
  lab-network:
    driver: bridge
```

Start Guacamole:

```powershell
docker-compose -f docker-compose.guacamole.yml up -d
```

### Step 4: Build Lab Docker Images

```powershell
# Navigate to docker directory
cd docker

# Build AI Lab image
docker build -t virtual-lab/ai-lab:latest ./ai-lab

# Build Cybersecurity Lab image
docker build -t virtual-lab/cyber-lab:latest ./cyber-lab

# Build MIS Lab image
docker build -t virtual-lab/mis-lab:latest ./mis-lab
```

### Step 5: Configure Environment Variables

Copy the example environment file:

```powershell
cd server
copy .env.example .env
```

Update `.env` with your settings (defaults should work):

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/virtual-lab
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Docker Resource Limits
MAX_CONCURRENT_CONTAINERS=30
CONTAINER_CPU_LIMIT=2
CONTAINER_MEM_LIMIT=4G
CONTAINER_DISK_LIMIT=20G

# Guacamole
GUAC_REST_API_URL=http://localhost:8080/guacamole/api
GUACAMOLE_ADMIN_PASSWORD=guacadmin

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Step 6: Start Backend Server

```powershell
cd server
npm run dev
```

The server will:
- Connect to MongoDB
- Connect to Redis
- Initialize background jobs
- Start listening on port 3000

### Step 7: Start Frontend

```powershell
cd client
npm run dev
```

The frontend will start on port 5173 (or 5174 if 5173 is taken).

---

## Testing the Implementation

### Test 1: Single User Session Flow

1. **Login** to the application
2. **Navigate** to a lab (AI/Cybersecurity/MIS)
3. **Click** "Launch Lab"
4. **Observe** the session states:
   - Starting spinner appears
   - Container is created
   - Guacamole connection established
   - VNC desktop appears in iframe
5. **Interact** with the lab environment
6. **Click** "End Session"
7. **Verify** container is stopped

**Expected Result**: Smooth transition through all states with working VNC desktop

### Test 2: Queue System

1. **Start** 30+ concurrent sessions from different users/browsers
2. **Verify** first 30 get containers immediately
3. **Verify** 31st user sees queue position
4. **Wait** for someone to end their session
5. **Verify** queued user automatically gets a container

**Expected Result**: Queue position updates, automatic assignment when capacity available

### Test 3: Rate Limiting

1. **Start** and **stop** a session
2. **Immediately** try to start another
3. **Verify** you see cooldown message (60 seconds)
4. **Try** to start 11 sessions rapidly
5. **Verify** 11th attempt is rate limited

**Expected Result**: Rate limiting prevents abuse

### Test 4: Session Heartbeat

1. **Start** a session
2. **Open** browser DevTools → Network tab
3. **Wait** 5 minutes
4. **Verify** you see `/api/labs/:id/extend` requests every 5 minutes

**Expected Result**: Automatic heartbeat keeps session alive

### Test 5: Idle Timeout

1. **Start** a session
2. **Wait** 15 minutes without interaction
3. **Verify** idle warning appears (check session state)
4. **Wait** another 15 minutes
5. **Verify** session is paused

**Expected Result**: Session follows idle timeout policy

---

## Troubleshooting

### Issue: "Cannot connect to Docker daemon"

**Solution**: Make sure Docker Desktop is running

```powershell
# Check Docker status
docker ps
```

### Issue: "Redis connection failed"

**Solution**: Verify Redis is running

```powershell
# Check Redis
docker ps | findstr redis

# If not running, start it
docker start redis
```

### Issue: "Guacamole authentication failed"

**Solution**: 
1. Access Guacamole at http://localhost:8080/guacamole
2. Login with `guacadmin` / `guacadmin`
3. Verify REST API is accessible

### Issue: "Container failed to start"

**Solution**: Check Docker logs

```powershell
# List containers
docker ps -a

# View logs
docker logs <container-id>
```

### Issue: "Session stuck in 'starting' state"

**Solution**: 
1. Check if Docker images are built
2. Verify container resource limits aren't too restrictive
3. Check backend logs for errors

---

## API Endpoints Reference

### Session Management

- `POST /api/labs/:id/start` - Start lab session
- `POST /api/labs/:id/stop` - Stop session
- `GET /api/labs/:id/status` - Get session status
- `GET /api/labs/:id/connection` - Get Guacamole URL
- `POST /api/labs/:id/extend` - Extend session (heartbeat)
- `GET /api/labs/queue/status` - Queue statistics

### Testing with cURL

```powershell
# Login first to get token
$token = "your-jwt-token"

# Start session
curl -X POST http://localhost:3000/api/labs/<lab-id>/start `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json"

# Get status
curl http://localhost:3000/api/labs/<lab-id>/status `
  -H "Authorization: Bearer $token"

# Stop session
curl -X POST http://localhost:3000/api/labs/<lab-id>/stop `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json"
```

---

## Next Steps

Once basic testing is complete:

1. **Performance Test**: Test with 30 concurrent users
2. **Security Test**: Verify container isolation
3. **Data Persistence**: Test volume survival after container restart
4. **Monitoring**: Set up Prometheus + Grafana (Phase 2D)
5. **Production Deploy**: Move to cloud infrastructure (AWS/Azure/GCP)

---

## Architecture Diagram

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │ HTTP
       ▼
┌─────────────┐      ┌──────────┐      ┌───────────┐
│   Backend   │─────▶│  Docker  │─────▶│ Container │
│   (Node.js) │      │  Engine  │      │  (Lab VM) │
└──────┬──────┘      └──────────┘      └─────┬─────┘
       │                                      │
       │ REST API                             │ VNC
       ▼                                      ▼
┌─────────────┐                        ┌───────────┐
│  Guacamole  │◀───────────────────────│  guacd    │
│  (Web UI)   │                        │  (Proxy)  │
└─────────────┘                        └───────────┘
       │
       │ WebSocket
       ▼
┌─────────────┐
│   Browser   │
│   (iframe)  │
└─────────────┘
```

---

## Support

For issues or questions:
1. Check backend logs: `server/logs/`
2. Check Docker logs: `docker logs <container-name>`
3. Review background job logs in terminal
4. Check MongoDB for session states
