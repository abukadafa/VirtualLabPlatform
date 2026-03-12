import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.model';
import Booking from '../src/models/Booking.model';

dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/virtuallab');
    const users = await User.find({}, 'email role username');
    console.log('Users:', JSON.stringify(users, null, 2));

    const bookings = await Booking.find({}).populate('user', 'email');
    console.log('Bookings:', JSON.stringify(bookings, null, 2));

    await mongoose.disconnect();
}

check();
