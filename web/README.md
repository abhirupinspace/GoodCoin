# GOODCOIN web app

Next.js front end for the GOODCOIN contract on NEAR testnet. Every number on screen is read live from the
contract's view methods. Nothing is simulated, cached from a database, or hard-coded.

## Run

Requires Node ≥ 20.9 and pnpm 10.

```bash
cd web
pnpm install
pnpm dev                 # http://localhost:3000, reads goodcoin-demo-530a20.testnet
```

Checks:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test                # vitest: formatting, SSRF guard, error extraction, tx matching
pnpm build && pnpm start # production build
```

To use the production-parameter deployment instead of the demo:

```bash
NEXT_PUBLIC_GOODCOIN_CONTRACT=goodcoin-530a20.testnet pnpm dev
```

`NEXT_PUBLIC_*` values are inlined when the app starts or builds, so restart after changing them.

## Environment variables

All optional. See [`.env.example`](./.env.example); copy it to `.env.local`.

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_GOODCOIN_CONTRACT` | `goodcoin-demo-530a20.testnet` | Contract to read and call |
| `NEXT_PUBLIC_NEAR_RPC_URL` | `https://test.rpc.fastnear.com` | Primary RPC; falls back to FastNEAR, then `rpc.testnet.near.org` |
| `NEXT_PUBLIC_REPO_URL` | none | Turns design-doc paths on `/about` into links |
| `NEARBLOCKS_API_KEY` | none | Server-only. Bearer key for `/api/txns`; keyless works at about 6 req/min |

FastNEAR is the default because `rpc.testnet.near.org` now answers every request with HTTP 429
"THIS ENDPOINT IS DEPRECATED" (checked 2026-11-11). If an endpoint fails, the client moves to the next one and keeps
using whichever answered.

## Which parameters am I looking at?

A banner at the top of every page shows `get_config().label` from the contract:

- **DEMO PARAMETERS — testnet**: `goodcoin-demo-530a20.testnet`. 6-minute epochs, targets of 3 deeds and 3
  participants, 2-minute dispute window. This lets a full success, failure and burn cycle happen in minutes.
- **PRODUCTION PARAMETERS — testnet**: `goodcoin-530a20.testnet`. 7-day epochs, targets of 100 and 50, 24-hour dispute window.

If the configured account has no contract yet, every page shows "Contract not deployed yet" in place of data.

## Pages

| Route | What it shows / does | Contract methods |
|---|---|---|
| `/` | Streak, high score, epoch countdown, both target progress bars, projected reward with streak multiplier, supply, treasury, `check_invariants()`, live full-access-key count, **Settle epoch** | `get_stats`, `get_epoch`, `get_config`, `get_supply`, `get_treasury`, `check_invariants`, RPC `view_access_key_list`; `settle_epochs` |
| `/challenges` | List with phase badges, kind and category filters, informational targets; organizer-only create form | `list_challenges`, `get_account`; `create_challenge` |
| `/challenges/[id]` | Details, your submission, all submissions; organizer **Publish** for drafts | `get_challenge`, `get_submission_for`, `list_submissions`; `publish_challenge` |
| `/submit?challenge=<id>` | Instructions → description → evidence URL → SHA-256 (local file in browser, or server fetch) → review → submit → status | `submit_deed`, `get_submission_for` |
| `/verify` | Pending deeds with re-hash check and Approve/Reject (with the reason when disabled), approved deeds in their dispute window with **Open dispute**, disputes with reviewer votes, history | `list_submissions`, `list_disputes`; `attest`, `open_dispute`, `vote_dispute` |
| `/treasury` | Buckets (locked, spendable, disbursed, burned), proposals with quorum and threshold progress, voting countdown, votes, create, finalize | `get_treasury`, `list_proposals`, `has_voted`; `create_proposal`, `vote_proposal`, `finalize_proposal` |
| `/epochs` | Epoch history: status, counts vs targets, reward, claims, burned, unlocked, streak after | `list_epochs` |
| `/activity` | On-chain activity log, newest first, 25 per page, with tx links | `activity_count`, `list_activity`, `/api/txns` |
| `/leaderboard` | Most approved deeds, most attestations, most epochs participated, impact by category. Never ranked by balance | `list_accounts`, `list_challenges` |
| `/about` | Every `get_config()` parameter in readable units, the mechanic in 6 steps, Sybil and trust limitations | `get_config` |
| Account menu | Connect/disconnect, GOOD and NEAR balance, roles, **Claim reward** per claimable epoch, **Claim vested** for beneficiaries | `get_account`, `get_vesting`; `claim_reward`, `claim_vested` |

## Data sources

- **Contract views** (`src/lib/rpc.ts`): plain JSON-RPC `query` / `call_function` over `fetch`, finality `final`, so
  everything works without a wallet. Types in `src/lib/types.ts` mirror `contract/src/types.rs` and `views.rs`:
  `U64`/`U128` are strings, balances are 24-decimal yocto-GOOD, timestamps are nanoseconds, and all of it is handled with BigInt
  (`src/lib/format.ts`).
- **`GET /api/txns`**: proxies NearBlocks v3 testnet `accounts/<contract>/txns?limit=25` with a 30 s in-memory cache. If
  NearBlocks fails or rate-limits, it serves the last good copy marked stale, or an empty list. The Activity page matches
  each log entry to the latest transaction that calls the method which writes that entry, within 4 blocks before the
  entry's `block_height`. When nothing matches (older than the 25 most recent txns, or NearBlocks is down), the entry links
  to the contract's transaction list.
- **`GET /api/hash?url=`**: fetches public evidence server-side and returns its SHA-256. It accepts http(s) only and
  rejects URLs with credentials. It refuses local hostnames and private, loopback, link-local and reserved IPs (v4 and v6,
  including IPv4-mapped), checks every DNS answer and every redirect hop (at most 3), times out after 10 s and stops at
  5 MB. One residual risk is documented in the route: DNS rebinding between the lookup and the fetch.
- **Estimates:** none are shown. The reward on the overview is the contract's own `next_reward_per_participant`, and
  the UI says that it assumes earlier unsettled epochs settle as their current counts imply.

## Wallet and transactions

- Wallet selection and signing use [`@hot-labs/near-connect`](https://docs.near.org/tools/near-connect) 0.12, with
  `NearConnector({ network: "testnet" })`. It shows testnet-capable wallets such as Meteor, Intear, Nightly, Ledger and NEAR CLI.
  See `src/near/NearProvider.tsx`, which exposes `useNear()` → `{ accountId, connect, disconnect, call }`.
- Every change call is one `FunctionCall` with 100 Tgas. After the wallet returns a hash, the app waits for `FINAL` status
  through RPC `tx` and shows the contract's panic message if the call failed. It links
  `https://testnet.nearblocks.io/txns/<hash>` and then re-reads all queries. It never assumes success.
- Attached deposits cover on-chain storage, and the contract refunds the excess:
  0.05 NEAR for `submit_deed`, `create_challenge`, `create_proposal` and `open_dispute`;
  0.02 NEAR for `attest`, `vote_proposal` and `vote_dispute`;
  0.01 NEAR for `claim_reward`, `claim_vested` and `finalize_proposal`;
  0 for `settle_epochs` and `publish_challenge`, which are not payable.
- Buttons stay disabled with a stated reason when the contract would reject the call. Examples: your own submission, already
  attested, not in the reviewer pool, not verified before voting started, or the epoch not yet settleable. The contract
  remains the final authority.

## Layout

```
src/app/            routes (thin server pages with metadata) + api/hash, api/txns
src/views/          one client component per page
src/components/     UI primitives, TxButton, AccountMenu, badges, ContractGate
src/lib/            config, types, rpc, queries (React Query), format, urlGuard, txns, hash
src/near/           NearProvider (wallet context)
```

Stack: Next.js 16.4 (App Router, Cache Components), React 19, TypeScript strict, Tailwind CSS 4, TanStack Query 5,
near-api-js 7.4 (unit helpers: `nearToYocto`, `teraToGas`), @hot-labs/near-connect 0.12, Vitest 4.
