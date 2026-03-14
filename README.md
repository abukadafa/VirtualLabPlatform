# Virtual Laboratory Platform

A virtual laboratory platform for ACETEL postgraduate students with booking, technician approval, AWS or local VM provisioning, and in-browser terminal access for local labs.

## Features

- **Authentication and RBAC**: JWT-based authentication with role and permission checks.
- **Programme-aware labs**: AI, Cybersecurity, and MIS lab visibility based on enrolment.
- **Booking workflow**: students submit booking requests, technicians/admins approve or reject them.
- **Separate provisioning step**: approved bookings can be provisioned as either `aws` or `local`.
- **Local VM provisioning**: technician enters template, VM resources, credentials, and expiry; the backend can call Proxmox to provision the VM.
- **AWS launch flow**: technician stores an AWS launch URL and the student launches directly from the dashboard.
- **Browser terminal for local labs**: local provisioned bookings can open an in-site SSH terminal through WebSocket + SSH.
- **Extension workflow**: students can request extensions; technicians approve or reject them.
- **Lifecycle cleanup**: local VMs are shut down at expiry and hard-deleted after the configured grace period.
- **Admin settings**: branding, SMTP, storage, and Proxmox/VPN configuration from the settings page.
- **Monitoring and submissions**: assignment submission, grading, feedback, and system monitoring screens.

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- MongoDB + Mongoose
- JWT for authentication
- bcrypt for password hashing
- `ws` + `ssh2` for browser terminal access
- Axios for Proxmox API calls

### Frontend
- React + TypeScript + Vite
- React Router for navigation
- TailwindCSS for styling
- Lucide React for icons
- `@xterm/xterm` for the in-browser terminal

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
- Reachability from the app server to the local VM network if you plan to use local provisioning

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

Recommended additions for production:
```
ALLOWED_ORIGINS=http://localhost:5173
GUACAMOLE_BASE_URL=http://localhost:8080
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

## Provisioning Setup

### Admin Settings

After logging in as an admin, open the Settings page and configure:

- `Proxmox API URL`
- `Node Name`
- `Realm`
- `API Token ID`
- `API Token Secret`
- `Storage`
- `Network Bridge`
- `Default Template`
- `Cleanup Grace Days`
- `Terminal Mode`
- optional VPN/private-routing fields

These values are stored in the `proxmox` system settings record and are used by the local provisioning flow.

### Booking and Provisioning Flow

1. Student submits a booking request.
2. Technician or admin approves or rejects the booking.
3. After approval, the technician provisions the booking:
   - `aws`: store the AWS launch URL and mark it provisioned
   - `local`: enter template, VM ID, CPU, memory, disk, SSH details, expiry, and mark it provisioned
4. For local provisioning, the backend can submit the Proxmox clone request.
5. Student launches:
   - `aws`: redirected to the AWS URL
   - `local`: opens the browser terminal page inside the platform
6. If a student requests an extension, the technician reviews it.
7. When the local VM reaches `expiresAt`, it is shut down automatically.
8. When `deletionScheduledAt` is reached, the VM is hard-deleted.

### Local Terminal Requirements

The browser terminal works like this:

1. The browser connects to this platform over HTTPS.
2. The frontend opens a WebSocket to `/ws/terminal`.
3. The backend validates the JWT and booking.
4. The backend opens an SSH session to the provisioned local VM.
5. Terminal output is streamed back to the browser.

Because of this, the application server must be able to reach the VM IP and SSH port.

### VPN vs Public IP

The platform does **not** require every VM to have a public IP.

Recommended network model:

- Keep student VMs on a private Proxmox bridge or VLAN.
- Give the application server or terminal gateway private access to that VM network.
- Use VPN, routed private connectivity, or a bastion if direct private routing is not available.
- Expose only the main web application publicly.

A public IP on the Proxmox host does **not** automatically mean every VM inside it will get a public IP. That depends on your Proxmox network design and IP assignment.

If you do choose direct public access for VMs, the browser terminal still works, but it is usually less secure than keeping the VM network private and routing SSH through the application backend.

## Usage

1. Register or create users with the required roles.
2. Log in as a student and submit a booking request.
3. Log in as a technician or admin and review the booking.
4. Approve the booking, then provision it as `aws` or `local`.
5. For local bookings, confirm the VM details and expiry.
6. Student launches the lab:
   - AWS opens the external launch page
   - Local opens the browser terminal
7. Student can request an extension from booking history.
8. Technician reviews the extension request.

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
- `GET /api/bookings` - Get all bookings (Admin/Technician/Facilitator by permission)
- `PATCH /api/bookings/:id` - Update approval, provisioning, expiry, or extension review
- `PATCH /api/bookings/:id/request-extension` - Student requests extension
- `PATCH /api/bookings/:id/request-instance` - Student requests provisioning
- `PATCH /api/bookings/:id/grant-instance` - Technician provisions access
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

- Local provisioning uses a Proxmox service scaffold and may require adjustment to match your exact Proxmox template and clone API conventions.
- The browser terminal currently assumes password-based SSH using the stored VM credentials.
- For production, move away from storing raw passwords where possible and prefer rotated credentials or short-lived access.
- For production, keep the VM network private and route traffic from the app server over VPN/private networking or a bastion host.
- AWS teardown automation is not implemented yet.
- Scale database and add caching or queues for heavier provisioning workloads.

## Development

To add new features:
1. Backend: Add model → controller → route
2. Frontend: Create component/page → add to router
3. Update API calls with authentication headers

## License

MIT
