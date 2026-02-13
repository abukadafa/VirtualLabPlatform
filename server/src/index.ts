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
import { initNotifications } from './services/notification.service';
import { apiRateLimit, authRateLimit } from './middleware/rate-limit.middleware';

dotenv.config();

// Initialize services
initNotifications();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet());
app.use(cors());
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

export default app;
