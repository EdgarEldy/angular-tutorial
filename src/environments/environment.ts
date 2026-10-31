/**
 * Production environment configuration.
 *
 * The API URL uses a relative path so the Angular app works regardless of the
 * host it is deployed on. The dev proxy (proxy.conf.json) forwards /api/v1 to
 * the SBT backend in development; nginx does the same in Docker.
 *
 * SST (spring-security-tutorial) has been decommissioned. SBT now owns all
 * endpoints (auth, users, roles, permissions, categories, products, customers,
 * orders) under a single base URL.
 */
export const environment = {
  production: true,
  apiUrl:     '/api/v1',
};
