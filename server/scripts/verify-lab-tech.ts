import mongoose from 'mongoose';
import User from '../src/models/User.model';
import Role from '../src/models/Role.model';

const verify = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/virtuallab';
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB');

        const roles = await Role.find({});
        console.log('All Roles:', roles.map(r => r.name));

        const labTechRole = await Role.findOne({ name: 'lab technician' });
        console.log('Lab Technician Role Found:', !!labTechRole);

        const labTechUsers = await User.find({ role: 'lab technician' });
        console.log('Lab Technician Users count:', labTechUsers.length);
        labTechUsers.forEach(u => {
            console.log(`User: ${u.username}, Email: ${u.email}, Status: ${u.status}`);
        });

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
    }
};

verify();
