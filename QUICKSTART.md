# Quick Start Guide

## Prerequisites
- Node.js 16+ ([Download](https://nodejs.org))
- MongoDB (local or MongoDB Atlas)
- Git (to clone/navigate to project)

## Setup (10-15 minutes)

### 1. Install MongoDB

**Option A: Local MongoDB**
1. Download: https://www.mongodb.com/try/download/community
2. Install with default settings
3. MongoDB should auto-start after installation

**Option B: Cloud (MongoDB Atlas) - Recommended**
1. Create free account: https://www.mongodb.com/atlas
2. Create a cluster (Free M0 tier)
3. Click "Connect" → "Connect your application"
4. Copy connection string (save for step 4)

### 2. Install Dependencies
```bash
# Navigate to project root
cd "c:/Users/user/Desktop/My first App/VirtualLabPlatform"

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 3. Configure Environment

**Create `server/.env` file:**
```bash
cd server
# Windows (PowerShell)
New-Item .env -ItemType File

# macOS/Linux
touch .env
```

**Add this content to `server/.env`:**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/virtuallab
JWT_SECRET=change-this-to-a-random-32-character-secret-key-for-production
NODE_ENV=development
```

**If using MongoDB Atlas**, replace `MONGODB_URI` with your connection string:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/virtuallab?retryWrites=true&w=majority
```

### 4. Start MongoDB (Local Only)

**Windows:**
```bash
net start MongoDB
# Or: Open Services and start "MongoDB" service
```

**macOS:**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

**Skip this step if using MongoDB Atlas**

### 5. Seed Database
```bash
cd server
npm run seed
```

**Expected output:**
```
✅ Connected to MongoDB
🗑️  Cleared existing labs
✅ Seeded labs successfully

📊 Lab Summary:
1. Artificial Intelligence Lab (AI) - 14 software packages
2. Cybersecurity Lab (Cybersecurity) - 17 software packages
3. Management Information Systems Lab (MIS) - 19 software packages
```

### 6. Run Application

**Terminal 1 - Start Backend:**
```bash
cd server
npm run dev
```

**Expected output:**
```
🚀 Server running on port 5000
✅ MongoDB connected successfully
```

**Terminal 2 - Start Frontend:**
```bash
cd client
npm run dev
```

**Expected output:**
```
VITE ready in XXX ms
➜ Local: http://localhost:5173
```

### 7. Access Application

Open browser: **http://localhost:5173**

## First Steps

1. **Register an account:**
   - Click "Register here"
   - Enter your details (use valid email format)
   - Choose role: `student`, `facilitator`, or `admin`
   - Submit

2. **Login** with your credentials

3. **Explore features:**
   - View three labs on dashboard
   - Click a lab card to see details
   - Click "Book Session" to schedule
   - Click "Quick Launch" for instant access
   - View bookings table

## Testing Different Roles

Create multiple accounts to test all features:

| Role | Sample Email | Capabilities |
|------|--------------|--------------|
| **Student** | student@acetel.edu | Book labs, launch sessions, view bookings |
| **Facilitator** | teacher@acetel.edu | All student features (admin portal coming in Phase 2) |
| **Admin** | admin@acetel.edu | Create/edit labs, manage users (via API currently) |

## Troubleshooting

### ❌ MongoDB Connection Failed
```bash
# Check if MongoDB is running:
# Windows
sc query MongoDB

# macOS/Linux
systemctl status mongod

# If stopped, start it (see Step 4)
```

### ❌ Port Already in Use
```bash
# Backend (port 5000):
# Edit server/.env:
PORT=5001

# Frontend (port 5173):
# Edit client/vite.config.ts and add:
export default defineConfig({
  server: { port: 3000 }
})
```

### ❌ Dependencies Missing
```bash
# Reinstall dependencies:
cd server
npm install

cd ../client
npm install
```

### ❌ Cannot Find .env File
```bash
# Make sure you're in the server folder:
cd server
pwd  # Should show: .../VirtualLabPlatform/server

# The .env file should be here (Step 3)
ls -la  # macOS/Linux
dir     # Windows
```

### ❌ CORS Errors in Browser Console
- Ensure backend is running on `http://localhost:5000`
- Ensure frontend is on `http://localhost:5173`
- Check that both servers are running

## Development URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **API Health Check:** http://localhost:5000/health
- **Test API:** http://localhost:5000/api/labs (returns lab list)

## What You Have (Phase 1 ✅)

✅ JWT authentication with role-based access  
✅ Three lab types with comprehensive software lists  
✅ Booking system with conflict detection  
✅ Modern responsive UI (React + TailwindCSS)  
✅ RESTful API (Express + MongoDB)  
✅ User dashboards  
✅ Virtual lab simulation interface  

## What's Missing (Phase 2+)

⚠️ **This is a prototype/MVP**. The following features require additional implementation:

- 🔴 **Actual VM Integration** - Currently simulated; needs Docker/cloud VMs
- 🔴 **Facilitator Portal** - Assignment creation, grading interface, student monitoring
- 🔴 **File Upload/Storage** - AWS S3 or similar for lab work submission
- 🔴 **Advanced Booking** - Calendar UI, waitlist, email notifications
- 🔴 **Analytics Dashboard** - Performance tracking, usage reports
- 🔴 **Collaboration Tools** - Real-time code sharing, video conferencing
- 🔴 **Scalability** - Load balancing, Kubernetes, Redis caching for 1000+ users

See [Phase 2 Roadmap](#phase-2-roadmap) below for details.

## Phase 2 Roadmap

To build a production-ready platform, next steps are:

### Priority 1: Virtual Desktop Infrastructure
- Integrate **Apache Guacamole** for browser-based VM access
- Create **Docker containers** with pre-installed software:
  - AI Lab: Anaconda, TensorFlow, MATLAB
  - Cyber Lab: Kali Linux, Wireshark, Metasploit
  - MIS Lab: SQL Server, Power BI, Tableau

### Priority 2: Facilitator Features
- Assignment creation and publishing
- Student work submission portal
- Grading interface with rubrics
- Automated plagiarism detection
- Real-time feedback system

### Priority 3: Scalability & Performance
- Kubernetes deployment
- Load balancer configuration
- Redis caching layer
- Auto-scaling for 1000+ concurrent users
- Database connection pooling

### Priority 4: Enhanced Features
- Visual calendar (FullCalendar.js)
- Email/SMS notifications
- File storage (AWS S3)
- Analytics dashboard
- Live collaboration tools

## Production Deployment Checklist

⚠️ **Before deploying to production:**

- [ ] Change `JWT_SECRET` to strong random 32+ character string
- [ ] Use MongoDB Atlas (not local MongoDB)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS with specific origins
- [ ] Add API rate limiting
- [ ] Implement proper logging (Winston, Morgan)
- [ ] Set up monitoring (PM2, New Relic)
- [ ] Configure automated backups
- [ ] Add DDoS protection (Cloudflare)
- [ ] Implement error tracking (Sentry)

## Need Help?

1. **Check logs:**
   - Backend: Terminal 1 output
   - Frontend: Browser Console (F12)

2. **Verify setup:**
   - MongoDB is running
   - `.env` file exists in `server/` with correct values
   - Both `npm install` completed successfully

3. **Common issues:**
   - Port conflicts → Change ports in config
   - MongoDB connection → Check connection string
   - 404 errors → Backend not running

## Next Steps

After successful setup:

1. ✅ Test all three lab types
2. ✅ Create accounts with different roles
3. ✅ Test booking and launching labs
4. ✅ Review code structure in README.md
5. 📋 Decide if you want to proceed with Phase 2 features
