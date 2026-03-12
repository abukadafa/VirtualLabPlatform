
const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let studentToken = '';
let adminToken = '';
let labId = '';
let bookingId = '';

async function runTest() {
    try {
        console.log('--- Starting Booking Approval Workflow Test ---');

        // 1. Login as Admin
        console.log('\n1. Logging in as Admin...');
        const adminRes = await axios.post(`${API_URL}/auth/login`, {
            identifier: 'admin@virtuallab.com',
            password: 'adminpassword123'
        });
        adminToken = adminRes.data.token;
        console.log('✅ Admin logged in');

        // 2. Login as Student (or create one)
        console.log('\n2. Logging in as Student...');
        try {
            const studentEmail = `student_${Date.now()}@example.com`;
            const studentRes = await axios.post(`${API_URL}/auth/login`, {
                identifier: studentEmail,
                password: 'password123'
            });
            studentToken = studentRes.data.token;
            console.log('✅ Student logged in');
        } catch (e) {
            console.log('⚠️ Student login failed, registering new student...');
            const studentEmail = `student_${Date.now()}@example.com`;
            const registerRes = await axios.post(`${API_URL}/auth/register`, {
                name: 'Test Student',
                username: 'teststudent' + Date.now(),
                email: studentEmail,
                password: 'password123',
                role: 'student'
            });
            studentToken = registerRes.data.token;
            console.log('✅ Student registered and logged in');
        }

        // 3. Get a Lab ID
        console.log('\n3. Getting a Lab...');
        const labsRes = await axios.get(`${API_URL}/labs`, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        if (labsRes.data.length === 0) throw new Error('No labs found');
        labId = labsRes.data[0]._id;
        console.log(`✅ Found Lab: ${labId}`);

        // 4. Create a Booking (Should be Pending)
        console.log('\n4. Creating a Booking (Expect Pending)...');
        const now = new Date();
        const endTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later

        const bookingRes = await axios.post(`${API_URL}/bookings`, {
            lab: labId,
            startTime: now,
            endTime: endTime,
            purpose: 'Test Booking'
        }, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });

        bookingId = bookingRes.data._id;
        if (bookingRes.data.status !== 'pending') {
            console.log('DEBUG: Full Booking Response:', JSON.stringify(bookingRes.data, null, 2));
            throw new Error(`❌ Booking status should be 'pending', but got '${bookingRes.data.status}'`);
        }
        console.log('✅ Booking created with status: Pending');

        // 5. Try to Start Lab (Should Fail)
        console.log('\n5. Trying to Start Lab with Pending Booking (Expect Failure)...');
        try {
            await axios.post(`${API_URL}/labs/${labId}/start`, {}, {
                headers: { Authorization: `Bearer ${studentToken}` }
            });
            throw new Error('❌ Lab start should have failed!');
        } catch (error) {
            if (error.response && error.response.status === 403) {
                console.log('✅ Lab start failed as expected (403 Forbidden)');
            } else {
                throw error;
            }
        }

        // 6. Admin Approves Booking
        console.log('\n6. Admin Approving Booking...');
        const updateRes = await axios.patch(`${API_URL}/bookings/${bookingId}`, {
            status: 'confirmed'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        if (updateRes.data.status !== 'confirmed') {
            throw new Error('❌ Failed to confirm booking');
        }
        console.log('✅ Booking status updated to: Confirmed');

        // 7. Try to Start Lab (Should Success - Mocked if no Docker)
        console.log('\n7. Trying to Start Lab with Confirmed Booking (Expect Success/Different Error)...');
        try {
            await axios.post(`${API_URL}/labs/${labId}/start`, {}, {
                headers: { Authorization: `Bearer ${studentToken}` }
            });
            console.log('✅ Lab started successfully');
        } catch (error) {
            // If it fails due to Docker/Session issues, that's fine, as long as it passed the 403 check
            if (error.response && error.response.status !== 403) {
                console.log(`✅ Passed Auth Check! (Failed with ${error.response.status}: ${error.response.data.message})`);
                console.log('   This confirms the booking logic allowed access.');
            } else {
                throw error;
            }
        }

        console.log('\n--- Test Completed Successfully ---');

    } catch (error) {
        console.error('\n❌ Test Failed:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

runTest();
