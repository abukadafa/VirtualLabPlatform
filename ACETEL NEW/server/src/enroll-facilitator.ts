
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.model';
import Lab from './models/Lab.model';

dotenv.config();

async function enrollFacilitator() {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtuallab';
        await mongoose.connect(mongoURI);

        const email = 'abukadafa@yahoo.com';
        const user = await User.findOne({ email });

        if (!user) {
            console.log('User not found');
            return;
        }

        // Map programme names to lab types correctly
        const programmeMapiing: { [key: string]: string } = {
            'Artificial Intelligence': 'AI',
            'Cybersecurity': 'Cybersecurity',
            'Management Information System': 'MIS'
        };

        const labTypes = user.programmes.map(p => programmeMapiing[p] || p);
        const labs = await Lab.find({ type: { $in: labTypes } });
        const labIds = labs.map(l => l._id);

        user.enrolledLabs = labIds;
        await user.save();

        console.log(`Successfully enrolled ${user.name} in ${labIds.length} labs: ${labs.map(l => l.name).join(', ')}`);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

enrollFacilitator();
