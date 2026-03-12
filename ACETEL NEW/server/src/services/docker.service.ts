import Docker from 'dockerode';
import { ILab } from '../models/Lab.model';

const docker = new Docker();

export interface ContainerConfig {
    userId: string;
    labType: 'AI' | 'Cybersecurity' | 'MIS';
    labId: string;
    cpuLimit: number;
    memoryLimit: string;
    diskLimit: string;
    internetEnabled: boolean;
}

export interface ContainerInfo {
    containerId: string;
    containerName: string;
    ipAddress: string;
    volumeName: string;
    vncPort: number;
}

// Enterprise resource caps for Tier 2 (D8)
const ENTERPRISE_CAPS = {
    MAX_CPUS: 4,
    MAX_MEMORY: '8G', // 8GB
};

class DockerService {
    public docker: Docker;

    constructor() {
        this.docker = docker;
    }

    /**

     * Create a user-specific volume for persistent storage
     */
    async createUserVolume(userId: string, labType: string): Promise<string> {
        const volumeName = `student-${userId}-${labType.toLowerCase()}-workspace`;

        try {
            // Check if volume already exists
            const existingVolume = docker.getVolume(volumeName);
            await existingVolume.inspect();
            console.log(`Volume ${volumeName} already exists`);
        } catch (error) {
            // Volume doesn't exist, create it
            await docker.createVolume({
                Name: volumeName,
            });
            console.log(`Created volume: ${volumeName}`);
        }

        return volumeName;
    }

    /**
     * Start a lab container with security hardening
     */
    async startLabContainer(config: ContainerConfig): Promise<ContainerInfo> {
        const volumeName = await this.createUserVolume(config.userId, config.labType);
        const containerName = `${config.labType.toLowerCase()}-${config.userId}-${Date.now()}`;
        const imageName = this.getImageName(config.labType);

        // Determine network mode based on internet setting
        const networkMode = config.internetEnabled ? 'lab-network' : 'lab-network-isolated';

        const container = await docker.createContainer({
            Image: imageName,
            name: containerName,
            Hostname: containerName,
            Env: [
                `LAB_USER_ID=${config.userId}`,
                `LAB_TYPE=${config.labType}`,
            ],
            HostConfig: {
                // Resource limits with Enterprise Caps (D8)
                NanoCpus: Math.min(config.cpuLimit, ENTERPRISE_CAPS.MAX_CPUS) * 1e9,
                Memory: Math.min(
                    this.parseMemory(config.memoryLimit),
                    this.parseMemory(ENTERPRISE_CAPS.MAX_MEMORY)
                ),
                PidsLimit: 512, // Prevent fork bombs

                // Security options
                SecurityOpt: [
                    'no-new-privileges:true',
                    'seccomp=default',
                    'apparmor=docker-default',
                ],
                CapDrop: ['ALL'],
                CapAdd: ['CHOWN', 'SETUID', 'SETGID', 'DAC_OVERRIDE'],
                ReadonlyRootfs: true,

                // Writable tmpfs mounts
                Tmpfs: {
                    '/tmp': 'size=1G,mode=1777',
                    '/run': 'size=100M,mode=0755',
                    '/home/labuser/.cache': 'size=500M,uid=1000,gid=1000',
                },

                // Persistent volume
                Binds: [
                    `${volumeName}:/home/labuser/workspace`,
                ],

                // Network
                NetworkMode: networkMode,

                // Restart policy
                RestartPolicy: {
                    Name: 'on-failure',
                    MaximumRetryCount: 3,
                },
            },
        });

        await container.start();

        // Get container info
        const containerInfo = await container.inspect();
        const ipAddress = containerInfo.NetworkSettings.Networks[networkMode]?.IPAddress || '';

        return {
            containerId: container.id,
            containerName,
            ipAddress,
            volumeName,
            vncPort: 5901, // VNC runs on port 5901 inside container
        };
    }

    /**
     * Stop a container
     */
    async stopContainer(containerId: string): Promise<void> {
        const container = docker.getContainer(containerId);
        await container.stop({ t: 10 }); // 10 second grace period
        console.log(`Stopped container: ${containerId}`);
    }

    /**
     * Pause a container (suspend execution)
     */
    async pauseContainer(containerId: string): Promise<void> {
        const container = docker.getContainer(containerId);
        await container.pause();
        console.log(`Paused container: ${containerId}`);
    }

    /**
     * Resume a paused container
     */
    async resumeContainer(containerId: string): Promise<void> {
        const container = docker.getContainer(containerId);
        await container.unpause();
        console.log(`Resumed container: ${containerId}`);
    }

    /**
     * Remove a container
     */
    async removeContainer(containerId: string): Promise<void> {
        const container = docker.getContainer(containerId);
        await container.remove({ force: true });
        console.log(`Removed container: ${containerId}`);
    }

    /**
     * Get container stats (CPU, memory, network)
     */
    async getContainerStats(containerId: string): Promise<any> {
        const container = docker.getContainer(containerId);
        const stats = await container.stats({ stream: false });

        // Calculate CPU percentage
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
        const cpuPercent = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;

        // Calculate memory percentage
        const memoryUsage = stats.memory_stats.usage;
        const memoryLimit = stats.memory_stats.limit;
        const memoryPercent = (memoryUsage / memoryLimit) * 100;

        return {
            cpuPercent: cpuPercent.toFixed(2),
            memoryUsage: this.formatBytes(memoryUsage),
            memoryLimit: this.formatBytes(memoryLimit),
            memoryPercent: memoryPercent.toFixed(2),
            networkRx: this.formatBytes(stats.networks?.eth0?.rx_bytes || 0),
            networkTx: this.formatBytes(stats.networks?.eth0?.tx_bytes || 0),
        };
    }

    /**
     * Health check for container
     */
    async isContainerHealthy(containerId: string): Promise<boolean> {
        try {
            const container = docker.getContainer(containerId);
            const info = await container.inspect();
            return info.State.Running && !info.State.Paused;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get active container count
     */
    async getActiveContainerCount(labType?: string): Promise<number> {
        const containers = await docker.listContainers({
            filters: {
                status: ['running'],
                ...(labType && { name: [`${labType.toLowerCase()}-`] }),
            },
        });
        return containers.length;
    }

    /**
     * Cleanup expired containers
     */
    async cleanupExpiredContainers(expiryHours: number = 24): Promise<number> {
        const containers = await docker.listContainers({
            all: true,
            filters: {
                status: ['exited'],
            },
        });

        let cleaned = 0;
        const expiryTime = Date.now() - (expiryHours * 60 * 60 * 1000);

        for (const containerInfo of containers) {
            // Check if container is older than expiry time
            if (containerInfo.Created * 1000 < expiryTime) {
                try {
                    const container = docker.getContainer(containerInfo.Id);
                    await container.remove();
                    cleaned++;
                } catch (error) {
                    console.error(`Failed to remove container ${containerInfo.Id}:`, error);
                }
            }
        }

        console.log(`Cleaned up ${cleaned} expired containers`);
        return cleaned;
    }

    // Helper methods

    private getImageName(labType: string): string {
        const imageMap: Record<string, string> = {
            'AI': 'virtual-lab/ai-lab:latest',
            'Cybersecurity': 'virtual-lab/cyber-lab:latest',
            'MIS': 'virtual-lab/mis-lab:latest',
        };
        return imageMap[labType] || 'virtual-lab/ai-lab:latest';
    }

    private parseMemory(memStr: string): number {
        // Parse memory string like "4G", "512M" to bytes
        const unit = memStr.slice(-1).toUpperCase();
        const value = parseInt(memStr.slice(0, -1));

        const multipliers: Record<string, number> = {
            'G': 1024 * 1024 * 1024,
            'M': 1024 * 1024,
            'K': 1024,
        };

        return value * (multipliers[unit] || 1);
    }

    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    }
}

export default new DockerService();
