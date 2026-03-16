/**
 * Application Configuration
 * Centralized configuration constants and helpers
 */

/**
 * Port configuration
 */
export const PORTS = {
  /** AutoTest X GUI development server port */
  AUTOTESTX_DEV: 5173,
  
  /** AutoTest X GUI production port (for reference) */
  AUTOTESTX_GUI: 23333,

  /** Local host API server port (default, can be overridden at runtime) */
  AUTOTESTX_HOST_API: 3210,
  
  /** OpenClaw Gateway port */
  OPENCLAW_GATEWAY: 18789,
};

/**
 * Actual runtime port for the Host API (finds an available one if default is taken)
 */
let actualHostApiPort = PORTS.AUTOTESTX_HOST_API;
let actualGatewayPort = PORTS.OPENCLAW_GATEWAY;

export function setRuntimeHostApiPort(port: number): void {
  actualHostApiPort = port;
}

export function getRuntimeHostApiPort(): number {
  return actualHostApiPort;
}

export function setRuntimeGatewayPort(port: number): void {
  actualGatewayPort = port;
}

export function getRuntimeGatewayPort(): number {
  return actualGatewayPort;
}

/**
 * Get port from environment or default
 */
export function getPort(key: keyof typeof PORTS): number {
  const envKey = `AUTOTESTX_PORT_${key}`;
  const envValue = process.env[envKey];
  return envValue ? parseInt(envValue, 10) : PORTS[key];
}

/**
 * Application paths
 */
export const APP_PATHS = {
  /** OpenClaw configuration directory */
  OPENCLAW_CONFIG: '~/.openclaw',
  
  /** AutoTest X configuration directory */
  AUTOTESTX_CONFIG: '~/.autotestx',
  
  /** Log files directory */
  LOGS: '~/.autotestx/logs',
} as const;

/**
 * Update channels
 */
export const UPDATE_CHANNELS = ['stable', 'beta', 'dev'] as const;
export type UpdateChannel = (typeof UPDATE_CHANNELS)[number];

/**
 * Default update configuration
 */
export const UPDATE_CONFIG = {
  /** Check interval in milliseconds (6 hours) */
  CHECK_INTERVAL: 6 * 60 * 60 * 1000,
  
  /** Default update channel */
  DEFAULT_CHANNEL: 'stable' as UpdateChannel,
  
  /** Auto download updates */
  AUTO_DOWNLOAD: false,
  
  /** Show update notifications */
  SHOW_NOTIFICATION: true,
};

/**
 * Gateway configuration
 */
export const GATEWAY_CONFIG = {
  /** WebSocket reconnection delay (ms) */
  RECONNECT_DELAY: 5000,
  
  /** RPC call timeout (ms) */
  RPC_TIMEOUT: 30000,
  
  /** Health check interval (ms) */
  HEALTH_CHECK_INTERVAL: 30000,
  
  /** Maximum startup retries */
  MAX_STARTUP_RETRIES: 30,
  
  /** Startup retry interval (ms) */
  STARTUP_RETRY_INTERVAL: 1000,
};
