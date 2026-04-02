/**
 * Real-time Sync Configuration
 */

export const REALTIME_CONFIG = {
    // Server configuration
    SYNC_SERVER_URL: process.env.NEXT_PUBLIC_SYNC_SERVER_URL || 'http://localhost:3001',
    
    // Debounce settings (milliseconds)
    CURSOR_UPDATE_DEBOUNCE: 100,
    CONTENT_UPDATE_DEBOUNCE: 300,
    SYNC_REQUEST_DEBOUNCE: 500,
    
    // Timeout settings (milliseconds)
    SYNC_TIMEOUT: 5000,
    CONNECTION_TIMEOUT: 10000,
    PING_INTERVAL: 30000,
    
    // Change management
    MAX_CHANGES_IN_MEMORY: 1000,
    COMPACT_CHANGES_THRESHOLD: 500,
    MAX_CHANGE_SIZE: 10000, // characters
    
    // Reconnection settings
    INITIAL_RECONNECT_DELAY: 1000,
    MAX_RECONNECT_DELAY: 30000,
    MAX_RECONNECT_ATTEMPTS: 10,
    RECONNECT_BACKOFF_MULTIPLIER: 1.5,
    
    // Presence settings
    PRESENCE_UPDATE_INTERVAL: 30000,
    PRESENCE_TIMEOUT: 60000,
    
    // Auto-save settings
    AUTO_SAVE_ENABLED: true,
    AUTO_SAVE_INTERVAL: 5000,
    
    // Conflict resolution
    CONFLICT_RESOLUTION_STRATEGY: 'operational-transform' as const,
    
    // Performance monitoring
    ENABLE_METRICS: true,
    METRICS_LOG_INTERVAL: 60000,
    
    // Feature flags
    ENABLE_OFFLINE_SUPPORT: true,
    ENABLE_COMPRESSION: false,
    ENABLE_ENCRYPTION: false,
};

export type RealtimeConfig = typeof REALTIME_CONFIG;

/**
 * Get configuration value
 */
export function getConfig<T extends keyof typeof REALTIME_CONFIG>(key: T) {
    return REALTIME_CONFIG[key];
}

/**
 * Update configuration value
 */
export function setConfig<T extends keyof typeof REALTIME_CONFIG>(
    key: T,
    value: typeof REALTIME_CONFIG[T]
) {
    (REALTIME_CONFIG as any)[key] = value;
}

/**
 * Get all configuration
 */
export function getAllConfig(): typeof REALTIME_CONFIG {
    return { ...REALTIME_CONFIG };
}
