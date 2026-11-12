// TODO(web): per-account history comes from the contract's NEP-297 events, because the locked contract
// has no "weeks this account gave in" view. Source: /api/events (server route over NearBlocks receipts
// of the contract, parsed from EVENT_JSON logs). Powers /app/history, /app/transactions,
// /app/referrals, the Hearth floor chart (fire_caught.floor_h/floor_b) and "total GOOD received/burned".
export {};
