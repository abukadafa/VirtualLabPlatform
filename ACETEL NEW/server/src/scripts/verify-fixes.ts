import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config();

async function verifyMonitoring() {
    console.log('\n--- VERIFYING MONITORING SERVICE ---');
    try {
        const monitoringService = (await import('../services/monitoring.service')).default;
        const status = await monitoringService.getSystemStatus();

        console.log('✅ System Status retrieved successfully');
        console.log('Memory Usage:', status.system.memory.percent + '%');
        console.log('CPU Cores:', status.system.cpuCount);
        console.log('Database Status:', status.database.status);
        console.log('Alerts Found:', status.alerts.length);

        if (status.alerts.length > 0) {
            console.log('Current Alerts:', JSON.stringify(status.alerts, null, 2));
        }
    } catch (error: any) {
        console.error('❌ Monitoring Service Error:', error.message);
    }
}

async function verifyStorage() {
    console.log('\n--- VERIFYING STORAGE SERVICE ---');
    try {
        const storageService = (await import('../services/storage.service')).default;

        console.log('Testing Local/Mock Connection (Default)...');
        await storageService.testConnection();
        console.log('✅ Local/Mock testConnection passed');

        // Test with invalid S3 config to ensure error handling
        console.log('Testing invalid S3 config...');
        const invalidConfig = {
            region: 'us-east-1',
            credentials: {
                accessKeyId: 'INVALID',
                secretAccessKey: 'INVALID'
            },
            bucket: 'invalid-bucket'
        };

        try {
            await (storageService as any).testConnection(invalidConfig);
            console.log('❌ Error: Connected with invalid credentials (should have failed)');
        } catch (err: any) {
            console.log('✅ Correctly failed with invalid credentials:', err.message);
        }
    } catch (error: any) {
        console.error('❌ Storage Service Error:', error.message);
    }
}

async function run() {
    await verifyMonitoring();
    await verifyStorage();
    console.log('\n--- VERIFICATION COMPLETE ---');
    process.exit(0);
}

run();
