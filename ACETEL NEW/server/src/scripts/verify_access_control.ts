import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import User from '../models/User.model';
import Lab from '../models/Lab.model';
import Assignment from '../models/Assignment.model';

dotenv.config();

const API_URL = 'http://localhost:5000/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtuallab';

async function runVerification() {
    console.log('🚀 Starting Access Control Verification for Assignments...');

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Setup Data
        console.log('🛠️  Setting up test data...');

        // Clear previous test data (safely?)
        // Ideally we don't wipe the whole DB, just unique test entities
        // ensure unique prefix
        const prefix = "test_verify_";
        await Assignment.deleteMany({ title: { $regex: `^${prefix}` } });
        await User.deleteMany({ username: { $regex: `^${prefix}` } });
        await Lab.deleteMany({ name: { $regex: `^${prefix}` } });

        // Create Labs
        const labA = await Lab.create({
            name: `${prefix}Lab_A`,
            type: 'AI',
            description: 'Test Lab A',
            status: 'active',
            software: ['Python'],
            capacity: 10
        });

        const labB = await Lab.create({
            name: `${prefix}Lab_B`,
            type: 'Cybersecurity',
            description: 'Test Lab B',
            status: 'active',
            software: ['Nmap'],
            capacity: 10
        });

        // Create Assignments
        const assignmentA = await Assignment.create({
            title: `${prefix}Assignment_A`,
            course: new mongoose.Types.ObjectId(), // Dummy Course ID
            lab: labA._id,
            description: 'Test A',
            deadline: new Date(Date.now() + 86400000),
            isLocked: false
        });

        const assignmentB = await Assignment.create({
            title: `${prefix}Assignment_B`,
            course: new mongoose.Types.ObjectId(), // Dummy Course ID
            lab: labB._id,
            description: 'Test B',
            deadline: new Date(Date.now() + 86400000),
            isLocked: false
        });

        // Create Users
        const adminUser = await User.create({
            name: `${prefix}Admin`,
            username: `${prefix}admin`,
            email: `${prefix}admin@test.com`,
            password: 'password123',
            role: 'admin',
            status: 'enrolled'
        });

        const facilitatorUser = await User.create({
            name: `${prefix}Facilitator`,
            username: `${prefix}facilitator`,
            email: `${prefix}facilitator@test.com`,
            password: 'password123',
            role: 'facilitator',
            status: 'enrolled',
            enrolledLabs: [labA._id] // Only enrolled in Lab A
        });

        const studentUser = await User.create({
            name: `${prefix}Student`,
            username: `${prefix}student`,
            email: `${prefix}student@test.com`,
            password: 'password123',
            role: 'student',
            status: 'enrolled'
        });

        console.log('✅ Test data created.');

        // 2. Authenticate Users to get Tokens
        // We can't easily use the login endpoint if the server is running separately unless we know the exact seeding.
        // But we just created users in the DB the server is using.
        // So we can hit the login endpoint!

        async function getToken(email: string, password: string) {
            try {
                const res = await axios.post(`${API_URL}/auth/login`, {
                    identifier: email,
                    password: password
                });
                return res.data.token;
            } catch (error: any) {
                console.error(`❌ Login failed for ${email}:`, error.response?.data?.message || error.message);
                throw error;
            }
        }

        const adminToken = await getToken(adminUser.email, 'password123');
        const facilitatorToken = await getToken(facilitatorUser.email, 'password123');
        const studentToken = await getToken(studentUser.email, 'password123');

        console.log('✅ Tokens acquired.');

        // 3. Verify Access - STUDENT (Should be DENIED)
        console.log('\n🧪 Testing Student Access (Should be 403)...');
        try {
            await axios.get(`${API_URL}/assignments/lab/all`, {
                headers: { Authorization: `Bearer ${studentToken}` }
            });
            console.error('❌ FAIL: Student was able to access the endpoint!');
        } catch (error: any) {
            if (error.response?.status === 403) {
                console.log('✅ PASS: Student received 403 Forbidden.');
            } else {
                console.error(`❌ FAIL: Expected 403, got ${error.response?.status}`);
            }
        }

        // 4. Verify Access - ADMIN (Should see ALL)
        console.log('\n🧪 Testing Admin Access (Should see ALL)...');
        try {
            const res = await axios.get(`${API_URL}/assignments/lab/all`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            const titles = res.data.map((a: any) => a.title);
            const hasA = titles.includes(assignmentA.title);
            const hasB = titles.includes(assignmentB.title);

            if (hasA && hasB) {
                console.log(`✅ PASS: Admin sees both assignments. (Total: ${res.data.length})`);
            } else {
                console.error('❌ FAIL: Admin missing assignments.', titles);
            }
        } catch (error: any) {
            console.error('❌ FAIL: Admin request failed:', error.message);
        }

        // 5. Verify Access - FACILITATOR (Should see ONLY A)
        console.log('\n🧪 Testing Facilitator Access (Should see ONLY Lab A)...');
        try {
            const res = await axios.get(`${API_URL}/assignments/lab/all`, {
                headers: { Authorization: `Bearer ${facilitatorToken}` }
            });
            const titles = res.data.map((a: any) => a.title);
            const hasA = titles.includes(assignmentA.title);
            const hasB = titles.includes(assignmentB.title);

            if (hasA && !hasB) {
                console.log(`✅ PASS: Facilitator sees Assignment A and NOT Assignment B.`);
            } else {
                console.error('❌ FAIL: Facilitator access incorrect.', titles);
                if (!hasA) console.error('   - Missing Assignment A (should have access)');
                if (hasB) console.error('   - Sees Assignment B (should NOT have access)');
            }
        } catch (error: any) {
            console.error('❌ FAIL: Facilitator request failed:', error.message);
        }

        // Cleanup
        console.log('\n🧹 Cleaning up...');
        await Assignment.deleteMany({ title: { $regex: `^${prefix}` } });
        await User.deleteMany({ username: { $regex: `^${prefix}` } });
        await Lab.deleteMany({ name: { $regex: `^${prefix}` } });
        console.log('✅ Cleanup complete.');

    } catch (error) {
        console.error('❌ Global Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

runVerification();
