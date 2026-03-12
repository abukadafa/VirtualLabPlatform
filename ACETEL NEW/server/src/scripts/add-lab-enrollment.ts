import mongoose from 'mongoose';
import User from '../models/User.model';
import connectDB from '../config/database';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function migrateUsers() {
    try {
        console.log('Connecting to database for migration...');
        await connectDB();

        console.log('Adding enrolledLabs field to existing users...');
        const result = await User.updateMany(
            { enrolledLabs: { $exists: false } },
            { $set: { enrolledLabs: [] } }
        );

        console.log(`✓ Migration complete. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateUsers();
