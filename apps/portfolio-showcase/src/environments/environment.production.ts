import { COINGECKO_API_KEY } from './environment.generated';

export const environment = {
  production: true,
  coinGecko: {
    // Real, confirmed base URL for the Demo tier (docs.coingecko.com/demo/reference/authentication).
    baseUrl: 'https://api.coingecko.com/api/v3',
    // Sent as the `x-cg-demo-api-key` header, confirmed real header name.
    // Injected at build time from the COINGECKO_API_KEY environment
    // variable via scripts/generate-env.mjs, never hardcoded here. See
    // README.md for how to set it locally and on Vercel.
    apiKey: COINGECKO_API_KEY,
  },
};
