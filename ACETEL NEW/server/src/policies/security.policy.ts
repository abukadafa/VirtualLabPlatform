import { PolicyContext } from '../middleware/abac.middleware';

/**
 * Enterprise Lab Access Policy (ABAC)
 * - Admins can always access.
 * - Students/Facilitators only during "Office Hours" (8 AM - 8 PM).
 * - Blocks specific high-risk IP ranges (mock).
 */
export const enterpriseLabPolicy = (context: PolicyContext): boolean => {
    const { user, environment } = context;

    // Admin Override
    if (user.role === 'admin') return true;

    // Time-based restriction (D3)
    const currentHour = new Date(environment.time).getHours();
    if (currentHour < 8 || currentHour >= 20) {
        console.warn(`[ABAC] Access denied outside of office hours: ${user.id}`);
        return false;
    }

    // Mock IP Restriction (D3)
    const blacklistedIps = ['192.168.1.100'];
    if (blacklistedIps.includes(environment.ip)) {
        console.warn(`[ABAC] Access blocked from blacklisted IP: ${environment.ip}`);
        return false;
    }

    return true;
};
