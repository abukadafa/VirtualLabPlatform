import express, { Application } from 'express';
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

dotenv.config();

// Initialize services
initNotifications();
resourceManagerService.init();

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
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
