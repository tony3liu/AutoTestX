import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { PORTS } from '../utils/config';
import { logger } from '../utils/logger';
import type { HostApiContext } from './context';
import { handleAppRoutes } from './routes/app';
import { handleGatewayRoutes } from './routes/gateway';
import { handleSettingsRoutes } from './routes/settings';
import { handleProviderRoutes } from './routes/providers';
import { handleAgentRoutes } from './routes/agents';
import { handleChannelRoutes } from './routes/channels';
import { handleLogRoutes } from './routes/logs';
import { handleUsageRoutes } from './routes/usage';
import { handleSkillRoutes } from './routes/skills';
import { handleFileRoutes } from './routes/files';
import { handleSessionRoutes } from './routes/sessions';
import { handleCronRoutes } from './routes/cron';
import { sendJson } from './route-utils';

type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
) => Promise<boolean>;

const routeHandlers: RouteHandler[] = [
  handleAppRoutes,
  handleGatewayRoutes,
  handleSettingsRoutes,
  handleProviderRoutes,
  handleAgentRoutes,
  handleChannelRoutes,
  handleSkillRoutes,
  handleFileRoutes,
  handleSessionRoutes,
  handleCronRoutes,
  handleLogRoutes,
  handleUsageRoutes,
];

export async function startHostApiServer(
  ctx: HostApiContext,
  initialPort = PORTS.AUTOTESTX_HOST_API,
): Promise<{ server: Server; port: number }> {
  let port = initialPort;
  const maxPort = initialPort + 10;

  const server = createServer(async (req, res) => {
    try {
      // Use the actual port in the URL for internal consistency
      const host = req.headers.host || `127.0.0.1:${port}`;
      const requestUrl = new URL(req.url || '/', `http://${host}`);
      for (const handler of routeHandlers) {
        if (await handler(req, res, requestUrl, ctx)) {
          return;
        }
      }
      sendJson(res, 404, { success: false, error: `No route for ${req.method} ${requestUrl.pathname}` });
    } catch (error) {
      logger.error('Host API request failed:', error);
      sendJson(res, 500, { success: false, error: String(error) });
    }
  });

  const listen = (p: number): Promise<number> => {
    return new Promise((resolve, reject) => {
      const onListening = () => {
        server.removeListener('error', onError);
        logger.info(`Host API server listening on http://127.0.0.1:${p}`);
        resolve(p);
      };

      const onError = (err: any) => {
        server.removeListener('listening', onListening);
        if (err.code === 'EADDRINUSE') {
          if (p < maxPort) {
            logger.warn(`Port ${p} in use, trying ${p + 1}...`);
            resolve(listen(p + 1));
          } else {
            reject(new Error(`Could not find an available port between ${initialPort} and ${maxPort}`));
          }
        } else {
          reject(err);
        }
      };

      server.once('listening', onListening);
      server.once('error', onError);
      server.listen(p, '127.0.0.1');
    });
  };

  const actualPort = await listen(port);
  return { server, port: actualPort };
}
