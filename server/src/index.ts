import express, { Application } from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/database';
import authRoutes from './routes/auth.routes';
import labRoutes from './routes/lab.routes';
import bookingRoutes from './routes/booking.routes';
import userRoutes from './routes/user.routes';
import submissionRoutes from './routes/submission.routes';
import assignmentRoutes from './routes/assignment.routes';
import settingsRoutes from './routes/settings.routes';
import roleRoutes from './routes/role.routes';
import monitoringRoutes from './routes/monitoring.routes';
import path from 'path';
import { initNotifications } from './services/notification.service';
import resourceManagerService from './services/resource-manager.service';
import { apiRateLimit, authRateLimit } from './middleware/rate-limit.middleware';
import cron from 'node-cron';
import securityService from './services/security.service';
import terminalGatewayService from './services/terminal-gateway.service';
import backgroundJobs from './services/background-jobs.service';
import bookingLifecycleService from './services/booking-lifecycle.service';
import localProvisioningQueueService from './services/local-provisioning-queue.service';

dotenv.config();

// Initialize services
initNotifications();
resourceManagerService.init();
backgroundJobs.start();
bookingLifecycleService.start();
localProvisioningQueueService.init();

// Schedule Security Audit - Every Sunday at midnight (0 0 * * 0)
cron.schedule('0 0 * * 0', async () => {
    console.log('⏰ Running scheduled system maintenance...');
    await securityService.runDependencyAudit();
});

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "frame-src": ["'self'", "*"], // Allow iframes for lab connections
            "img-src": ["'self'", "data:", "*"],
        },
    },
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// app.use('/api', apiRateLimit); 
// app.use('/api/auth', authRateLimit);

// Routes
console.log('Registering routes...');
app.use('/api/auth', authRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/monitoring', monitoringRoutes);
console.log('Routes registered.');

// Health check
app.get('/health', (req, res) => {
    console.log('Health check requested');
    res.json({ status: 'OK', message: 'Virtual Lab Platform API is running' });
});

// Connect to database
console.log('Connecting to DB...');
connectDB().then(() => {
    console.log('DB connection attempted');
}).catch((error) => {
    console.error('Failed to connect to database:', error);
});

// Start server
console.log('Starting app listen...');

// 404 Handler - Must be after all routes
app.use((req, res) => {
    res.status(404).json({
        message: `Route ${req.originalUrl} not found`,
    });
});

// Global Error Handler - Must be last
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err : undefined,
    });
});

const server = http.createServer(app);
terminalGatewayService.initialize(server);

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
