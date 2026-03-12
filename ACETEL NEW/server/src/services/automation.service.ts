import auditLogService from './audit-log.service';

export type HookType = 'lab_provision' | 'lab_deprovision' | 'user_access' | 'audit_trigger';

interface AutomationHook {
    id: string;
    type: HookType;
    action: (data: any) => Promise<void>;
}

class AutomationService {
    private hooks: AutomationHook[] = [];

    /**
     * Register a new automation hook (D10)
     */
    registerHook(type: HookType, action: (data: any) => Promise<void>) {
        const id = Math.random().toString(36).substring(7);
        this.hooks.push({ id, type, action });
        console.log(`Registered Automation Hook: ${id} [${type}]`);
    }

    /**
     * Trigger all hooks for a specific event (D10)
     */
    async triggerHooks(type: HookType, data: any) {
        const targetHooks = this.hooks.filter(h => h.type === type);

        for (const hook of targetHooks) {
            try {
                await hook.action(data);
                await auditLogService.logSecurityEvent({
                    violation: `Automation hook ${hook.id} executed for ${type}`,
                    severity: 'info'
                });
            } catch (error: any) {
                console.error(`Automation hook ${hook.id} failed:`, error.message);
                await auditLogService.logSecurityEvent({
                    violation: `Automation hook ${hook.id} failed: ${error.message}`,
                    severity: 'error'
                });
            }
        }
    }
}

export default new AutomationService();
