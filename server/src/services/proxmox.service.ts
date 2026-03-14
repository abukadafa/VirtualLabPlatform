import axios, { AxiosInstance } from 'axios';
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
    private async getClient(): Promise<{ client: AxiosInstance; config: ProxmoxConfig }> {
        const config = await configService.get<ProxmoxConfig>('proxmox');
        if (!config?.apiUrl || !config.apiTokenId || !config.apiTokenSecret) {
            throw new Error('Proxmox configuration is incomplete');
        }

        const client = axios.create({
            baseURL: config.apiUrl,
            headers: {
                Authorization: `PVEAPIToken=${config.apiTokenId}=${config.apiTokenSecret}`,
                'Content-Type': 'application/json',
            },
            timeout: 15000,
        });

        return { client, config };
    }

    async provisionVm(request: LocalProvisionRequest) {
        const { client, config } = await this.getClient();
        const nodeName = request.nodeName || config.nodeName;
        if (!nodeName) {
            throw new Error('Proxmox nodeName is required');
        }

        const payload = {
            newid: request.vmId,
            name: `lab-${request.vmId}`,
            full: 1,
            target: nodeName,
            storage: config.storage,
            cores: request.cpuCores,
            memory: request.memoryMb,
            bridge: config.networkBridge,
            description: `Provisioned by Virtual Lab Platform from template ${request.templateName}`,
        };

        // The exact clone endpoint may vary based on how templates are identified in your Proxmox setup.
        return client.post(`/nodes/${nodeName}/qemu/${request.templateName}/clone`, payload);
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

    async extendVmExpiry(_vmId: string, _expiresAt: Date) {
        // Expiry is enforced by this application, not Proxmox directly.
        return { success: true };
    }
}

const proxmoxService = new ProxmoxService();
export default proxmoxService;
