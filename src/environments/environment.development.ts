/**
 * Development environment configuration.
 *
 * Identical API URLs to production: the dev proxy in proxy.conf.json handles
 * the forwarding to http://localhost:8080 so no host is hard-coded here.
 * Keeping the URLs the same in both environments prevents a whole class of
 * "works on my machine" bugs where a hard-coded localhost leaks into production.
 */
export const environment = {
  production:      false,
  identityApiUrl:  '/api',
  apiUrl:          '/api/v1',
};
