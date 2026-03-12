export interface ISecretProvider {
    getSecret(key: string): Promise<string | undefined>;
}

class EnvSecretProvider implements ISecretProvider {
    async getSecret(key: string): Promise<string | undefined> {
        return process.env[key];
    }
}

class SecretManagerService {
    private provider: ISecretProvider;

    constructor(provider: ISecretProvider = new EnvSecretProvider()) {
        this.provider = provider;
    }

    /**
     * Get a secret from the secure provider (D8)
     */
    async getSecret(key: string): Promise<string> {
        const secret = await this.provider.getSecret(key);
        if (!secret) {
            throw new Error(`Critical Secret Missing: ${key}`);
        }
        return secret;
    }

    /**
     * Set a custom provider (e.g., Vault, AWS Secrets Manager)
     */
    setProvider(provider: ISecretProvider) {
        this.provider = provider;
    }
}

export default new SecretManagerService();
