#!/usr/bin/env bash
# Build, deploy and initialize GOODCOIN on testnet, then (with --lock) delete every access key.
# usage: deploy/deploy.sh <production|demo> <contract-account> <team-account> <suffix> [--lock]
# The 1 NEAR Hearth seed is attached to `new`. Keys come from ~/.near-credentials; nothing secret is in the repo.
set -euo pipefail
KIND=$1; ACCT=$2; TEAM=$3; SUFFIX=$4; LOCK=${5:-}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WASM=$ROOT/contract/target/near/goodcoin.wasm
RPC=https://test.rpc.fastnear.com

(cd "$ROOT/contract" && cargo near build non-reproducible-wasm >/dev/null)
echo "wasm sha256: $(shasum -a 256 "$WASM" | cut -d' ' -f1)"
ARGS=$(python3 "$ROOT/deploy/make_config.py" "$KIND" "$TEAM" "$SUFFIX")

near contract deploy "$ACCT" use-file "$WASM" \
  with-init-call new json-args "$ARGS" prepaid-gas '100.0 Tgas' attached-deposit '1 NEAR' \
  network-config testnet sign-with-legacy-keychain send

if [[ "$LOCK" == "--lock" ]]; then
  KEYS=$(curl -s $RPC -H 'Content-Type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"query\",\"params\":{\"request_type\":\"view_access_key_list\",\"finality\":\"final\",\"account_id\":\"$ACCT\"}}" \
    | python3 -c 'import sys,json; print(",".join(k["public_key"] for k in json.load(sys.stdin)["result"]["keys"]))')
  near account delete-keys "$ACCT" public-keys "$KEYS" network-config testnet sign-with-legacy-keychain send
  echo "Remaining keys on $ACCT (expect none):"
  near account list-keys "$ACCT" network-config testnet now
fi
