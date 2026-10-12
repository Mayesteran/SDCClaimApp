import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { apiAuthBridge } from './dev/apiAuthProxy';

export default defineConfig(({ mode }) => {
  // Empty prefix: read every variable from .env files, but only on the Vite server.
  // Nothing here is exposed to the browser (only VITE_* variables would be).
  const env = loadEnv(mode, process.cwd(), '');

  const bridge = apiAuthBridge({
    apiUrl: (env.CLAIMS_API_URL || 'https://localhost:7299').replace(/\/$/, ''),
    clientId: env.CLAIMS_CLIENT_ID || 'claims-web',
    apiKey: env.CLAIMS_API_KEY ?? '',
    login: env.CLAIMS_DEV_LOGIN ?? '',
    password: env.CLAIMS_DEV_PASSWORD ?? '',
  });

  return {
    plugins: [react(), bridge.plugin],
    server: {
      // 4200 is a registered origin for the "claims-web" client in SDC.Api's appsettings.Development.json.
      port: 4200,
      strictPort: true,
      proxy: bridge.proxy,
    },
  };
});
