import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import https from 'https';
import net from 'net';
import configService from './config.service';

interface ProxmoxConfig {
    apiUrl?: string;
    nodeName?: string;
    realm?: string;
    apiTokenId?: string;
    apiTokenSecret?: string;
    storage?: string;
    networkBridge?: string;
    defaultTemplate?: string;
    vmIdStart?: number;
}

interface LocalProvisionRequest {
    templateName: string;
    vmId: string;
    nodeName?: string;
    cpuCores?: number;
    memoryMb?: number;
    diskGb?: number;
    username?: string;
    password?: string;
}

class ProxmoxService {
    isMissingVmError(error: any) {
        const message = String(error?.response?.data?.message || error?.message || '');
        return message.includes('does not exist') || message.includes('no such VM');
    }

    private isCandidateGuestIp(address: string) {
        if (net.isIP(address) !== 4) return false;
        if (address.startsWith('127.')) return false;
        if (address.startsWith('169.254.')) return false;
        if (address === '0.0.0.0') return false;
        return true;
    }

    private rankGuestIp(address: string) {
        const octets = address.split('.').map((part) => Number(part));
        if (address.startsWith('10.')) return 0;
        if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return 1;
        if (address.startsWith('192.168.')) return 2;
        return 3;
    }

    private async getClient(): Promise<{ client: AxiosInstance; config: ProxmoxConfig }> {
        const config = await configService.get<ProxmoxConfig>('proxmox');
        if (!config?.apiUrl || !config.apiTokenId || !config.apiTokenSecret) {
            throw new Error('Proxmox configuration is incomplete');
        }

        const allowInsecureTls = process.env.PROXMOX_ALLOW_INSECURE_TLS === 'true';
        const timeoutMs = Number(process.env.PROXMOX_API_TIMEOUT_MS || 300000); // Increased default to 5 minutes
        const axiosConfig: AxiosRequestConfig = {
            baseURL: config.apiUrl,
            headers: {
                Authorization: `PVEAPIToken=${config.apiTokenId}=${config.apiTokenSecret}`,
                'Content-Type': 'application/json',
            },
            timeout: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 300000,
        };

        if (allowInsecureTls) {
            axiosConfig.httpsAgent = new https.Agent({ rejectUnauthorized: false });
        }

        const client = axios.create(axiosConfig);

        return { client, config };
    }

    async provisionVm(request: LocalProvisionRequest) {
        const { client, config } = await this.getClient();
        const nodeName = request.nodeName || config.nodeName;
        if (!nodeName) {
            throw new Error('Proxmox nodeName is required');
        }

        const payload = {
            newid: parseInt(request.vmId, 10),
            name: `lab-${request.vmId}`,
            full: 1,
            target: nodeName,
            storage: config.storage,
            description: `Provisioned by Virtual Lab Platform from template ${request.templateName}`,
        };

        console.log(`[Proxmox] Attempting to clone VM ${request.templateName} to ${request.vmId} on node ${nodeName}`);
        
        try {
            return await client.post(`/nodes/${nodeName}/qemu/${request.templateName}/clone`, payload);
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.message;
            console.error(`[Proxmox] Clone failed: ${errorMsg}`, error.response?.data);
            throw new Error(`Proxmox clone failed: ${errorMsg}`);
        }
    }

    async getNextAvailableVmId() {
        const { client, config } = await this.getClient();
        const response = await client.get('/cluster/resources?type=vm');
        const resources = Array.isArray(response.data?.data) ? response.data.data : [];
        const usedVmIds = resources
            .map((item: any) => Number(item.vmid))
            .filter((vmid: number) => Number.isInteger(vmid));

        const configuredStart = Number(config.vmIdStart || 0);
        const minimumVmId = Number.isInteger(configuredStart) && configuredStart > 0 ? configuredStart : 1000;
        const maxUsedVmId = usedVmIds.length > 0 ? Math.max(...usedVmIds) : minimumVmId - 1;

        return String(Math.max(minimumVmId, maxUsedVmId + 1));
    }

    async getVmStatus(vmId: string, nodeName?: string) {
        const { client, config } = await this.getClient();
        const node = nodeName || config.nodeName;
        if (!node) throw new Error('Proxmox nodeName is required');
        const response = await client.get(`/nodes/${node}/qemu/${vmId}/status/current`);
        return response.data.data;
    }

    async waitForVmReady(vmId: string, nodeName?: string, timeoutMs = 600000) {
        const startedAt = Date.now();

        while (Date.now() - startedAt < timeoutMs) {
            try {
                const status = await this.getVmStatus(vmId, nodeName);
                if (status && status.lock !== 'clone') {
                    return status;
                }
            } catch (error: any) {
                if (error.response?.status !== 404) {
                    throw error;
                }
            }

            await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        throw new Error(`Timed out waiting for VM ${vmId} to finish cloning`);
    }

    async startVm(vmId: string, nodeName?: string) {
        const { client, config } = await this.getClient();
        const node = nodeName || config.nodeName;
        if (!node) throw new Error('Proxmox nodeName is required');
        return client.post(`/nodes/${node}/qemu/${vmId}/status/start`);
    }

    async waitForVmRunning(vmId: string, nodeName?: string, timeoutMs = 120000) {
        const startedAt = Date.now();

        while (Date.now() - startedAt < timeoutMs) {
            const status = await this.getVmStatus(vmId, nodeName);
            if (status?.status === 'running' && status?.qmpstatus === 'running') {
                return status;
            }

            await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        throw new Error(`Timed out waiting for VM ${vmId} to start`);
    }

    async getGuestIp(vmId: string, nodeName?: string) {
        const { client, config } = await this.getClient();
        const node = nodeName || config.nodeName;
        if (!node) throw new Error('Proxmox nodeName is required');

        const response = await client.get(`/nodes/${node}/qemu/${vmId}/agent/network-get-interfaces`);
        const interfaces = response.data.data?.result || [];
        const candidates: string[] = [];

        for (const iface of interfaces) {
            const addresses = iface['ip-addresses'] || [];
            for (const entry of addresses) {
                const address = entry['ip-address'];
                if (typeof address === 'string' && this.isCandidateGuestIp(address)) {
                    candidates.push(address);
                }
            }
        }

        candidates.sort((a, b) => this.rankGuestIp(a) - this.rankGuestIp(b));
        return candidates[0] || null;
    }

    async waitForGuestIp(vmId: string, nodeName?: string, timeoutMs = 180000) {
        const startedAt = Date.now();

        while (Date.now() - startedAt < timeoutMs) {
            try {
                const ipAddress = await this.getGuestIp(vmId, nodeName);
                if (ipAddress) {
                    return ipAddress;
                }
            } catch (error: any) {
                const status = error.response?.status;
                const message = String(error.response?.data?.message || error.message || '');
                const retryable = status === 500 || status === 595 || message.includes('QEMU guest agent is not running');
                if (!retryable) {
                    throw error;
                }
            }

            await new Promise((resolve) => setTimeout(resolve, 5000));
        }

        return null;
    }

    async stopVm(vmId: string, nodeName?: string) {
        const { client, config } = await this.getClient();
        const node = nodeName || config.nodeName;
        if (!node) throw new Error('Proxmox nodeName is required');
        return client.post(`/nodes/${node}/qemu/${vmId}/status/shutdown`);
    }

    async deleteVm(vmId: string, nodeName?: string) {
        const { client, config } = await this.getClient();
        const node = nodeName || config.nodeName;
        if (!node) throw new Error('Proxmox nodeName is required');
        return client.delete(`/nodes/${node}/qemu/${vmId}`);
    }

    private async getConfig(): Promise<ProxmoxConfig> {
        return configService.get<ProxmoxConfig>('proxmox');
    }

    async extendVmExpiry(_vmId: string, _expiresAt: Date) {
        // Expiry is enforced by this application, not Proxmox directly.
        return { success: true };
    }

    async getTemplates() {
        try {
            const { client, config } = await this.getClient();
            
            if (!config.nodeName) {
                throw new Error('Proxmox nodeName is missing in system settings. Please configure it in Settings -> Proxmox.');
            }

            // List all resources on the node
            const response = await client.get(`/nodes/${config.nodeName}/qemu`);
            
            // Return VMs that are marked as templates
            const templates = (response.data.data || [])
                .filter((vm: any) => vm.template === 1 || vm.template === '1' || vm.template === true)
                .map((vm: any) => ({
                    vmid: String(vm.vmid),
                    name: vm.name,
                    status: vm.status,
                    isTemplate: true
                }));

            if (templates.length === 0) {
                console.warn(`[Proxmox] No templates found on node ${config.nodeName}. Ensure VMs are converted to templates in Proxmox.`);
            }

            return templates;
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.message;
            console.error('[Proxmox] Error fetching templates:', errorMsg);
            
            if (error.code === 'ECONNREFUSED') {
                throw new Error(`Connection refused: Proxmox API at ${error.config?.baseURL} is unreachable.`);
            }
            if (error.code === 'ETIMEDOUT') {
                throw new Error('Connection timed out: Proxmox API did not respond in time.');
            }
            if (error.response?.status === 401) {
                throw new Error('Authentication failed: Proxmox API Token ID or Secret is incorrect.');
            }
            
            throw new Error(`Proxmox Error: ${errorMsg}`);
        }
    }

    async getVncProxy(vmId: string, nodeName?: string) {
        try {
            const { client, config } = await this.getClient();
            const node = nodeName || config.nodeName;
            if (!node) throw new Error('Proxmox nodeName is required');

            // Generate a VNC proxy ticket
            const response = await client.post(`/nodes/${node}/qemu/${vmId}/vncproxy`, {
                websocket: 1,
                generate_ticket: 1
            });

            return response.data.data;
        } catch (error: any) {
            console.error('Error generating VNC proxy:', error.response?.data || error.message);
            throw new Error(`Failed to generate VNC proxy: ${error.message}`);
        }
    }

    async healthCheck() {
        try {
            const { client } = await this.getClient();
            const response = await client.get('/version');
            return {
                success: true,
                version: response.data.data.version,
                release: response.data.data.release
            };
        } catch (error: any) {
            console.error('Proxmox health check failed:', error.response?.data || error.message);
            throw new Error(`Connection failed: ${error.message}`);
        }
    }
}

const proxmoxService = new ProxmoxService();
export default proxmoxService;
