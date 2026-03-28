import axios, { AxiosInstance } from 'axios';

export interface GuacamoleConnection {
    connectionId: string;
    url: string;
    token: string;
}

export interface ConnectionParams {
    name: string;
    protocol: 'vnc' | 'ssh' | 'rdp';
    hostname: string;
    port: string;
    username?: string;
    password?: string;
    extraParameters?: Record<string, string>;
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
     * Create a Guacamole connection
     */
    async createConnection(
        params: ConnectionParams,
        userId: string
    ): Promise<GuacamoleConnection> {
        const adminToken = await this.getAdminToken();

        try {
            // Default parameters for the connection
            const parameters: Record<string, string> = {
                hostname: params.hostname,
                port: params.port,
                username: params.username || '',
                password: params.password || '',
                'enable-audio': 'false',
                'enable-printing': 'false',
                'enable-drive': 'false',
                'create-drive-path': 'false',
                'disable-copy': 'false',
                'disable-paste': 'false',
                'color-depth': '24',
                'cursor': 'remote',
                'swap-red-blue': 'false',
                ...params.extraParameters,
            };

            // Protocol specific defaults
            if (params.protocol === 'vnc') {
                parameters['dest-host'] = params.hostname;
                parameters['dest-port'] = params.port;
            }

            // Create connection definition
            const connectionData = {
                parentIdentifier: 'ROOT',
                name: `${params.name}-${userId}`,
                protocol: params.protocol,
                parameters,
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
     * Legacy wrapper for createConnection (backwards compatibility)
     */
    async createLegacyConnection(
        containerName: string,
        containerIp: string,
        userId: string
    ): Promise<GuacamoleConnection> {
        return this.createConnection({
            name: containerName,
            protocol: 'vnc',
            hostname: containerIp,
            port: '5901',
            password: '',
        }, userId);
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
