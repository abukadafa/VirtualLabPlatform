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
import facilitatorRoutes from './routes/facilitator.routes';
import monitoringRoutes from './routes/monitoring.routes';
import academicEventRoutes from './routes/academicEvent.routes';
import shortCourseRoutes from './routes/shortCourse.routes';
import { initNotifications } from './services/notification.service';
import { apiRateLimit, authRateLimit } from './middleware/rate-limit.middleware';

// Environment Validation (D6)
const validateEnv = () => {
    const required = ['JWT_SECRET', 'MONGODB_URI'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error(`❌ CRITICAL ERROR: Missing environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }
};

dotenv.config();
validateEnv();

// Initialize services
initNotifications();

// Register Tier 2 Automation Hooks (D10)
import automationService from './services/automation.service';
automationService.registerHook('lab_deprovision', async (data) => {
    console.log(`[Automation] Cleaning up lab environment for user: ${data.userId}`);
    // Additional cleanup logic (e.g., wiping temp storage) can be added here
});

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet());
/**
 * CORS Configuration:
 * In production, we restrict origins to the specific frontend domain 
 * defined in CORS_ORIGIN to prevent unauthorized cross-origin requests.
 */
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.CORS_ORIGIN
        : true, // Allow all in dev, specific origin in prod
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply rate limiters
app.use('/api', apiRateLimit); // Removed trailing slash
app.use('/api/auth', authRateLimit);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/facilitators', facilitatorRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/academic-events', academicEventRoutes);
app.use('/api/short-courses', shortCourseRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Virtual Lab Platform API is running' });
});

// Connect to database and start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}).catch((error) => {
    console.error('Failed to connect to database:', error);
    process.exit(1);
});

// Graceful Shutdown (D8)
const shutdown = () => {
    console.log('Stopping server gracefully...');
    // Add additional cleanup logic here if needed (e.g., closing Redis, DB)
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
