import { exec } from 'child_process';
import util from 'util';
import emailService from './email.service';
import AuditLog from '../models/AuditLog.model'; // Assuming we have or will create this

const execPromise = util.promisify(exec);

class SecurityService {
    /**
     * Runs npm audit and reports findings
     */
    async runDependencyAudit() {
        console.log('🛡️ Starting scheduled security audit...');
        try {
            // Run audit for server
            const { stdout } = await execPromise('npm audit --json');
            const report = JSON.parse(stdout);

            const vulnerabilities = report.metadata.vulnerabilities;
            const critical = vulnerabilities.critical;
            const high = vulnerabilities.high;

            if (critical > 0 || high > 0) {
                await this.handleSecurityAlert(report);
            } else {
                console.log('✅ Security audit passed: No critical/high vulnerabilities.');
            }

            return { success: true, report };
        } catch (error: any) {
            // npm audit returns non-zero exit code if vulnerabilities found
            if (error.stdout) {
                try {
                    const report = JSON.parse(error.stdout);
                    await this.handleSecurityAlert(report);
                    return { success: false, report };
                } catch (parseError) {
                    console.error('Failed to parse audit output:', parseError);
                }
            }
            console.error('Security audit failed to execute:', error);
            return { success: false, error: error.message };
        }
    }

    private async handleSecurityAlert(report: any) {
        const stats = report.metadata.vulnerabilities;
        const message = `Security Alert: Found ${stats.critical} Critical and ${stats.high} High vulnerabilities in server dependencies.`;
        
        console.error(`🚨 ${message}`);

        // 1. Log to DB (if AuditLog model exists, otherwise simple console)
        // await AuditLog.create({ action: 'SECURITY_ALERT', details: message });

        // 2. Notify Admin via Email
        // Assuming there is a generic admin email configured in system settings
        try {
            await emailService.sendEmail(
                process.env.ADMIN_EMAIL || 'admin@virtuallab.com',
                'URGENT: Security Vulnerabilities Detected',
                {
                    name: 'Admin',
                    intro: 'A scheduled security scan has detected vulnerabilities in the platform.',
                    action: 'Please review the server logs and run "npm audit fix" immediately.',
                    details: JSON.stringify(stats, null, 2)
                }
            );
        } catch (err) {
            console.error('Failed to send security alert email:', err);
        }
    }
}

export default new SecurityService();
