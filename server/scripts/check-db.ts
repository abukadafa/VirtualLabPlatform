import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.model';
import Booking from '../src/models/Booking.model';
import Role from '../src/models/Role.model';

dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/virtuallab');
    
    const roles = await Role.find({});
    console.log('Roles:', JSON.stringify(roles, null, 2));

    const users = await User.find({}, 'email role username status password');
    console.log('Users:', JSON.stringify(users.map(u => ({
        username: u.username,
        email: u.email,
        role: u.role,
        status: u.status,
        hasPassword: !!u.password,
        passwordPreview: u.password?.substring(0, 10)
    })), null, 2));

    const bookings = await Booking.find({}).populate('user', 'email');
    console.log('Bookings:', JSON.stringify(bookings, null, 2));

    await mongoose.disconnect();
}

check();
