# Virtual Laboratory Platform

A comprehensive cloud-based virtual laboratory platform for ACETEL postgraduate students with specialized labs for AI, Cybersecurity, and MIS.

## Features

- 🔐 **Authentication System** - JWT-based auth with role-based access (Student, Facilitator, Admin)
- 🧪 **Two Specialized Labs**:
  - Artificial Intelligence Lab
  - Cybersecurity Lab  

- 📅 **Lab Booking System** - Schedule and manage lab sessions
- 💻 **Virtual Lab Environment** - Simulated desktop interface
- 📊 **Dashboard** - View available labs, bookings, and statistics
- 🎨 **Modern UI** - Built with React, TailwindCSS, and responsive design

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- MongoDB + Mongoose
- JWT for authentication
- bcrypt for password hashing

### Frontend
- React + TypeScript + Vite
- React Router for navigation
- TailwindCSS for styling
- Lucide React for icons

- Lucide React for icons

## Development Setup

You can run the project either via Docker (recommended) or manually on your local machine.

### Option 1: Docker Development (Recommended)

1. **Prerequisites**
   - Docker Desktop installed and running

2. **Start the Application**
   ```bash
   cd docker
   docker compose -f docker-compose.dev.yml up --build
   ```

3. **Seed the Database** (Run in a new terminal)
   - This populates the database with default users and labs.
   ```bash
   docker exec -it virtuallab-server npm run seed
   ```

4. **Access Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

### Option 2: Local Manual Setup

#### Prerequisites
- Node.js (v16+)
- MongoDB (local or cloud instance)

#### Installation

1. **Clone & navigate to project**
```bash
cd "c:/Users/user/Desktop/My first App/VirtualLabPlatform"
```

2. **Setup Backend**
```bash
cd server
npm install
```

3. **Setup Frontend**
```bash
cd ../client
npm install
```

4. **Configure Environment**

Edit `server/.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/virtuallab
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
```

5. **Seed Database** (populate labs)
```bash
cd server
npm run seed
```

6. **Start Development Servers**

Terminal 1 - Backend:
```bash
cd server
npm run dev
```

Terminal 2 - Frontend:
```bash
cd client
npm run dev
```

7. **Access Application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Usage

1. **Register** a new account (choose role: student/facilitator/admin)
2. **Login** with your credentials
3. **Browse Labs** on the dashboard
4. **Click on a lab** to view details and software
5. **Book or Launch** a lab session
6. View **bookings** and manage sessions

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Labs
- `GET /api/labs` - Get all active labs
- `GET /api/labs/:id` - Get lab by ID
- `POST /api/labs` - Create lab (Admin only)
- `PUT /api/labs/:id` - Update lab (Admin only)
- `DELETE /api/labs/:id` - Delete lab (Admin only)

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/my-bookings` - Get user's bookings
- `GET /api/bookings` - Get all bookings (Admin/Facilitator)
- `PATCH /api/bookings/:id/cancel` - Cancel booking

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID (Admin/Facilitator)
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)

## Project Structure

```
VirtualLabPlatform/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── context/       # Auth context
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utility functions
│   │   └── App.tsx        # Main app with routing
│   └── package.json
├── server/                # Node.js backend
│   ├── src/
│   │   ├── config/       # Database config
│   │   ├── controllers/  # Request handlers
│   │   ├── middleware/   # Auth middleware
│   │   ├── models/       # Mongoose models
│   │   ├── routes/       # API routes
│   │   ├── scripts/      # Utility scripts
│   │   └── index.ts      # Server entry
│   └── package.json
└── README.md
```

## Notes

- This is a **prototype/demo version**
- Virtual lab environments are **simulated** (not actual VMs)
- For production deployment, integrate with cloud VM providers (AWS, Azure, GCP)
- Implement proper security measures for production use
- Scale database and add caching (Redis) for performance

## Development

To add new features:
1. Backend: Add model → controller → route
2. Frontend: Create component/page → add to router
3. Update API calls with authentication headers

## License

MIT
