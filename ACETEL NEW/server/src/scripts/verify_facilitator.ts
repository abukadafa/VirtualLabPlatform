import axios from 'axios';
import * as fs from 'fs';

const LOG_FILE = 'verification_log.txt';
function log(msg: string) {
    console.log(msg);
    try {
        fs.appendFileSync(LOG_FILE, msg + '\n');
    } catch (e) {
        // ignore
    }
}

const API_URL = 'http://localhost:5000/api';
let adminToken: string;
let facilitatorToken: string;
let facilitatorId: string;

const adminCredentials = {
    identifier: 'admin',
    password: 'Welcome123',
    role: 'admin'
};

const facilitatorCredentials = {
    name: 'Test Facilitator',
    username: 'testfacilitator_' + Date.now(),
    email: 'testfacilitator_' + Date.now() + '@example.com',
    password: 'Welcome123',
    role: 'facilitator',
    programme: 'Management Information System'
};

async function runVerification() {
    try {
        fs.writeFileSync(LOG_FILE, '--- Starting Verification ---\n');
        log('--- Starting Verification ---');

        // 1. Login as Admin
        try {
            log('1. Logging in as Admin...');
            const adminLogin = await axios.post(`${API_URL}/auth/login`, adminCredentials);
            adminToken = adminLogin.data.token;
            log('   Admin logged in successfully.');
        } catch (e: any) {
            log('   Failed to login as admin: ' + JSON.stringify(e.response?.data || e.message));
            log('   Attempting to create a new unique admin...');
            // Create a unique admin to ensure we can proceed
            try {
                const uniqueAdminName = 'admin_' + Date.now();
                const createAdmin = await axios.post(`${API_URL}/auth/register`, {
                    name: 'Admin User',
                    username: uniqueAdminName,
                    email: uniqueAdminName + '@example.com',
                    password: 'Welcome123',
                    role: 'admin'
                });
                adminToken = createAdmin.data.token;
                log(`   New Admin (${uniqueAdminName}) created and logged in.`);
            } catch (createErr: any) {
                log('   Failed to create unique admin: ' + JSON.stringify(createErr.response?.data || createErr.message));
                process.exit(1);
            }
        }

        // 2. Create Facilitator
        log('2. Creating Facilitator with programme MIS...');
        try {
            const createFacilitator = await axios.post(`${API_URL}/users`, facilitatorCredentials, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            facilitatorId = createFacilitator.data._id;
            log(`   Facilitator created. ID: ${facilitatorId}`);
        } catch (e: any) {
            log('   Failed to create facilitator: ' + JSON.stringify(e.response?.data || e.message));
            process.exit(1);
        }

        // 3. Login as Facilitator
        log('3. Logging in as Facilitator...');
        const facilitatorLogin = await axios.post(`${API_URL}/auth/login`, {
            identifier: facilitatorCredentials.username,
            password: facilitatorCredentials.password,
            role: 'facilitator'
        });
        facilitatorToken = facilitatorLogin.data.token;
        log('   Facilitator logged in.');

        // 4. Check Labs visibility (MIS)
        log('4. Checking Labs visibility (Expect MIS labs)...');
        const labsResponse1 = await axios.get(`${API_URL}/labs`, {
            headers: { Authorization: `Bearer ${facilitatorToken}` }
        });
        const misLabs = labsResponse1.data;
        log(`   Found ${misLabs.length} labs.`);
        misLabs.forEach((l: any) => {
            if (l.type !== 'MIS') log(`   ERROR: Found non-MIS lab: ${l.name} (${l.type})`);
            else log(`   - ${l.name} (${l.type})`);
        });

        // 5. Update Facilitator Programme to AI
        log('5. Updating Facilitator Programme to Artificial Intelligence...');
        await axios.put(`${API_URL}/users/${facilitatorId}`, {
            programme: 'Artificial Intelligence'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        log('   Facilitator updated.');

        // 6. Re-login
        log('6. Re-logging in Facilitator to refresh token claims...');
        const facilitatorLogin2 = await axios.post(`${API_URL}/auth/login`, {
            identifier: facilitatorCredentials.username,
            password: facilitatorCredentials.password,
            role: 'facilitator'
        });
        facilitatorToken = facilitatorLogin2.data.token;
        log('   Facilitator re-logged in.');

        // 7. Check Labs visibility (AI)
        log('7. Checking Labs visibility (Expect AI labs)...');
        const labsResponse2 = await axios.get(`${API_URL}/labs`, {
            headers: { Authorization: `Bearer ${facilitatorToken}` }
        });
        const aiLabs = labsResponse2.data;
        log(`   Found ${aiLabs.length} labs.`);
        aiLabs.forEach((l: any) => {
            if (l.type !== 'AI') log(`   ERROR: Found non-AI lab: ${l.name} (${l.type})`);
            else log(`   - ${l.name} (${l.type})`);
        });

        log('--- Verification Complete ---');
    } catch (error: any) {
        log('Verification failed: ' + JSON.stringify(error.response?.data || error.message));
    }
}

runVerification();
