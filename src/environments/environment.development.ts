/**
 * Development environment configuration.
 *
 * The API URL is identical to production: the dev proxy in proxy.conf.json
 * handles forwarding /api/v1 to http://localhost:8080 so no host is hard-coded
 * here. Keeping the URL the same in both environments prevents a whole class of
 * "works on my machine" bugs where a hard-coded localhost leaks into production.
 */
export const environment = {
  production: false,
  apiUrl:     '/api/v1',
};
