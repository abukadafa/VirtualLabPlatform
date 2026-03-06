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
app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
});
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
