/**
 * MCProfile API Client
 * @version 2.0.0
 *
 * Handles all communication with mcprofile.io API endpoints
 * Supports: XUID, FUID, Java UUID, and Gamertag lookups
 */

import NetworkManager from '../net/network-manager.js';

class MCProfileAPI {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.networkManager = new NetworkManager(logger);
        this.baseURL = config.get('api.endpoint') || 'https://api.mcprofile.io';
        this.timeout = config.get('api.timeout') || 10000;
        this.retries = config.get('api.retries') || 3;
    }

    /**
     * Get profile by Bedrock XUID
     * GET /api/v1/bedrock/xuid/{xuid}
     */
    async getProfileByXUID(xuid) {
        try {
            this.logger.debug(`Fetching profile by XUID: ${xuid}`);

            if (!xuid || typeof xuid !== 'string') {
                throw new Error('Invalid XUID format');
            }

            const url = `${this.baseURL}/api/v1/bedrock/xuid/${xuid}`;
            const response = await this.makeRequest(url);

            this.logger.debug(`Profile retrieved for XUID ${xuid}: ${response.gamertag}`);
            return this.parseBedrockProfile(response);

        } catch (error) {
            this.logger.error(`Failed to fetch profile by XUID ${xuid}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get profile by Floodgate UID
     * GET /api/v1/bedrock/fuid/{fuid}
     */
    async getProfileByFloodgateUID(fuid) {
        try {
            this.logger.debug(`Fetching profile by Floodgate UID: ${fuid}`);

            if (!fuid || typeof fuid !== 'string') {
                throw new Error('Invalid Floodgate UID format');
            }

            const url = `${this.baseURL}/api/v1/bedrock/fuid/${fuid}`;
            const response = await this.makeRequest(url);

            this.logger.debug(`Profile retrieved for FUID ${fuid}: ${response.gamertag}`);
            return this.parseBedrockProfile(response);

        } catch (error) {
            this.logger.error(`Failed to fetch profile by FUID ${fuid}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get profile by Java UUID
     * GET /api/v1/java/uuid/{uuid}
     */
    async getProfileByJavaUUID(uuid) {
        try {
            this.logger.debug(`Fetching profile by Java UUID: ${uuid}`);

            if (!uuid || typeof uuid !== 'string') {
                throw new Error('Invalid Java UUID format');
            }

            // Normalize UUID format (remove hyphens for consistency)
            const normalizedUUID = uuid.replace(/-/g, '');
            const url = `${this.baseURL}/api/v1/java/uuid/${normalizedUUID}`;
            const response = await this.makeRequest(url);

            this.logger.debug(`Profile retrieved for Java UUID ${uuid}: ${response.username}`);
            return this.parseJavaProfile(response);

        } catch (error) {
            this.logger.error(`Failed to fetch profile by Java UUID ${uuid}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get profile by Gamertag (Bedrock username)
     * Uses XUID lookup if available
     */
    async getProfileByGamertag(gamertag) {
        try {
            this.logger.debug(`Fetching profile by Gamertag: ${gamertag}`);

            if (!gamertag || typeof gamertag !== 'string') {
                throw new Error('Invalid gamertag format');
            }

            // MCProfile API doesn't have direct gamertag endpoint
            // Use a search/lookup mechanism
            const url = `${this.baseURL}/api/v1/bedrock/gamertag/${gamertag}`;
            const response = await this.makeRequest(url);

            this.logger.debug(`Profile retrieved for gamertag ${gamertag}`);
            return this.parseBedrockProfile(response);

        } catch (error) {
            this.logger.debug(`Could not find profile by gamertag: ${gamertag}`);
            throw error;
        }
    }

    /**
     * Make HTTP request with retry logic
     */
    async makeRequest(url, options = {}) {
        let lastError;

        for (let attempt = 1; attempt <= this.retries; attempt++) {
            try {
                this.logger.debug(`Request attempt ${attempt}/${this.retries}: ${url}`);

                const response = await this.networkManager.fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'MCProfile-BridgePlugin/2.0.0',
                        ...options.headers
                    },
                    timeout: this.timeout
                });

                if (!response.ok) {
                    throw new Error(`API Error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                this.logger.debug(`Request successful: ${url}`);
                return data;

            } catch (error) {
                lastError = error;
                this.logger.warn(`Request attempt ${attempt} failed: ${error.message}`);

                if (attempt < this.retries) {
                    // Exponential backoff
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    await this.sleep(delay);
                }
            }
        }

        throw new Error(`Request failed after ${this.retries} attempts: ${lastError.message}`);
    }

    /**
     * Parse Bedrock profile response
     */
    parseBedrockProfile(data) {
        return {
            gamertag: data.gamertag || '',
            xuid: data.xuid || '',
            floodgateuid: data.floodgateuid || '',
            icon: data.icon || '',
            gamescore: data.gamescore || '0',
            accounttier: data.accounttier || 'Unknown',
            textureid: data.textureid || '',
            skin: data.skin || '',
            linked: data.linked || false,
            java_uuid: data.java_uuid || null,
            java_name: data.java_name || null,
            platform: 'bedrock',
            fetchedAt: new Date().toISOString()
        };
    }

    /**
     * Parse Java profile response
     */
    parseJavaProfile(data) {
        return {
            username: data.username || '',
            uuid: data.uuid || '',
            skin: data.skin || '',
            cape: data.cape || '',
            linked: data.linked || false,
            bedrock_gamertag: data.bedrock_gamertag || null,
            bedrock_xuid: data.bedrock_xuid || null,
            bedrock_fuid: data.bedrock_fuid || null,
            platform: 'java',
            fetchedAt: new Date().toISOString()
        };
    }

    /**
     * Validate response structure
     */
    validateResponse(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid response format');
        }

        return true;
    }

    /**
     * Sleep helper for retry delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check API health
     */
    async checkHealth() {
        try {
            this.logger.debug('Checking MCProfile API health');
            const url = `${this.baseURL}/health`;
            const response = await this.networkManager.fetch(url, {
                timeout: 5000
            });

            return response.ok;
        } catch (error) {
            this.logger.warn(`API health check failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Get API status
     */
    getStatus() {
        return {
            endpoint: this.baseURL,
            timeout: this.timeout,
            retries: this.retries,
            maxRetries: this.retries
        };
    }
}

export default MCProfileAPI;
