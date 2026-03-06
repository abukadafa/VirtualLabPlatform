import axios, { AxiosInstance } from 'axios';

export interface GuacamoleConnection {
    connectionId: string;
    url: string;
    token: string;
}

class GuacamoleService {
    private client: AxiosInstance;
    private adminToken: string | null = null;

    constructor() {
        const guacamoleUrl = process.env.GUAC_REST_API_URL || 'http://guacamole:8080/guacamole/api';
        this.client = axios.create({
            baseURL: guacamoleUrl,
            timeout: 10000,
        });
    }

    /**
     * Get admin authentication token
     */
    private async getAdminToken(): Promise<string> {
        if (this.adminToken) {
            return this.adminToken!;
        }

        try {
            const response = await this.client.post('/tokens', new URLSearchParams({
                username: 'guacadmin',
                password: process.env.GUACAMOLE_ADMIN_PASSWORD || 'guacadmin',
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            this.adminToken = response.data.authToken;
            return this.adminToken!;
        } catch (error) {
            console.error('Failed to authenticate with Guacamole:', error);
            throw new Error('Guacamole authentication failed');
        }
    }

    /**
     * Create a user token for accessing Guacamole
     */
    async createAuthToken(userId: string): Promise<string> {
        const adminToken = await this.getAdminToken();

        // For now, use admin token
        // In production, you'd create user-specific tokens
        return adminToken;
    }

    /**
     * Create a VNC connection to a container
     */
    async createConnection(
        containerName: string,
        containerIp: string,
        userId: string
    ): Promise<GuacamoleConnection> {
        const adminToken = await this.getAdminToken();

        try {
            // Create connection definition
            const connectionData = {
                parentIdentifier: 'ROOT',
                name: `${containerName}-${userId}`,
                protocol: 'vnc',
                parameters: {
                    hostname: containerIp,
                    port: '5901',
                    password: '', // No VNC password (container-level security)
                    'enable-audio': 'false',
                    'enable-printing': 'false',
                    'enable-drive': 'false',
                    'create-drive-path': 'false',
                    'disable-copy': 'false',
                    'disable-paste': 'false',
                    'color-depth': '24',
                    'cursor': 'remote',
                    'swap-red-blue': 'false',
                    'dest-host': containerIp,
                    'dest-port': '5901',
                    'recording-path': '',
                    'recording-name': '',
                },
                attributes: {
                    'max-connections': '1',
                    'max-connections-per-user': '1',
                },
            };

            const response = await this.client.post(
                `/session/data/mysql/connections`,
                connectionData,
                {
                    params: { token: adminToken },
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            const connectionId = response.data.identifier;
            const userToken = await this.createAuthToken(userId);

            return {
                connectionId,
                token: userToken,
                url: `/guacamole/#/client/${connectionId}?token=${userToken}`,
            };
        } catch (error: any) {
            console.error('Failed to create Guacamole connection:', error.response?.data || error.message);
            throw new Error('Failed to create Guacamole connection');
        }
    }

    /**
     * Delete a connection when session ends
     */
    async deleteConnection(connectionId: string): Promise<void> {
        const adminToken = await this.getAdminToken();

        try {
            await this.client.delete(
                `/session/data/mysql/connections/${connectionId}`,
                {
                    params: { token: adminToken },
                }
            );
            console.log(`Deleted Guacamole connection: ${connectionId}`);
        } catch (error: any) {
            console.error('Failed to delete Guacamole connection:', error.response?.data || error.message);
            // Don't throw - connection deletion is non-critical
        }
    }

    /**
     * Get active connections for monitoring
     */
    async getActiveConnections(): Promise<any[]> {
        const adminToken = await this.getAdminToken();

        try {
            const response = await this.client.get(
                `/session/data/mysql/connections`,
                {
                    params: { token: adminToken },
                }
            );
            return Object.values(response.data);
        } catch (error) {
            console.error('Failed to get active connections:', error);
            return [];
        }
    }

    /**
     * Test Guacamole connectivity
     */
    async healthCheck(): Promise<boolean> {
        try {
            await this.getAdminToken();
            return true;
        } catch (error) {
            return false;
        }
    }
}

export default new GuacamoleService();
