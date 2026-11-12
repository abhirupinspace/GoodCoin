// TODO(web): wallet-signed calls (near-connect + near-api-js), one per contract method.
// Gas: 80 TGas. Deposits:
//   give(week, cause, sparked_by?)  attached = gift (+ record fee 0.005 NEAR on the first gift of a week)
//   claim(weeks[])                   attach storage_balance_bounds().min if not registered (excess refunded)
//   kindle(week)                     0 — only when kindle_quote(week) is non-null (rescue window)
//   redeem(amount)                   0
//   settle(), payout(week)           0 — permissionless housekeeping buttons
// After every call: wait for FINAL, show the tx hash (EXPLORER/txns/<hash>), then refetch views.
export {};
