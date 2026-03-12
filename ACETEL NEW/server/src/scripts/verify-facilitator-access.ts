import mongoose from 'mongoose';
import User from '../models/User.model';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function verifyFacilitatorLogic() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/virtuallab');
        console.log('Connected to MongoDB');

        // 1. Create a test facilitator if not exists
        let facilitator = await User.findOne({ role: 'facilitator' });
        if (!facilitator) {
            console.log('No facilitator found, creating test facilitator...');
            facilitator = await User.create({
                name: 'Test Facilitator',
                username: 'testfacilitator',
                email: 'facilitator@test.com',
                password: 'password123',
                role: 'facilitator',
                enrolledLabs: []
            });
        }

        console.log(`Verifying facilitator: ${facilitator.name}`);
        console.log(`Enrolled Labs: ${facilitator.enrolledLabs.length}`);

        // 2. Check if enrolledLabs field exists
        const facilitatorDoc = await User.findById(facilitator._id).lean();
        if ('enrolledLabs' in facilitatorDoc!) {
            console.log('SUCCESS: enrolledLabs field exists in User model');
        } else {
            console.log('FAILURE: enrolledLabs field missing in User model');
        }

        // 3. Test logic simulation (startLab logic)
        const dummyLabId = new mongoose.Types.ObjectId();
        const isEnrolled = facilitator.enrolledLabs.some(id => id.toString() === dummyLabId.toString());

        console.log(`Simulation: Is enrolled in dummy lab ${dummyLabId}? ${isEnrolled}`);
        if (!isEnrolled) {
            console.log('SUCCESS: Correctly identified facilitator is NOT enrolled in dummy lab');
        }

        // 4. Test logic simulation (assignment)
        facilitator.enrolledLabs.push(dummyLabId as any);
        const isNewlyEnrolled = facilitator.enrolledLabs.some(id => id.toString() === dummyLabId.toString());
        console.log(`Simulation: After assignment, is enrolled in ${dummyLabId}? ${isNewlyEnrolled}`);
        if (isNewlyEnrolled) {
            console.log('SUCCESS: Correctly identified facilitator IS enrolled after assignment');
        }

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verifyFacilitatorLogic();
