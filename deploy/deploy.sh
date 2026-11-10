#!/usr/bin/env bash
# Deploy + initialize GOODCOIN on testnet, optionally lock it (delete every full-access key).
# usage: deploy/deploy.sh <production|demo> <contract-account> <team-account> [--lock]
# Keys are read from ~/.near-credentials (legacy keychain); nothing secret lives in the repo.
set -euo pipefail
KIND=$1; ACCT=$2; TEAM=$3; LOCK=${4:-}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WASM=$ROOT/contract/target/near/goodcoin.wasm
NET=testnet

(cd "$ROOT/contract" && cargo near build non-reproducible-wasm >/dev/null)
echo "wasm sha256: $(shasum -a 256 "$WASM" | cut -d' ' -f1)"
ARGS=$(python3 "$ROOT/deploy/make_config.py" "$KIND" "$TEAM")

near contract deploy "$ACCT" use-file "$WASM" \
  with-init-call new json-args "$ARGS" prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' \
  network-config $NET sign-with-legacy-keychain send

if [[ "$LOCK" == "--lock" ]]; then
  # Delete every full-access key: afterwards nobody (including us) can redeploy or change state
  # except through the contract's public methods.
  KEYS=$(curl -s https://test.rpc.fastnear.com -H 'Content-Type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"query\",\"params\":{\"request_type\":\"view_access_key_list\",\"finality\":\"final\",\"account_id\":\"$ACCT\"}}" \
    | python3 -c 'import sys,json; print(",".join(k["public_key"] for k in json.load(sys.stdin)["result"]["keys"] if k["access_key"]["permission"]=="FullAccess"))')
  near account delete-keys "$ACCT" public-keys "$KEYS" network-config $NET sign-with-legacy-keychain send
  echo "Remaining keys on $ACCT (expect none):"
  near account list-keys "$ACCT" network-config $NET now
fi
