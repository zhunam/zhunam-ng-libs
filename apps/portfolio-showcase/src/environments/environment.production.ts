export const environment = {
  production: true,
  coinGecko: {
    // Real, confirmed base URL for the Demo tier (docs.coingecko.com/demo/reference/authentication).
    baseUrl: 'https://api.coingecko.com/api/v3',
    // Sent as the `x-cg-demo-api-key` header, confirmed real header name.
    // Committed on purpose: a CoinGecko Demo key is a public, free-tier
    // identifier, not a secret, same criteria already applied to the
    // Google OAuth Client ID in libs/calendar (see its README's
    // `connect(clientId)` row: "a public OAuth Client ID, not a secret").
    // Real trade-off, not a blocker: since it's committed, anyone can
    // copy it and consume the shared free quota. If that happens, the
    // fix is rotating the key in the CoinGecko dashboard, not treating
    // this as a security incident.
    // REPLACE with the real key before this app is actually usable:
    apiKey: 'CG-y8TqggJnC7uU5DPW77v16zDY',
  },
};
