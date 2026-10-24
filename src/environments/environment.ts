/**
 * Production environment configuration.
 *
 * Both API URLs use relative paths so the Angular app works regardless of the
 * host it is deployed on. The dev proxy (proxy.conf.json) forwards these paths
 * to the actual backends in development; nginx does the same in Docker.
 *
 * identityApiUrl: used by auth, users, roles and permissions services
 * apiUrl: used by categories, products, customers and orders services
 *
 * The /api/v1 entry in the proxy must come BEFORE /api because /api/v1/...
 * also matches the shorter /api prefix.
 */
export const environment = {
  production:      true,
  identityApiUrl:  '/api',
  apiUrl:          '/api/v1',
};
