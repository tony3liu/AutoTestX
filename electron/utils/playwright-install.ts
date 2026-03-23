import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { logger } from './logger';
import { shouldOptimizeNetwork } from './uv-env';

/**
 * Get the Playwright CLI path from node_modules.
 */
export function getPlaywrightCliPath(): string | null {
  const appPath = app.getAppPath();
  const root = app.isPackaged ? process.resourcesPath : process.cwd();
  
  const candidates = [
    // Standard structure
    path.join(root, 'node_modules', 'playwright-core', 'cli.js'),
    path.join(root, 'node_modules', 'playwright', 'cli.js'),
    // Inside openclaw bundle (if packaged)
    path.join(root, 'openclaw', 'node_modules', 'playwright-core', 'cli.js'),
    // Development fallback
    path.join(appPath, 'node_modules', 'playwright-core', 'cli.js'),
  ];

  for (const c of candidates) {
    if (existsSync(c)) {
      return c;
    }
  }

  // Last resort: search for it
  try {
    const pkgPath = require.resolve('playwright-core/package.json');
    const cliJs = path.join(path.dirname(pkgPath), 'cli.js');
    if (existsSync(cliJs)) return cliJs;
  } catch {
    // ignore
  }

  return null;
}

/**
 * Check if Playwright chromium browser is likely installed.
 * This is a heuristic check by looking for chromium folders in the
 * default Playwright browser location.
 */
export function isChromiumInstalled(): boolean {
  let browserDir = '';
  if (process.platform === 'win32') {
    browserDir = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  } else if (process.platform === 'darwin') {
    browserDir = path.join(process.env.HOME || '', 'Library', 'Caches', 'ms-playwright');
  } else {
    browserDir = path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  }

  if (!existsSync(browserDir)) return false;

  try {
    const entries = readdirSync(browserDir);
    return entries.some(e => e.startsWith('chromium-'));
  } catch {
    return false;
  }
}

/**
 * Run 'playwright install chromium' to ensure the browser is available.
 */
export async function ensurePlaywrightBrowsersInstalled(force = false): Promise<{ success: boolean; error?: string }> {
  if (!force && isChromiumInstalled()) {
    logger.info('Playwright Chromium seems to be already installed.');
    return { success: true };
  }

  const cliPath = getPlaywrightCliPath();
  if (!cliPath) {
    const err = 'Playwright CLI (cli.js) not found in node_modules.';
    logger.error(err);
    return { success: false, error: err };
  }

  const isOptimized = await shouldOptimizeNetwork();
  const env: Record<string, string> = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
  };

  if (isOptimized) {
    env.PLAYWRIGHT_DOWNLOAD_HOST = 'https://npmmirror.com/mirrors/playwright';
    logger.info('Using Playwright download mirror (npmmirror)');
  }

  logger.info(`Running Playwright install: node ${cliPath} install chromium`);

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cliPath, 'install', 'chromium'], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let output = '';
    child.stdout?.on('data', (data) => {
      output += data.toString();
    });
    child.stderr?.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        logger.info('Playwright chromium install complete.');
        resolve({ success: true });
      } else {
        const errorMsg = `Playwright install failed (code ${code}): ${output.slice(-500)}`;
        logger.error(errorMsg);
        resolve({ success: false, error: errorMsg });
      }
    });

    child.on('error', (err) => {
      logger.error('Failed to spawn Playwright install process:', err);
      resolve({ success: false, error: String(err) });
    });
  });
}
