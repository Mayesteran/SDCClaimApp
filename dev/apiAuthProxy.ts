import https from 'node:https';
import http from 'node:http';
import type { Plugin, ProxyOptions } from 'vite';

/**
 * Development-only bridge to SDC.Api while the site has no login screen.
 *
 * SDC.Api requires, on every request, the website's client credentials (X-Client-Id / X-Api-Key)
 * and a bearer token for a user with the Dealer role. This plugin signs in once with a dev account
 * on the Vite server, caches the token, and adds all three headers to /api requests before they are
 * proxied. None of these secrets reach the browser bundle.
 */
export interface ApiBridgeSettings {
  apiUrl: string;
  clientId: string;
  apiKey: string;
  login: string;
  password: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

export function apiAuthBridge(settings: ApiBridgeSettings): { plugin: Plugin; proxy: Record<string, ProxyOptions> } {
  let cached: CachedToken | null = null;
  let pending: Promise<CachedToken> | null = null;

  const missing = (Object.keys(settings) as (keyof ApiBridgeSettings)[]).filter((k) => !settings[k]);

  async function getToken(): Promise<string> {
    if (missing.length > 0) {
      throw new Error(`Not signing in to SDC.Api: set ${missing.map(toEnvName).join(', ')} in .env.local and restart "npm run dev".`);
    }
    if (cached && cached.expiresAt - Date.now() > 60_000) return cached.accessToken;
    pending ??= signIn().finally(() => (pending = null));
    cached = await pending;
    return cached.accessToken;
  }

  async function signIn(): Promise<CachedToken> {
    const res = await postJson(`${settings.apiUrl}/api/v1/auth/token`, { login: settings.login, password: settings.password }, {
      'X-Client-Id': settings.clientId,
      'X-Api-Key': settings.apiKey,
    });
    if (res.status !== 200) {
      throw new Error(`Dev sign-in to SDC.Api failed with HTTP ${res.status}: ${res.body.slice(0, 300)}`);
    }
    const data = JSON.parse(res.body) as { accessToken: string; expiresAt: string; email: string; dealerCodes: string[] };
    console.log(`[claims-api] signed in as ${data.email} (dealers: ${data.dealerCodes.join(', ') || 'none'})`);
    return { accessToken: data.accessToken, expiresAt: Date.parse(data.expiresAt) };
  }

  const plugin: Plugin = {
    name: 'sdc-claims-api-auth-bridge',
    configureServer(server) {
      if (missing.length > 0) {
        server.config.logger.warn(
          `[claims-api] Missing settings in .env.local: ${missing.map(toEnvName).join(', ')}. API calls will fail.`,
        );
      }

      // Runs before Vite's proxy middleware, so the headers set here are forwarded to the API.
      server.middlewares.use('/api', async (req, res, next) => {
        try {
          req.headers['x-client-id'] = settings.clientId;
          req.headers['x-api-key'] = settings.apiKey;
          req.headers.authorization = `Bearer ${await getToken()}`;
          next();
        } catch (err) {
          server.config.logger.error(`[claims-api] ${(err as Error).message}`);
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/problem+json');
          res.end(JSON.stringify({ status: 502, title: 'Could not connect to the claims service', detail: (err as Error).message }));
        }
      });
    },
  };

  const proxy: Record<string, ProxyOptions> = {
    '/api': {
      target: settings.apiUrl,
      changeOrigin: true,
      secure: false, // the API uses the local ASP.NET dev certificate
      configure(p) {
        p.on('proxyRes', (proxyRes) => {
          if (proxyRes.statusCode === 401) cached = null; // force a fresh sign-in next time
        });
      },
    },
  };

  return { plugin, proxy };
}

function toEnvName(key: keyof ApiBridgeSettings): string {
  return {
    apiUrl: 'CLAIMS_API_URL',
    clientId: 'CLAIMS_CLIENT_ID',
    apiKey: 'CLAIMS_API_KEY',
    login: 'CLAIMS_DEV_LOGIN',
    password: 'CLAIMS_DEV_PASSWORD',
  }[key];
}

function postJson(url: string, body: unknown, headers: Record<string, string>): Promise<{ status: number; body: string }> {
  const target = new URL(url);
  const payload = JSON.stringify(body);
  const transport = target.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      target,
      {
        method: 'POST',
        rejectUnauthorized: false,
        headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
      },
    );
    req.on('error', (err) => reject(new Error(`Cannot reach SDC.Api at ${target.origin}: ${err.message}`)));
    req.end(payload);
  });
}
